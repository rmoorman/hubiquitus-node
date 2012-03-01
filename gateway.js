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

var socketioConnector = require('./lib/socketio_connector.js');
var boshConnector    = require('node-xmpp-bosh');
var parseOptions = require('./lib/options.js').parse_options;
var fs = require('fs');

/**
 * Starts the gateway instatiating its modules
 */
function main(){

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
        for(i = 0; i < args.length; i++)
            args[i] = args[i].toLowerCase(); //Normalize inputs

        var options = parseOptions(args);
    }
    catch (err) {
        console.error("Error parsing options. Exiting");
        console.log(err);
        process.exit(1);
    }

    socketioConnector.startSocketIOConnector(options);

    var boshServer = boshConnector.start_bosh({
        logging: options['global.loglevel'],
        port: options['bosh.port'],
        pidgin_compatible: options['bosh.pidgin_compatible']
    });

}

main();