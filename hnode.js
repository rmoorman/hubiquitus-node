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

var fork = require('child_process').fork;

//For logging
var log = require('winston');

/**
 * Starts the gateway instantiating its modules
 */
function main(){
    var opts = require('./lib/options.js');

    var sioModule = __dirname + '/lib/client_connectors/socketio_connector.js';
    var boshModule = __dirname + '/lib/client_connectors/bosh_connector.js';

    var children = [];
    var child;

    for(var i = 0; i < opts.options['socket.io.ports'].length; i++){
        opts.sioConnector.port = opts.options['socket.io.ports'][i];
        child = fork(__dirname + '/lib/worker.js');
        child.send({module: sioModule, args: opts.sioConnector});
        children.push(child);
    }

    //For each port of bosh start a new process
    for(var i = 0; i < opts.options['bosh.ports'].length; i++){
        opts.boshConnector.port = opts.options['bosh.ports'][i];
        child = fork(__dirname + '/lib/worker.js');
        child.send({module: boshModule, args: opts.boshConnector});
        children.push(child);
    }

    //Set listeners for exiting events and properly kill children
    var exitEvents = ['exit', 'SIGINT'];
    for(var i = 0; i < exitEvents.length; i++)
        process.on(exitEvents[i], function () {
            log.info("Stopping hNode...");
            for(var j = 0; j < children.length; j++)
                children[j].kill();
            process.exit();
        });

    //Set listeners for Mongo errors/ connection
    var db = require('./lib/mongo.js').db;
    db.on('error', function(err){
        log.error('Error Connecting to database', err);
        process.exit(1);
    });

    //Start connection to Mongo
    db.connect(opts.options['mongo.URI']);
}

main();
