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

var fs = require('fs');
var log = require('winston');

/**
 * Gets the commandline arguments and parses the options.
 * If a config file is specified in the args it will also be used.
 */
function createOptions(){
    var options = {};
    var args = process.argv.splice(2);
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

        //Normalize options
        var tempArray;
        for( var i = 0; i < args.length -1; i +=2){
            args[i] = args[i].replace(/-*/,'').toLowerCase();
            tempArray = args[i+1].split(',');
            options[args[i]] = tempArray.length > 1 ? tempArray: tempArray[0];
        }

        //If the option expects an array of numbers, convert it to one
        var numArray = ['socket.io.ports', 'bosh.ports'];
        numArray.map(function(elem){
            if(options[elem] instanceof Array)
                options[elem] = options[elem].map(function(el){ return parseInt(el);} );
            else if (options[elem])
                options[elem] = [parseInt(options[elem])];
        });

        //If the option expects a number convert it to one
        var intNeeded = ['socket.io.disctimeout', 'socket.io.ridwindow', 'hnode.port'];
        intNeeded.map(function(el){
            options[el] = parseInt(options[el]);
        });

        options = overrideOptions(options);
    }catch (err) {
        log.error("Error parsing options.", err);
        process.exit(1);
    }
    return options;
}

/**
 * Receives an object with non-default options and overrides the default ones
 * returning a new options object with the default values for the options
 * not specified
 * @param options
 */
function overrideOptions(options) {
    options =  options|| {};

    var _opts = {
        //Possible values are DEBUG, INFO, WARN or ERROR
        'global.loglevel': options['global.loglevel'] || 'WARN',

        //A different instance will be created for each port
        'socket.io.ports':options['socket.io.ports'] || [8080],

        //websocket Namespace for events received/sent
        'socket.io.namespace': options['socket.io.namespace'] || '',

        //Once the socket is closed, how long should we wait to close
        //XMPP Connection
        'socket.io.disctimeout': options['socket.io.disctimeout'] || 15000,

        // rid +- window to accept when attaching
        'socket.io.ridwindow': options['socket.io.ridwindow'] || 5,

        //Ports used by the bosh endpoint to relay requests
        //A different instance will be created for each port
        'bosh.ports': options['bosh.ports'] || [5280],

        //Workaround to a pidgin bug when using bosh. See node-xmpp-bosh doc
        'bosh.pidgin_compatible': options['pidgin_compatible'] || true,

        //full name of the component (ie. jid.domain)
        'hnode.jid' : options['hnode.jid'] || 'hnode.localhost',

        //Shared secret between the hNode component and the XMPP Server
        'hnode.password' : options['hnode.password'] || '',

        //Host of the XMPP Server
        'hnode.host' : options['hnode.host'] || 'localhost',

        //Port of the XMPP Server
        'hnode.port' : options['hnode.port'] || 5276,

        //Path to the hcommands executed by the hnode
        'hcommands.path' : options['hcommands.path'] || 'lib/hcommands',

        //Timeout for an hCommand, after that an hResult with timeout is sent
        'hcommands.timeout' : options['hcommands.timeout'] || 5000,

        //URI for the MongoDB database
        'mongo.URI' : options['mongo.uri'] || 'mongodb://localhost/hnode'
    };

    return _opts;
}

var options = createOptions();

/**
 * Global options for the whole application
 */
exports.options = options;

/**
 * Function that parses the options (useful for testing)
 * @type {Function}
 */
exports.createOptions = createOptions;

/**
 * Options object already formatted to be used with the command controller
 */
var commandController = {
    modulePath : options['hcommands.path'],
    timeout : options['hcommands.timeout']
};
exports.commandController = commandController;

/**
 * Options object already formatted to be used with the XMPP Connection
 */
var xmppConnection = {
    jid : options['hnode.jid'],
    password : options['hnode.password'],
    host : options['hnode.host'],
    port : options['hnode.port'],
    commandOptions : commandController
};
exports.xmppConnection = xmppConnection;

/**
 * Options object already formatted to be used with the Socket.io connector
 */
exports.sioConnector = {
    logLevel : options['global.loglevel'],
    namespace : options['socket.io.namespace'],
    discTimeout : options['socket.io.disctimeout'],
    ridWindow : options['socket.io.ridwindow'],
    commandOptions : commandController,
    _mongoURI: options['mongo.URI'],
    _xmppConnection: xmppConnection
};

/**
 * Options object already formatted to be used with the Bosh Connector
 */
exports.boshConnector = {
    logging: options['global.loglevel'],
    pidgin_compatible: options['bosh.pidgin_compatible'],
    _mongoURI: options['mongo.URI']
};
