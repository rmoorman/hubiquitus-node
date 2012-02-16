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
var XMPP = function(params){
    this.parameters = params;
    this.client = new xmpp.Client(params);
    log.info('Connected to XMPP Server');
}

/**
 * Connects to the xmpp server and starts listening for subscribed events
 */
XMPP.prototype.connect = function(callback){

    //Send Presence
    this.client.on('online',
        function() {
            /* According to http://xmpp.org/rfcs/rfc3922.html
             XMPP available presence
             <presence from='juliet@example.com/balcony'/>
             */
            this.send(new xmpp.Element('presence'));
            log.info("Presence Sent to server");
        });

    //Wait for subscribed messages to arrive
    this.client.on('stanza',function(stanza) {
        var content = [];
        if (stanza.is('message') &&
            stanza.attrs.type !== 'error') {
            /*
             According to XEP-0060
             <message from='x' to='y' id='foo'>
             <event xmlns='http://jabber.org/protocol/pubsub#event'>
             <items node='z'>
             <item id='123'>
             [ ... ENTRY ... ]
             </item>
             </items>
             </event>
             </message>
             */
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
        }
        log.info('Server sent content: ' + content);
        if(content.length > 0)
            callback(content);
    });
};
XMPP.prototype.disconnect = function(callback){
    this.client.end();
    if(callback)
        callback('Client Disconnected');

    log.info('Disconnected from XMPP Server');
}

exports.XMPP = XMPP;