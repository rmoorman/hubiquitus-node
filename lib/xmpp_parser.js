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

exports.getSubscriptions = getSubscriptions;