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

/**
 * This simple worker implementation will wait a single message from its parent
 * with the module that should execute and its args as an object. The module must have
 * a exports.run = function(args). Before starting the module will initialize all the singletons
 * of the server. As of now, the server XMPP Connection and the DB connection.
 * Expected message:
 * {
 * module : string
 * args : {
 *     _mongoURI: <Mongo Address>,
 *     _xmppConnection: {<xmppConnectionParams>} (If not specified, the connection will not be started)
 * }
 * }
 */
var workerLauncher = function(msg) {
    if(msg && msg.module){
        var module = require(msg.module);
       if(typeof module.run === 'function'){

            var db = require('./mongo.js').db;

            //Before launching the module load the database and xmpp connection.
            db.once('connect', function(){

                if(msg.args._xmppConnection){
                    var xmppConnection = require('./hAdmin.js');
                    xmppConnection = xmppConnection.getHAdmin(msg.args._cmdController);

                    xmppConnection.once('connect', function(){
                        process.removeListener('message', workerLauncher);
                        module.run(msg.args);
                    });

                    xmppConnection.connect(msg.args._xmppConnection);
                }else{
                    process.removeListener('message', workerLauncher);
                    module.run(msg.args);
                }


            });

            db.connect(msg.args._mongoURI);
        }
    }
};
process.on('message', workerLauncher);