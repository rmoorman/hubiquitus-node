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

    client.xmppConnector = new xmpp.XMPPConnector(data);

    //Listen for server status
    client.xmppConnector.on('link', function(msg){
        //Send status to client
        client.socket.emit('link', msg);

        if(msg.status == xmpp.statuses.Connected){
            //Once connected we start listening for client actions
            client.socket.on('disconnect', function(){
                log.warn('Disconnecting Client ' + client.id);
                client.xmppConnector.disconnect();
            });

            client.socket.on('subscribe', function(data){
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                client.xmppConnector.subscribe(data);
            });

            client.socket.on('unsubscribe', function(data){
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                client.xmppConnector.unsubscribe(data);
            });

            client.socket.on('publish', function(data) {
                log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
                client.xmppConnector.publish(data);
            });

            //Once connected, start listening for messages from XMPP and relaying them
            client.xmppConnector.on('items', function(msg){
                log.info("Sent items to client " + client.id + " : " + JSON.stringify(msg));
                client.socket.emit('items', {node: msg.node, entries: msg.entries});
            });

            client.xmppConnector.on('result', function(msg){
                log.info("Sent result to client " + client.id + " : " + JSON.stringify(msg));
                client.socket.emit('result', {type: msg.type, node: msg.node, id: msg.id});
            });

            client.xmppConnector.on('error', function(msg){
                log.info("Sent error to client " + client.id + " : " + JSON.stringify(msg));
                client.socket.emit('error', {type: msg.type, code: msg.code, node: msg.node, id: msg.id});
            });
        }
    });

    //Connect to XMPP Server
    client.xmppConnector.establishConnection();

    //Login to XMPP Server
    client.xmppConnector.connect();
};