#!/usr/bin/env /usr/local/bin/node
/*
 * Copyright (c) Novedia Group 2012.
 *
 *     This file is part of Hubiquitus.
 *
 *     Hubiquitus is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     Hubiquitus is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
 */

var socketioConnector = require('./lib/client_connectors/socketio_connector.js');
var boshConnector    = require('node-xmpp-bosh');
var parseOptions = require('./lib/options.js').parse_options;
var fs = require('fs');
var fork = require('child_process').fork;

//For logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
global.log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

/**
 * Starts the gateway instatiating its modules
 */
function main(){
    var child = process.argv[2] == 'child' ? true : false;

    if(child){
        var options = parseOptions(process.argv.splice(5));

        //Start an instance of the socketio server in the port from argv
        if(process.argv[3] == 'socket.io'){
            options['socket.io.port'] = parseInt(process.argv[4]);
            socketioConnector.startSocketIOConnector(options);
        }

        //Start an instance of the bosh server in the port from argv
        else {
            options['bosh.port'] = parseInt(process.argv[4]);
            boshConnector.start_bosh({
                logging: options['global.loglevel'],
                port: options['bosh.port'],
                pidgin_compatible: options['bosh.pidgin_compatible']
            });
        }
    }

    else{
        //Options are read synchronously
        try {
            var args = process.argv.splice(2);
            var i = 0;

            //See if a config file is specified
            while(i < args.length && !args[i].match(/--conf/))
                i++;

            //If specified read it and add it to the list of args with correct formatting
            if(i < args.length-1 && args[i].match(/--conf/)){
                var file =  fs.readFileSync(args[i+1], 'utf8');
                file = file.split('\n');
                args = args.splice(i+2);
                for(i = 0; i < file.length; i++){
                    if(!file[i].match(/ *#.*/) && !file[i].match(/^ *$/))
                        args = (args.concat(file[i].split(/ *= */)));
                }
            }

            var options = parseOptions(args);
        }
        catch (err) {
            console.error("Error parsing options. Exiting");
            console.log(err);
            process.exit(1);
        }

        var children = [];
        function forkChild(type, port){
            var child = fork(__dirname + '/gateway.js',
                [ 'child', type, port ].concat(args));
            children.push(child);

            //If there is an error, restart the server. never stop it.
            child.on('exit', function(code, signal){
                if(signal == 'SIGKILL') return;
                var idx = children.indexOf(child);
                if(idx!=-1) children.splice(idx, 1);
                log.warn(type + ' server on port ' + port + ' stopped working. Restarting')
                forkChild(type,port);
            })
        }

        //Fork Processes for each port
        var servers = ['socket.io', 'bosh'];
        for(var i in servers){
            var ports = options[servers[i] + '.ports'];
            for(var j in ports)
                forkChild(servers[i], ports[j]);
        }

        function exitFunction(){
            log.info('Stopping Server');
            for(var i in children)
                children[i].kill('SIGKILL');
        }

        //Always clean up in the end
        process.on('exit', exitFunction);
        process.on('SIGINT', exitFunction);

    }
}

main();
