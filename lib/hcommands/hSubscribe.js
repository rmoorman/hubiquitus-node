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

var log = require('winston');

var status = require('../codes.js').hResultStatus;
var xmlElement = require('node-xmpp').Element;
var db = require('../mongo.js').db;
var xmppConnection = require('../server_connectors/xmpp_hnode.js').ServerConnection;

var hSubscribe = function(){
};

/**
 * Subscribes a publisher to a channel
 * @param hCommand - hCommand received with cmd = 'hSubscribe'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.exec = function(hCommand, context, cb){
    var self = this;
    var statusValue = null, result = null;

    if( !hCommand.params || typeof hCommand.params !== 'object' || !hCommand.params.chid ){
        cb(status.MISSING_ATTR, 'missing chid');
        return;
    }

    var chid = hCommand.params.chid;
    var channel = db.cache.hChannels[chid];

    if(channel){
        //Convert sender to bare jid
        var jid = hCommand.sender.replace(/\/.*/, '');

        if(channel.active == false){
            statusValue = status.NOT_AUTHORIZED;
            result = 'the channel is inactive';
        }

        //Check if in participants list
        else if(channel.participants.indexOf(jid) > -1)
            self.subscribePublisher(chid, jid, cb);
        else{
            statusValue = status.NOT_AUTHORIZED;
            result = 'not allowed to subscribe to "' + chid + '"';
        }

    } else{
        statusValue = status.NOT_AVAILABLE;
        result = 'channel "' + chid + '" not found';
    }

    if(statusValue)
        cb(statusValue, result);
};

/**
 * Checks if the user is not already subscribed and subscribes him.
 * @param chid - Channel to subscribe to
 * @param jid - BARE JID of the publisher
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.subscribePublisher = function(chid, jid, cb){
    var self = this;
    db.models.subscription.findOne({jid: jid}, function(err, doc){

        if(err){
            cb(status.TECH_ERROR, JSON.stringify(err));
            return;
        }

        if(doc){
            for(var i = 0; i < doc.subs.length; i++)
                if( doc.subs[i] == chid ){
                    cb(status.NOT_AUTHORIZED, 'already subscribed');
                    return;
                }
        }

        //All good to go
        var instance = doc || new db.models.subscription();
        instance.jid = instance.jid || jid;

        if(instance.subs)
            instance.subs.push(chid);
        else
            instance.subs = [chid];

        instance.save(function(err){
            if(!err){
                //Save completed. Send XMPP Subscription
                self.sendXMPPSubscription(chid, jid, function(err){
                    log.info('Success subscribing to channel ' + chid + ' by ' + jid);
                    cb(status.OK);
                });

            }else{
                var statusValue = status.TECH_ERROR;
                var result = JSON.stringify(err);
                log.info('Error subscribing to channel, Status:', statusValue, 'Result:', result);
                cb(statusValue, result);
            }

        });

    });
};

/**
 * Method used to subscribe in XMPP the publisher
 * This method must be called once the validation of the parameters has been made.
 * @param chid - Name of the channel to subscribe to
 * @param jid - publisher to subscribe
 * @param cb(err) - function that receives or not an error when finishes.
 */
hSubscribe.prototype.sendXMPPSubscription = function(chid, jid, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + xmppConnection.domain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'subscribed'});


    xmppConnection.sendIQ(attrs, content, function(stanza){
        cb();
    });
};

exports.Command = hSubscribe;