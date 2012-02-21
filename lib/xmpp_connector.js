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

var xmpp = require('node-xmpp');
var xmppParser = require('./xmpp_parser.js');
var statuses = {error: 'Error', connecting: 'Connecting', connected: 'Connected',
    disconnecting: 'Disconnecting', disconnected: 'Disconnected'};

//Logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
var log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

/**
* @param params
* {jid: User's XMPP username in format user@domain
* password: User's XMPP password
* host: XMPP host
* port : XMPP port to connect to}
* @param statusCallback - Method to be called when there are changes on the connection to the XMPP server
*/
var XMPPConnector = function(params, statusCallback){
    this.parameters = params;
    this.statusCallback = function(data){ this.status = data; statusCallback(data); };
    this.statusCallback(statuses.disconnected);
    this.client = new xmpp.Client(params);
    this.statusCallback(statuses.connecting);

    this.openSetReqs = {}; //Contains all open SET iq requests to the server
    this.openGetReqs = {}; //Contains all open GET iq requests to the server
    this.onIQs(); //Listens to IQ messages
    this.onError(); //Listens for errors in requests
    log.info('Connected to XMPP Server');
};

/**
 * Connects to the xmpp server and starts listening for subscribed events
 * @param callback - Called whenever a publication is broadcast by the server. Receives an array of publications
 */
XMPPConnector.prototype.connect = function(callback){
    //Send Presence
    var ctx = this;
    this.client.on('online',
        function() {
            // According to http://xmpp.org/rfcs/rfc3922.html
            this.send(new xmpp.Element('presence'));
            ctx.statusCallback(statuses.connected);
            log.info("Presence Sent to server");
        });

    //Wait for subscribed messages to arrive
    this.client.on('stanza', function(stanza){ xmppParser.parseData(stanza,callback)});
};

/**
 * Disconnects the current client from the XMPP Server
 * @param callback - function executed once the disconnection occurs (optional)
 */
XMPPConnector.prototype.disconnect = function(callback){
    this.statusCallback(statuses.disconnecting);
    this.client.end();
    this.statusCallback(statuses.disconnected);
    if(callback) callback('Client Disconnected');

    log.debug('Disconnected from XMPP Server');
};

/**
 * Subscribes the current client to a node
 * @param subsName - name of the node to subscribe
 * @param callback - function to call when the subscription succeeds (optional)
 */
XMPPConnector.prototype.subscribe = function(subsName,callback){
    //http://xmpp.org/extensions/xep-0060.html#subscriber-subscribe
    var msg = this.createIQRequest('set', new xmpp.Element('subscribe', {
        node: subsName,
        jid: this.parameters.jid
    }));

    //Send the subscription request
    this.client.send(msg);
    this.openSetReqs[msg.attrs.id] = {
        action: 'subscribe',
        node: subsName,
        callback: callback
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Unsubscribes the current client from a node
 * @param subsName - name of the node to unsubscribe
 * @param subsId - subID of the node to unsubscribe (Needed *only* if the client has multiple subscriptions to same node)
 * @param callback - function to call when the unsubscription succeeds (optional)
 */
XMPPConnector.prototype.unsubscribe = function(subsName, subsId, callback){
    var ctx = this;
    var unsubscription = function(elements){
        for(var i in elements)
            if( elements[i].subscription == 'subscribed'){
                //http://xmpp.org/extensions/xep-0060.html#subscriber-unsubscribe
                var msg = ctx.createIQRequest('set', new xmpp.Element('unsubscribe', {
                    node: elements[i].node,
                    subid: elements[i].subid,
                    jid: elements[i].jid
                }));

                //Send the unsubscription request
                ctx.client.send(msg);
                ctx.openSetReqs[msg.attrs.id] = {
                    action: 'unsubscribe',
                    node: elements[i].node,
                    callback: callback
                };
                log.debug('Sent message to server: ' + msg);
            }
    };

    //If client has several subscriptions to the same node
    //and doesn't specify subId, unsubscribe from all
    if(!subsId)
        this.getSubscriptions(subsName, unsubscription);
    else
        unsubscription([{ node: subsName, subid: subsId, jid: this.parameters.jid , subscription: 'subscribed'}]);
};

/**
 * Publishes an item to the given node. The callback is called when the publication succeeds.
 * @param node - Name of the node where the entry will be published
 * @param entry - Entry to publish (Optional)
 * @param callback - Function to call when the publication succeeds (Optional)
 */
XMPPConnector.prototype.publish = function(node, entry, callback){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var content = new xmpp.Element('publish', { node: node });
    if(entry)
        content.c('item')
            .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(entry));

    var msg = this.createIQRequest('set',content);

    //Send the publish request
    this.client.send(msg);
    this.openSetReqs[msg.attrs.id] = {
        action: 'publish',
        node: node,
        callback: callback
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Get an array of elements {node, subscription, jid, subid}
 * of subscriptions matching (optionally) the param node in the server.
 * @param node - Name of the node that the subscriptions must match
 * @param callback - Function that will receive the array of subscriptions
 */
XMPPConnector.prototype.getSubscriptions = function(node, callback){
    //http://xmpp.org/extensions/xep-0060.html#entity-subscriptions
    var msg = this.createIQRequest('get',new xmpp.Element('subscriptions'));

    //Send the retrieve subscriptions request
    this.client.send(msg);
    this.openGetReqs[msg.attrs.id] = {
        action: 'subscriptions',
        node: node,
        callback: callback
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * IQ listener that tests open requests
 * All open requests are stored in openSetReqs and will be analyzed when an iq arrives to
 * see if the request has been answered.
 */
XMPPConnector.prototype.onIQs = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result'){
            var id = stanza.attrs.id;
            if(ctx.openSetReqs[id]){
                var data = {
                    status: 'success',
                    node: ctx.openSetReqs[id].node
                };

                log.debug('Server sent response: ' + stanza);
                log.info(data.node + ' ' + ctx.openSetReqs[id].action + ' Succeeded');

                if ( ctx.openSetReqs[id].callback ) ctx.openSetReqs[id].callback(data);
                delete ctx.openSetReqs[id];
            }
            else if(ctx.openGetReqs[id]){
                switch(ctx.openGetReqs[id].action){
                    case 'subscriptions':
                        xmppParser.getSubscriptions(stanza,ctx.openGetReqs[id].callback, ctx.openGetReqs[id].node);
                        break;
                };

                log.debug('Server sent response: ' + stanza);
                log.info('Received '+ ctx.openGetReqs[id].action +' Response');

                delete ctx.openGetReqs[id];
            }
        }
    });
};

/**
 * Error listener that analyzes error messages and in case the callback function accepts error messages calls the
 * callback function with the error.
 */
XMPPConnector.prototype.onError = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'error'){
            var id = stanza.attrs.id;
            var req = ctx.openGetReqs[id] || ctx.openSetReqs[id];
            if (req){
                var data = {
                    status: 'error',
                    node: req.node
                };
                    log.error(data.node + ' ' + req.action + ' Failed');
                if ( req.callback && ctx.openSetReqs[id]) req.callback(data); //Get Requests don't expect error messages
                delete req;
                log.debug('Server sent error: ' + stanza);
            }
            else
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
    } while(this.openGetReqs[msgId] || this.openSetReqs[msgId]);

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