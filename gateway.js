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
    var options;
    var args = process.argv.splice(2);
    var sioModule = __dirname + '/lib/client_connectors/socketio_connector.js';
    var boshModule = __dirname + '/lib/client_connectors/bosh_connector.js';

    try {
        var argsIt = 0;

        //See if a config file is specified
        while(argsIt < args.length && !args[argsIt].match(/--conf/))
            argsIt++;

        //If specified read it and add it to the list of args with correct formatting
        if(argsIt < args.length-1 && args[argsIt].match(/--conf/)){
            var file =  fs.readFileSync(args[argsIt+1], 'utf8');
            file = file.split('\n');
            args = args.splice(argsIt+2);
            for(argsIt = 0; argsIt < file.length; argsIt++){
                if(!file[argsIt].match(/ *#.*/) && !file[argsIt].match(/^ *$/))
                    args = (args.concat(file[argsIt].split(/ *= */)));
            }
        }

        options = parseOptions(args);
    }catch (err) {
        console.error("Error parsing options. Exiting");
        console.log(err);
        process.exit(1);
    }

    var children = [];
    var child;
    //For each port of socket.io start a new process
    var socketioArgs = {
        logLevel : options['global.loglevel'],
        namespace : options['socket.io.namespace'],
        discTimeout : options['socket.io.disctimeout'],
        ridWindow : options['socket.io.ridwindow']
    };

    for(var i = 0; i < options['socket.io.ports'].length; i++){
        socketioArgs.port = options['socket.io.ports'][i];
        child = fork(__dirname + '/lib/worker.js');
        child.send({module: sioModule, args: socketioArgs});
        children.push(child);
    }

    //For each port of bosh start a new process
    for(var i = 0; i < options['bosh.ports'].length; i++){
        options['bosh.port'] = options['bosh.ports'][i];
        child = fork(__dirname + '/lib/worker.js');
        child.send({module: boshModule, args: options});
        children.push(child);
    }

    //Set listeners for exiting events and properly kill children
    var exitEvents = ['exit', 'SIGINT'];
    for(var i = 0; i < exitEvents.length; i++)
        process.on(exitEvents[i], function () {
            log.info("Stopping hNode...");
            for(var j = 0; j < children.length; j++)
                children[j].kill();
        });
}

main();
