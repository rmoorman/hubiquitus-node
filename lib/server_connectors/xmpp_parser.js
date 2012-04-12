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

    for(var i = 0; i < subs.length; i++){
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
 * Parses a stanza that has publications from the XMPP Server
 * and returns an object {node: <String>, entries: <message>[]}
 * @param stanza - Message from the server
 */
Parser.prototype.parseMessageStanza = function(stanza) {

    var parsedMessage = { entries: [] };
    var items;

    if (stanza.is('message') &&
        stanza.attrs.type !== 'error' &&
        stanza.getChild('event')){

        parsedMessage.node = stanza.getChild('event').getChild('items').attrs.node;
        items = stanza.getChild('event').getChild('items').getChildren('item');
    }
    else if (stanza.is('iq') &&
        stanza.attrs.type == 'result' &&
        stanza.getChild('pubsub') &&
        stanza.getChild('pubsub').getChild('items')){

        parsedMessage.node = stanza.getChild('pubsub').getChild('items').attrs.node;
        items = stanza.getChild('pubsub').getChild('items').getChildren('item');
    } else{
        return;
    }

    for(var item = 0; item < items.length; item++)
        if(items[item].getChild('entry'))
            parsedMessage.entries.push(items[item].getChild('entry').getText());

    if(parsedMessage.entries.length > 0){
        return parsedMessage;
    }
    log.debug('Server sent message: ' + stanza);
};

var parser = new Parser();

exports.parser = parser;