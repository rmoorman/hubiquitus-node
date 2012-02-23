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
                socketioConnection : socket
            };
            socket.on('connect', function(data){ connect(clients[id], data); });
            socket.on('disconnect', function(){ disconnect(clients[id]); });
            socket.on('subscribe', function(data){ subscribe(clients[id], data); });
            socket.on('unsubscribe', function(data){ unsubscribe(clients[id], data); });
            socket.on('publish', function(data) { publish(clients[id], data); });
    });
};

/**
 * @param client - Reference to the client
 * @param data - Received data from the server
 */
function connect(client, data){
    log.info("Client ID " + client.id +  " sent data: " + JSON.stringify(data));

    client.xmppConnection = new xmpp.XMPPConnector(data.parameters, function(status){
        client.socketioConnection.emit('status', status); });

    client.xmppConnection.connect(function(message){
        client.socketioConnection.emit('connect', message);
        log.info("Sent to client " + client.id + " : " + message);
    });
};

/**
* @param client - Reference to the client to be disconnected
*/
function disconnect(client){
    log.warn('Disconnecting Client ' + client.id);
    client.xmppConnection.disconnect();
};

/**
 * Subscribes to the node passed in data
 * @param client - Reference to the client that will be subscribed
 * @param data - Contains the node to be subscribed
 */
function subscribe(client, data){
    log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));

    if(checkConditions(client, 'subscribe'))
        client.xmppConnection.subscribe(data.nodeName, function(res){
            client.socketioConnection.emit('subscribe', res);
        });
};

/**
 * Unsubscribes from the node passed in data
 * @param client - Reference to the client to be unsubscribed
 * @param data - Contains the node to unsubscribe from and (optionally) the subID.
 */
function unsubscribe(client, data){
    log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));

    if(checkConditions(client, 'unsubscribe'))
        client.xmppConnection.unsubscribe(data.nodeName, data.subID, function(res){
            client.socketioConnection.emit('unsubscribe', res);
        });
};

/**
 * Publishes an entry to a node that is passed in data
 * @param client - Reference to the client that will publish
 * @param data - Contains the node and the optionally the entry to publish
 */
function publish(client, data){
    log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));

    if(checkConditions(client, 'publish'))
        for(var i in data.items)
            client.xmppConnection.publish(data.nodeName, data.items[i], function(res){
                client.socketioConnection.emit('publish', res);
            });
};

/**
 * Checks if the conditions are correct to execute the actions. A connection must exist and must have been established
 * @param client - Reference to the client to check
 * @param action - Action that wants to be performed
 */
function checkConditions(client, action){
    if(!client.xmppConnection || (client.xmppConnection && client.xmppConnection.status != xmpp.statuses.connected)){
        log.error('Client ID ' + client.id + ' tried to execute ' + action
            + ' , but the client is not connected. Aborting' );
        return false;
    }
    return true;
};