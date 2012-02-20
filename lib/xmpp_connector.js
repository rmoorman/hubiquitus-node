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

    this.openReqs = {}; //Contains all open requests to publish elements
    this.onIQs();
    this.subsReqs = []; //Contains all open subscriptions requests
    this.onSubscribe();
    this.unsubsReqs = []; //Contains all open unsubscriptions requests
    this.onUnsubscribe();
    this.onError(); //Listens for errors in requests
    log.info('Connected to XMPP Server');
};

/**
 * Connects to the xmpp server and starts listening for subscribed events
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
    this.client.on('stanza',function(stanza) {
        var content = [];
        if (stanza.is('message') &&
            stanza.attrs.type !== 'error') {
            //According to XEP-0060
            if(stanza.getChild('event'))
            {
                var nodes = [];
                if( stanza.getChild('event').getChild('items') &&
                    stanza.getChild('event').getChild('items').getChild('item') &&
                    stanza.getChild('event').getChild('items'))

                    nodes =  stanza.getChild('event').getChild('items').getChildren('item');
                else
                //It's possible not to have collection (items) and just sparse elements 'item'
                    nodes = stanza.getChildren('item')

                for(var item in nodes){
                    if(nodes[item].getChild('entry'))
                        content.push(nodes[item].getChild('entry').getText());
                }
            }
            log.debug('Server sent response: ' + stanza);
        }
        if(content.length > 0)
            callback(content);
    });
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
    var msgId = this.parameters.jid + ':' + Math.floor(Math.random()*100000000000000000000000000001);
    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: this.parameters.jid,
        to: 'pubsub.' + this.client.jid.domain,
        id: msgId
    });
    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('subscribe', {
            node: subsName,
            jid: this.parameters.jid
        });

    //Send the subscription request
    this.client.send(msg);
    this.subsReqs.push({id: msgId, callback: callback});
    log.debug('Sent message to server: ' + msg);
};

/**
 * Unsubscribes the current client from a node
 * @param subsName - name of the node to unsubscribe
 * @param subsId - subID of the node to unsubscribe (Needed *only* if the client has multiple subscriptions to same node)
 * @param callback - function to call when the unsubscription succeeds (optional)
 */
XMPPConnector.prototype.unsubscribe = function(subsName, subsId, callback){
    //http://xmpp.org/extensions/xep-0060.html#subscriber-unsubscribe
    var msgId = this.parameters.jid + ':' + Math.floor(Math.random()*100000000000000000000000000001);
    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: this.parameters.jid,
        to: 'pubsub.' + this.client.jid.domain,
        id: msgId
    });
    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('unsubscribe', {
            node: subsName,
            subid: subsId,
            jid: this.parameters.jid
        });

    //Send the unsubscription request
    this.client.send(msg);
    this.unsubsReqs.push({id: msgId, node: subsName, callback: callback});
    log.debug('Sent message to server: ' + msg);
};

/**
 * Publishes an item to the given node. The callback is called when the publication succeeds.
 * @param node - Name of the node where the entry will be published
 * @param entry - Entry to publish (Optional)
 * @param callback - Function to call when the publication succeeds (Optional)
 */
XMPPConnector.prototype.publish = function(node, entry, callback){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var msgId = this.parameters.jid + ':' + Math.floor(Math.random()*100000000000000000000000000001);
    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: this.parameters.jid,
        to: 'pubsub.' + this.client.jid.domain,
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', { node: node });

    if(entry)
        msg.getChild('pubsub').getChild('publish')
            .c('item')
                .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'})
                    .t(JSON.stringify(entry));

    //Send the publish request
    this.client.send(msg);
    this.openReqs[msgId] = {
        action: 'publish',
        node: node,
        callback: callback
    };
    log.debug('Sent message to server: ' + msg);
};

/**
 * Listener for all the subscriptions that the client wants to subscribe.
 * Subscriptions that are waiting response are stored in subsReqs, including their callbacks
 */
XMPPConnector.prototype.onSubscribe = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result'){
            //Assuming our ids are unique, res will be well formatted and don't need to check the node name
            for(var id in ctx.subsReqs)
                if( ctx.subsReqs[id].id == stanza.attrs.id &&
                    stanza.getChild('pubsub').getChild('subscription').attrs.subscription == 'subscribed'){
                        var data = {
                            status: 'success',
                            node: stanza.getChild('pubsub').getChild('subscription').attrs.node
                        };
                        log.debug('Server sent response: ' + stanza);
                        log.info('Subscription to ' + data.node + ' Succeeded');
                        //Activate the callback and remove the reference in the array
                        if( ctx.subsReqs[id].callback ) ctx.subsReqs[id].callback(data);
                        ctx.subsReqs.splice(id, 1);
                }
        }
    });
};

/**
 * Listener for all the unsubscriptions that the client executed
 * Unsubscriptions waiting for response are stored in unsubsReqs, including their callbacks
 */
XMPPConnector.prototype.onUnsubscribe = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result'){
            for(var id in ctx.unsubsReqs)
                if( ctx.unsubsReqs[id].id == stanza.attrs.id ){
                    var data = {
                        status: 'success',
                        node: ctx.unsubsReqs[id].node
                    };
                    log.debug('Server sent response: ' + stanza);
                    log.info('Unsubscription to ' + data.node + ' Succeeded');
                    //Activate the callback and remove the reference in the array
                    if( ctx.unsubsReqs[id].callback ) ctx.unsubsReqs[id].callback(data);
                    ctx.unsubsReqs.splice(id, 1);
                }
        }
    });
};

/**
 * Listener for all the publications that the client executed
 * Publications waiting for response are stored in openReqs, including their callbacks
 */
XMPPConnector.prototype.onIQs = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result'){
            if(ctx.openReqs[stanza.attrs.id]){
                var data = {
                  status: 'success',
                    node: ctx.openReqs[stanza.attrs.id].node
                };
                log.debug('Server sent response: ' + stanza);
                log.info(data.node + ' ' + ctx.openReqs[stanza.attrs.id].action + ' Succeeded');
                if ( ctx.openReqs[stanza.attrs.id].callback ) ctx.openReqs[stanza.attrs.id].callback(data);
                delete ctx.openReqs[stanza.attrs.id];
            }
        }
    });
};

XMPPConnector.prototype.onError = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'error'){
            log.error('Server sent error: ' + stanza);
        }
    });
};

exports.XMPPConnector = XMPPConnector;
exports.statuses = statuses;