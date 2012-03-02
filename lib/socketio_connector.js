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

var xmpp = require('./xmpp_connector.js');
var clients = {};

//For logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
var log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

/**
 * Function to be used to start the connector. Default parameters can be found in options.js
 * @param options overrided options in JSON format. Look at options.js to see possibilities.
 */
exports.startSocketIOConnector = function(opts){
    var io = require('socket.io').listen(opts['socket.io.port']); //Creates the HTTP server

    var logLevels = { DEBUG: 3, INFO: 2, WARN: 1, ERROR: 0 };
    io.set('log level', logLevels[opts['global.loglevel']]);
    log.setLevel(opts['global.loglevel']);

    var channel = io
        .of(opts['socket.io.namespace'])
        .on('connection', function (socket) {
            var id = socket.id;
            clients[id] = {
                id : id,
                socket : socket
            };
            socket.on('connect', function(data){ connect(clients[id], data); });
        });
};

/**
 * @param client - Reference to the client
 * @param data - Received data from the client
 */
function connect(client, data){
    log.info("Client ID " + client.id +  " sent data: " + JSON.stringify(data));

    client.xmppConnection = new xmpp.XMPPConnector(data.parameters);

    //Listen for server status
    client.xmppConnection.on('status', function(status){
        //Send status to client
        client.socket.emit('status', status);

        if(status == xmpp.statuses.Connected){
            //Once connected we can start listening to other actions
            client.socket.on('disconnect', function(){
                log.warn('Disconnecting Client ' + client.id);
                client.xmppConnection.disconnect();
            });

            client.socket.on('subscribe', function(data){
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                client.xmppConnection.subscribe(data.nodeName);
            });

            client.socket.on('unsubscribe', function(data){
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                client.xmppConnection.unsubscribe(data.nodeName, data.subID);
            });

            client.socket.on('publish', function(data) {
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                for(var i in data.items)
                    client.xmppConnection.publish(data.nodeName, data.items[i]);
            });
        }
    });

    //Listen for messages
    client.xmppConnection.on('message', function(msg){
        //There is a message from the server. Send it to the client
        log.info("Sent to client " + client.id + " : " + JSON.stringify(msg));
        client.socket.emit(msg.type, msg.content);
    });

    //Connect to XMPP Server
    client.xmppConnection.establishConnection();

    //Login to XMPP Server
    client.xmppConnection.connect();
};