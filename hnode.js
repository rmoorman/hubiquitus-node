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

var createOptions = require('./lib/options.js').createOptions;
var Controller = require('./lib/hcommand_controller.js').Controller;

var fork = require('child_process').fork;

//For logging
var log = require('winston');

/**
 * Starts the gateway instantiating its modules
 */
function main(){
    var options = createOptions();
    var sioModule = __dirname + '/lib/client_connectors/socketio_connector.js';
    var boshModule = __dirname + '/lib/client_connectors/bosh_connector.js';

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
            process.exit();
        });

    //Set the Command Controller options
    var controllerArgs = {
        jid : options['hnode.jid'],
        password : options['hnode.password'],
        host : options['hnode.host'],
        port : options['hnode.port'],
        modulePath : options['hcommands.path'],
        timeout : options['hcommands.timeout']
    };

    //Set listeners for Mongo errors/ connection
    var db = require('./lib/mongo.js').db;
    db.on('error', function(err){
        log.error('Error Connecting to database', err);
        process.exit(1);
    });

    //When connected, launch the command controller
    db.on('connect', function(){
        var cmdController = new Controller(controllerArgs);

        //Command passthrough for children processes
        //Listen for results that are emitted to the cmdController and if destined to one of our children, emit it.
        cmdController.on('hResult', function(res){
            if( res && res.args && res.args.pid ){
                var i = 0;
                while(i < children.length && children[i].pid != res.args.pid) i++;
                if(i < children.length)
                    children[i].send(res);
            }
        });

        //The object should be in the form {hCommand : hCommand, args : <optional arguments {}>}
        for(var i = 0; i < children.length; i++)
            children[i].on('message', function(obj){
                if(obj && obj.hCommand)
                    cmdController.emit('hCommand', obj);
            })
    });

    //Start connection to Mongo
    db.connect(options['mongo.URI']);

}

main();
