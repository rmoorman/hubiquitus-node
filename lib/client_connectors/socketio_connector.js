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
 *     discTimeout : int (Time to wait before disconnecting client)
 *     ridWindow : int (Accepted RIDs when reattaching),
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
                rid: Math.floor(Math.random()*100000001),
                socket : socket
            };
            socket.on('hConnect', function(data){ connect(clients[id], data); });
            socket.on('attach', function(data){ attach(clients[id], data); });
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

    client.hClient = new hClient(data, options.commandOptions);

    //Relay all server status messages
    client.hClient.on('hStatus', function(msg){
        client.socket.emit('hStatus', msg);
    });

    client.hClient.on('connect', function(){
        client.publisher = this.jid;

        client.socket.emit('attrs', {
            publisher: this.jid,
            rid: client.rid,
            sid: client.id});

        //Start listening for client actions
        addSocketListeners(client);

        //Start listening for messages from XMPP and relaying them
        client.hClient.on('hMessage', function(hMessage){
            log.info("Sent message to client " + client.id, hMessage);
            client.socket.emit('hMessage', hMessage);
            client.rid++;
        });

        client.hClient.on('hResult', function(hResult){
            log.info("Sent message to client " + client.id, hResult);
            client.socket.emit('hResult', hResult);
            client.rid++;
        });
    });

    //Login to XMPP Server
    client.hClient.connect();
}

function addSocketListeners(client){
    client.socket.on('hCommand', function(hCommand) {
        log.info('Client ID ' + client.id + ' sent hCommand', hCommand);

        client.hClient.command(hCommand, function(hResult){
            log.info("Sent message to client " + client.id, hResult);
            client.socket.emit('hResult', hResult);
            client.rid++;
        });
    });
}

/**
 *
 * @param client - Reference to the client
 * @param data - expected {sid, rid, publisher}
 */
function attach(client, data){
    if(!client){
        log.warn('A client sent an invalid ID with data', data);
        return;
    }

    log.info("Client ID " + client.id +  " sent reattach data", data);
    /*
     To do an attach, we first confirm if the client is well authenticated,
     then we need to change the reference in the old client and delete it.
     */

    /*Check authentication
     Authentication consists of verifying
     1. if the SID given is valid (corresponds to an active user)
     2. if the RID is in a valid RID window
     3. if the publisher corresponds to that of the identified client
     */
    var ridWindow = options.ridWindow;
    var supposedClient = clients[data.sid];

    if( supposedClient &&
        data.sid !== client.id &&
        data.rid <= supposedClient.rid + ridWindow&&
        data.rid >= supposedClient.rid - ridWindow &&
        data.publisher === supposedClient.publisher
        ){
        //Attached successfully
        clearTimeout(supposedClient.discTimeout);
        supposedClient.socket.emit('disconnect');

        supposedClient.socket = client.socket;
        addSocketListeners(supposedClient);
        supposedClient.socket.emit('hStatus', {status: status.REATTACHED, errorCode: errors.NO_ERROR});
        //Send the attrs for next attachment
        supposedClient.socket.emit('attrs', {
            publisher: supposedClient.publisher,
            rid: supposedClient.rid,
            sid: supposedClient.id});

        delete clients[client.id];
        delete supposedClient.discTimeout;
        log.info('Client ID ' + supposedClient.id  + ' has attached');
    }
    else{
        //Wrong authentication, send error
        log.info('Client ID ' + client.id  + ' tried to attach but failed');
        client.socket.emit('hStatus', {status: status.CONNECTING, errorCode: errors.ATTACH_FAILED});
    }
}

/**
 * Disconnects the current session and socket. The socket is closed but not
 * the XMPP Connection (for reattaching). It will be closed after timeout.
 * @param client - Reference to the client to close
 */
function disconnect(client){
    if (client && client.hClient){
        log.debug('Activating timeout for Client ' + client.publisher);
        var timeout = options.discTimeout;

        client.discTimeout = setTimeout(function(){
            log.debug('Disconnecting Client ' + client.publisher);

            if(client.socket)
                client.socket.disconnect();

            client.hClient.disconnect();
            delete clients[client.id];
        }, timeout);

    }else if (client){
        if(client.socket)
            client.socket.disconnect();

        delete clients[client.id];
    }
}