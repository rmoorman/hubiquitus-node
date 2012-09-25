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

var log = require('winston');

var errors = require('../codes.js').errors;
var status = require('../codes.js').statuses;
var hClient = require('../hClient.js').hClient;
var clients = {};
var options;


/**
 * Runs a SocketIO Connector with the given arguments.
 * @param args - {
 *     logLevel : DEBUG, INFO, WARN or ERROR
 *     port : int
 *     namespace : string
 *     commandOptions : {} Command Controller Options
 * }
 */
exports.run = function(args){
    options = args;
    var io = require('socket.io').listen(options.port); //Creates the HTTP server

    var logLevels = { DEBUG: 3, INFO: 2, WARN: 1, ERROR: 0 };
    io.set('log level', logLevels[options.logLevel]);

    var channel = io
        .of(options.namespace)
        .on('connection', function (socket) {
            var id = socket.id;
            clients[id] = {
                id : id,
                socket : socket
            };
            socket.on('hConnect', function(data){ connect(clients[id], data); });
            socket.once('disconnect', function(){ disconnect(clients[id]); });
        });
};

/**
 * @param client - Reference to the client
 * @param data - Expected {jid, password, (host), (port)}
 */
function connect(client, data){
    if(!client){
        log.warn('A client sent an invalid ID with data', data);
        return;
    }

    log.info("Client ID " + client.id +  " sent connection data", data);

    if(!data || !data.publisher || !data.password){
        log.info("Client ID " + client.id +  " is trying to connect without mandatory attribute", data);
        return;
    }

    client.hClient = new hClient(options.commandOptions);

    //Relay all server status messages
    client.hClient.on('hStatus', function(msg){
        client.socket.emit('hStatus', msg);
    });

    client.hClient.on('connect', function(){
        client.publisher = this.jid;

        client.socket.emit('attrs', {
            publisher: this.jid,
            sid: client.id});

        //Start listening for client actions
        addSocketListeners(client);

        //Start listening for messages from XMPP and relaying them
        client.hClient.on('hMessage', function(hMessage){
            log.info("Sent message to client " + client.id, hMessage);
            client.socket.emit('hMessage', hMessage);
        });

    });

    //Login to XMPP Server
    client.hClient.connect(data);
}

function addSocketListeners(client){
    client.socket.on('hMessage', function(hMessage) {
        log.info('Client ID ' + client.id + ' sent hMessage', hMessage);

        client.hClient.processMsg(hMessage);
    });
}

/**
 * Disconnects the current session and socket. The socket is closed but not
 * the XMPP Connection (for reattaching). It will be closed after timeout.
 * @param client - Reference to the client to close
 */
function disconnect(client){
    if (client && client.hClient){
        log.debug('Disconnecting Client ' + client.publisher);

        if(client.socket)
            client.socket.disconnect();

        client.hClient.disconnect();
        delete clients[client.id];

    }else if (client){
        if(client.socket)
            client.socket.disconnect();

        delete clients[client.id];
    }
}