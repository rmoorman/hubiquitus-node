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

/**
 * Parses the response of the server to the request getSubscriptions
 * @param data - Response from the server
 * @param callback - Function to send the results
 * @param node - If specified, only return subscriptions related to this node (optional)
 */
function getSubscriptions(data, callback, node){
    var results = [];
    var subscriptions = data.getChild('pubsub').getChild('subscriptions').getChildren('subscription');

    for(var i in subscriptions){
        var sub = {
            jid: subscriptions[i].attrs.jid,
            node: subscriptions[i].attrs.node,
            subscription: subscriptions[i].attrs.subscription,
            subid: subscriptions[i].attrs.subid
        };
        if (!node || sub.node == node){
            log.debug('Received Subscription from Server: ' + JSON.stringify(sub));
            results.push(sub);
        }
    }
    callback(results);
};

/**
 * Parses publication messages from XMPP Server.
 * @param stanza - Message from server
 * @param callback - Receives a string array of publications. Called when data is processed.
 */
function parseData(stanza, callback) {
    var content = [];
    if (stanza.is('message') &&
        stanza.attrs.type !== 'error') {
        //According to XEP-0060
        if(stanza.getChild('event'))
        {
            var nodes = [];
            if( stanza.getChild('event').getChild('items'))
                nodes =  stanza.getChild('event').getChild('items').getChildren('item');
            else
            //It's possible not to have a collection (items) and just sparse elements 'item'
                nodes = stanza.getChildren('item')

            for(var item in nodes)
                if(nodes[item].getChild('entry'))
                    content.push(nodes[item].getChild('entry').getText());
        }
        log.debug('Server sent response: ' + stanza);
    }
    if(content.length > 0)
        callback(content);
};

exports.getSubscriptions = getSubscriptions;
exports.parseData = parseData;