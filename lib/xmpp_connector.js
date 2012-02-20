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
    this.client = new xmpp.Client(params);
    this.statusCallback = statusCallback;
    statusCallback(statuses.connecting);
    this.subsReqs = []; //Contains all the open subscriptions requests
    this.listenSubscriptions();
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
    var msgId = this.parameters.jid + ':' + Math.floor(Math.random()*1000000000000000001);
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
 * Listener for all the subscriptions that the client wants to subscribe.
 * Subscriptions that are waiting response are stored in subsReqs, including their callbacks
 */
XMPPConnector.prototype.listenSubscriptions = function(){
    var ctx = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result'){
            log.debug('Server sent response: ' + stanza);
            //Assuming our ids are unique, res will be well formatted and don't need to check the node name
            for(var id in ctx.subsReqs)
                if( ctx.subsReqs[id].id == stanza.attrs.id &&
                    stanza.getChild('pubsub').getChild('subscription').attrs.subscription == 'subscribed'){
                        if(ctx.subsReqs[id].callback){
                            var data = {
                                status: 'success',
                                node: stanza.getChild('pubsub').getChild('subscription').attrs.node
                            };
                            log.info('Subscription to ' + data.node + ' Succeeded');
                            //Activate the callback and remove the reference in the array
                            ctx.subsReqs[id].callback(data);
                            ctx.subsReqs.splice(id, 1);
                        }
                }
        }
    });
};
exports.XMPPConnector = XMPPConnector;