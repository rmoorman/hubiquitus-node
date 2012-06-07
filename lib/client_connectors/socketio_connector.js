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

var xmpp = require('../server_connectors/xmpp_client.js');
var errors = require('../codes.js').errors;
var status = require('../codes.js').statuses;
var clients = {};
var options;


/**
 * Runs a SocketIO Connector with the given arguments.
 * @param args - {
 *     logLevel : DEBUG, INFO, WARN or ERROR
 *     port : int
 *     namespace : string
 *     discTimeout : int (Time to wait before disconnecting client)
 *     ridWindow : int (Accepted RIDs when reattaching)
 * }
 */
exports.run = function(args){
    options = args;
    var io = require('socket.io').listen(options.port); //Creates the HTTP server

    var logLevels = { DEBUG: 3, INFO: 2, WARN: 1, ERROR: 0 };
    io.set('log level', logLevels[options.logLevel]);

    //If an hResult is received from the parent, pass it to the correct client
    process.on('message', function(res){
        if(res && res.args && res.args.to && clients[res.args.to])
            clients[res.args.to].socket.emit('hResult', res.hResult);
    });

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
    log.info("Client ID " + client.id +  " sent data: " + JSON.stringify(data));

    client.xmppConnector = new xmpp.XMPPConnector(data);

    //Relay all server status messages
    client.xmppConnector.on('hStatus', function(msg){
        client.socket.emit('hStatus', msg);
    });

    client.xmppConnector.on('connection', function(attrs){
        //Store our jid and send attrs to client
        client.publisher = attrs.publisher;
        client.domain = attrs.domain;
        client.socket.emit('attrs', {
            publisher: attrs.publisher,
            rid: client.rid,
            sid: client.id});

        //Start listening for client actions
        addSocketListeners(client);

        //Start listening for messages from XMPP and relaying them
        client.xmppConnector.on('hMessage', function(hMessage){
            log.info("Sent message to client " + client.id + " : " + JSON.stringify(hMessage));
            client.socket.emit('hMessage', hMessage);
            client.rid++;
        });

        client.xmppConnector.on('hResult', function(hResult){
            log.info("Sent message to client", client.id,":", JSON.stringify(hResult));
            client.socket.emit('hResult', hResult);
            client.rid++;
        });
    });

    //Connect to XMPP Server
    client.xmppConnector.establishConnection();

    //Login to XMPP Server
    client.xmppConnector.connect();
}

function addSocketListeners(client){
    client.socket.on('hCommand', function(hCommand) {
        log.info('Client ID', client.id, 'sent hCommand, data:', JSON.stringify(hCommand));
        if(hCommand && hCommand.entity == 'hnode.' + client.domain)
            process.send({hCommand: hCommand, args: {to: client.id, pid: process.pid}});
        else if(hCommand)
            client.xmppConnector.hCommand(hCommand);
    });
}

/**
 *
 * @param client - Reference to the client
 * @param data - expected {sid, rid, publisher}
 */
function attach(client, data){
    log.info("Client ID " + client.id +  " sent data: " + JSON.stringify(data));
    /*
     To do an attach, we first confirm if the client is well authenticated,
     then we need to change the reference in the old client and delete it.
     */

    /*Check authentication
     Authentication consists of veryfing
     1. if the SID given is valid (corresponds to an active user)
     2. if the RID is in a valid RID window
     3. if the publisher corresponds to that of the identified client
     */
    var ridWindow = options.ridWindow;
    var supposedClient = clients[data.sid];

    if( supposedClient &&
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
    if (client && client.xmppConnector){
        log.info('Activating timeout for Client ' + client.id);
        var timeout = options.discTimeout;
        client.discTimeout = setTimeout(function(){
            log.info('Disconnecting Client ' + client.id);
            client.xmppConnector.disconnect();
            delete clients[client.id];
        }, timeout);
    }
    else if (client){
        delete clients[client.id];
    }
}