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
var createOptions = require('./options.js').socketio_Options;
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
    opts = opts || {};
    opts= createOptions(opts);

    var io = require('socket.io').listen(opts['socket.io.port']); //Creates the HTTP server
    io.set('log level', 2);
    var channel = io
      .of(opts['socket.io.namespace'])
      .on('connection', function (socket) {
            var id = socket.id;
            clients[id] = {};
            clients[id].socketioConnection = socket;
            clients[id].id = id;
            socket.on('connect', function(data){ connect(clients[id], data); });
            socket.on('disconnect', function(){ disconnect(clients[id]); });
            //Add other events: subscribe, unsubscribe, publish
    });
}

/**
 * @param client - Reference to the client
 * @param data - Received data from the server
 */
function connect(client, data){
    log.info("Client ID " + client.id +  " sent data: " + data['jid'] + " " + data['password'] + " " +data['host'] + " " + data['port']);

    client.xmppConnection = new xmpp.XMPP(data);

    client.xmppConnection.connect(function(message){
        client.socketioConnection.emit('connect', message);
        log.info("Sent to client " + client.id + " : " + message);
    });
};

/**
* @param client - Reference to the client to be disconnected
*/
function disconnect(client){
    if(client){
        log.warn('Disconnecting Client ' + client.id);
        client.xmppConnection.disconnect();
        delete client;
    }
    else
        log.warn("Trying to disconnect an inexistent connection");
};