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

//Logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
var log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

var Parser = function(){
};

/**
 * Parses the response of the server to a get Subscriptions request
 * @param stanza - Response from the server
 * @param node - If specified, only return subscriptions related to this node (optional)
 * @returns Array of Objects {jid, node, subscription, subid}, all strings
 */
Parser.prototype.parseSubscriptions = function(stanza, node){
    var results = [];
    var subs = stanza.getChild('pubsub').getChild('subscriptions').getChildren('subscription');

    for(var i in subs){
        var sub = {
            jid: subs[i].attrs.jid,
            node: subs[i].attrs.node
        };
        if (!node || sub.node == node){
            log.debug('Received Subscription from Server: ' + JSON.stringify(sub));
            results.push(sub);
        }
    }
    return results;
};

/**
 * Parses publication messages from XMPP Server.
 * @param stanza - Message from server
 */
Parser.prototype.parseData = function(stanza) {
    var content = [];
    if (stanza.is('message') &&
        stanza.attrs.type !== 'error') {
        //According to XEP-0060
        if(stanza.getChild('event'))
        {
            var parsedMessage = {
                node : stanza.getChild('event').getChild('items').attrs.node,
                entries : []
            };

            var children = stanza.getChild('event').getChild('items').getChildren('item');

            for(var item in children)
                if(children[item].getChild('entry'))
                    parsedMessage.entries.push(children[item].getChild('entry').getText());
        }
        log.debug('Server sent message: ' + stanza);

        if(parsedMessage.entries.length > 0)
            return parsedMessage;
    }
};

var parser = new Parser();

exports.parser = parser;