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
var opts = require('./options.js');

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
* @param callback called when there is data to transmit (connection status or message)
*/
var XMPPConnector = function(params){
    this.parameters = params;
    this.client = new xmpp.Client(params);
    log.info('Connected to XMPP Server');
}

/**
 * Connects to the xmpp server and starts listening for subscribed events
 */
XMPPConnector.prototype.connect = function(callback){

    //Send Presence
    this.client.on('online',
        function() {
            // According to http://xmpp.org/rfcs/rfc3922.html
            this.send(new xmpp.Element('presence'));
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
XMPPConnector.prototype.disconnect = function(callback){
    this.client.end();
    if(callback) callback('Client Disconnected');

    log.debug('Disconnected from XMPP Server');
};
XMPPConnector.prototype.subscribe = function(subsName,callback){
    //WARNING: It doesn't allow two simultaneous subscriptions!

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
    log.debug('Sent message to server: ' + msg);

    //Wait for the server response
    this.client.on('stanza',function subListener(stanza) {
        if(stanza.is('iq') &&
            stanza.attrs.type === 'result' &&
            stanza.attrs.id == msgId &&
            stanza.getChild('pubsub') &&
            stanza.getChild('pubsub').getChild('subscription') &&
            stanza.getChild('pubsub').getChild('subscription').attrs.node == subsName &&
            stanza.getChild('pubsub').getChild('subscription').attrs.subscription == 'subscribed'){
                if(callback) callback('success');
                log.info('Subscription to ' + subsName + ' Succeeded');
                log.debug('Server sent response: ' + stanza);
                log.debug('Removing the listener');

                this.removeListener('stanza', subListener);
        }
    });
};
exports.XMPPConnector = XMPPConnector;