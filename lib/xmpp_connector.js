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

//Events
var util = require('util');
var events = require('events').EventEmitter;

var xmpp = require('node-xmpp');
var xmppParser = require('./xmpp_parser.js').parser;
var statuses = {Error: 'Error', Connecting: 'Connecting', Connected: 'Connected',
    Disconnecting: 'Disconnecting', Disconnected: 'Disconnected'};

//Logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
var log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

/**
 * @param params
 * { (String)jid: User's XMPP username in format user@domain
 *   (String) password: User's XMPP password
 *   (Optional) (String) host: XMPP host
 *   (Optional) (String) port : XMPP port to connect to  }
 */
var XMPPConnector = function(params){
    events.call(this);
    this.parameters = params;
    this.openReqs = {}; //Contains all open iq requests to the server
};

util.inherits(XMPPConnector, events);

XMPPConnector.prototype.establishConnection = function(){
    this.client = new xmpp.Client(this.parameters);
    this.emit('link', {status: statuses.Connecting});
    log.info('Connected to XMPP Server');
    this.onIQs(); //Listens for IQ messages
    this.onError(); //Listens for errors in requests
}

/**
 * Connects to the xmpp server and starts listening for subscribed events
 */
XMPPConnector.prototype.connect = function(){
    //Send Presence
    var self = this;
    this.client.on('online',
        function() {
            // According to http://xmpp.org/rfcs/rfc3922.html
            this.send(new xmpp.Element('presence'));
            self.emit('link', {status: statuses.Connected});
            log.info("Presence Sent to server");
        });

    //Once new messages arrive, parse them and emit them
    this.client.on('stanza', function(stanza){
        var parsedMessage = xmppParser.parseData(stanza);
        if(parsedMessage){
            self.emit('items', {node: parsedMessage.node, entries: parsedMessage.entries});
        }
    });
};

/**
 * Disconnects the current client from the XMPP Server
 */
XMPPConnector.prototype.disconnect = function(){
    this.emit('link', {status: statuses.Disconnecting});
    if(this.client.socket) //Check if we haven't already disconnected
        this.client.end();
    this.emit('link', {status: statuses.Disconnected});
    log.debug('Disconnected from XMPP Server');
};

/**
 * Subscribes the current client to a node
 * @param data - Object containing the ID the client sent us and the node to subscribe
 */
XMPPConnector.prototype.subscribe = function(data){
    //http://xmpp.org/extensions/xep-0060.html#subscriber-subscribe
    var msg = this.createIQRequest('set', new xmpp.Element('subscribe', {
        node: data.node,
        jid: this.parameters.jid
    }));

    //Send the subscription request
    this.client.send(msg);
    this.openReqs[msg.attrs.id] = {
        action: 'subscribe',
        node: data.node,
        id: data.id
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Unsubscribes the current client from a node
 * We do *not* allow several subscriptions to the same node
 * @param data - Object containing the ID of the request and the node to unsubscribe
 */
XMPPConnector.prototype.unsubscribe = function(data){
    //http://xmpp.org/extensions/xep-0060.html#subscriber-unsubscribe
    var msg = this.createIQRequest('set', new xmpp.Element('unsubscribe', {
        node: data.node,
        jid: this.parameters.jid
    }));

    this.client.send(msg);
    this.openReqs[msg.attrs.id] = {
        action: 'unsubscribe',
        node: data.node,
        id: data.id
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Publishes an item to the given node
 * @param data - Object containing the ID of the request, the entry to publish and the node to publish it to.
 */
XMPPConnector.prototype.publish = function(data){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var content = new xmpp.Element('publish', { node: data.node });
    content.c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(data.entry));

    var msg = this.createIQRequest('set', content);

    //Send the publish request
    this.client.send(msg);
    this.openReqs[msg.attrs.id] = {
        action: 'publish',
        node: data.node,
        id: data.id
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Get an array of elements {node, subscription, jid, subid}
 * of subscriptions matching (optionally) the param node in the server.
 * @param node - Name of the node that the subscriptions must match
 */
XMPPConnector.prototype.getSubscriptions = function(node){
    //http://xmpp.org/extensions/xep-0060.html#entity-subscriptions
    var msg = this.createIQRequest('get',new xmpp.Element('subscriptions'));

    //Send the retrieve subscriptions request
    this.client.send(msg);
    this.openReqs[msg.attrs.id] = {
        action: 'subscriptions',
        node: node
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * IQ listener that tests open requests
 * All open requests are stored in openReqs and will be analyzed when an iq arrives to
 * see if the request has been answered. It also responds to the server with an error if
 * the IQ-Get message is not recognized.
 */
XMPPConnector.prototype.onIQs = function(){
    var self = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq')){
            log.debug('Server sent IQ: ' + stanza);

            if (stanza.attrs.type === 'result' && self.openReqs[stanza.attrs.id]){
                var req = self.openReqs[stanza.attrs.id];

                switch(req.action){
                    case 'publish':
                    case 'subscribe':
                    case 'unsubscribe':
                        self.emit('result', {
                            type: req.action,
                            node: req.node,
                            id:   req.id  //This is not the same id from the stanza!
                        });
                        break;
                    case 'subscriptions':
                        var subs = xmppParser.parseSubscriptions(stanza, req.node);
                        self.emit('subscriptions', subs);
                        break;
                }
                log.info(req.node + ' ' + req.action + ' Succeeded');
                delete self.openReqs[stanza.attrs.id];
            }
            else if (stanza.attrs.type === 'get'){
                //Get requests are not implemented. We sent them back as errors to the server.
                var msg = new xmpp.Element('iq', {type: 'error',
                    from: stanza.attrs.to,
                    to: stanza.attrs.from,
                    id: stanza.attrs.id});
                msg.c(stanza.children[0].getName(), {xmlns: stanza.children[0].getNS()});
                msg.c('error', { type: 'cancel'})
                    .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'});

                self.client.send(msg);
                log.debug('Sent message to server: ' + msg);
            }
        }
    });
}

/**
 * Error listener that analyzes error messages and emits an error message
 */
XMPPConnector.prototype.onError = function(){
    var self = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'error'){
            var req = self.openReqs[stanza.attrs.id];
            if (req){
                var data = {
                    type: req.action,
                    code: 1, //TODO: IMPLEMENT ERROR CODES
                    node: req.node,
                    id:   req.id  //This is not the same id from the stanza!
                };
                log.error(data.node + ' ' + req.action + ' Failed');
                self.emit('error', data);
                delete self.openReqs[stanza.attrs.id];
            }
            log.error('Server sent error: ' + stanza);
        }
    });
};

/**
 * Creates an IQ request with a pubsub element already created that can be sent to the server.
 * @param content - An XMPP element that will be added to the message
 * @param type - [ set | get ]
 * @return - Ready to send message with a uid according to the open requests.
 */
XMPPConnector.prototype.createIQRequest = function(type, content){
    var msgId;
    do{
        msgId= this.parameters.jid + ':' + Math.floor(Math.random()*100000000000000000000000000001);
    } while(this.openReqs[msgId]);

    var msg = new xmpp.Element('iq', {
        type: type,
        from: this.parameters.jid,
        to: 'pubsub.' + this.client.jid.domain,
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .cnode(content);

    return msg;
};

exports.XMPPConnector = XMPPConnector;
exports.statuses = statuses;