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
var db = require('../mongo.js').db;
var hAdmin = require('../hAdmin.js').getHAdmin();
var xmlElement = require('../server_connectors/xmpp_connection.js').Element;
var validators = require('../validators.js');

var hSubscribe = function(){
};

/**
 * Subscribes a publisher to a channel
 * @param hMessage - hMessage with hCommand received with cmd = 'hSubscribe'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.exec = function(hMessage, context, cb){
    var self = this;
    var statusValue = null, result = null;

    var hCommand = hMessage.payload;

    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params object received');

    var actor = hCommand.params.actor;

    if(!actor)
        return cb(status.MISSING_ATTR, 'missing actor');

    if(typeof actor != 'string')
        return cb(status.INVALID_ATTR, 'actor is not a string');

    //For legacy purposes, if actor does not contain # or @domain, include them
    actor = validators.normalizeChannel(actor, validators.getDomainJID(hMessage.publisher));

    var channel = db.cache.hChannels[actor];

    if(channel){
        //Convert sender to bare jid
        var jid = hMessage.publisher.replace(/\/.*/, '');

        if(channel.active == false){
            statusValue = status.NOT_AUTHORIZED;
            result = 'the channel is inactive';
        }

        //Check if in participants list
        else if(channel.participants.indexOf(jid) > -1)
            self.subscribePublisher(actor, jid, cb);
        else{
            statusValue = status.NOT_AUTHORIZED;
            result = 'not allowed to subscribe to "' + actor + '"';
        }

    } else{
        statusValue = status.NOT_AVAILABLE;
        result = 'channel "' + actor + '" not found';
    }

    if(statusValue)
        cb(statusValue, result);
};

/**
 * Checks if the user is not already subscribed and subscribes him.
 * @param actor - Channel to subscribe to
 * @param jid - BARE JID of the publisher
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.subscribePublisher = function(actor, jid, cb){
    var self = this;
    db.get('hSubscriptions').findOne({_id: jid}, function(err, doc){

        if(err)
            return cb(status.TECH_ERROR, JSON.stringify(err));

        if(doc && doc.subs.indexOf(actor) > -1)
            return cb(status.NOT_AUTHORIZED, 'already subscribed to channel ' + actor);

        db._updater(db.get('hSubscriptions'), {_id: jid}, {$push: {subs: actor}}, {upsert: true}, function(err, result){
            //Save completed. Send XMPP Subscription
            if(!err)
                self.sendXMPPSubscription(actor, jid, cb);
            else
                cb(err, result);
        });

    });
};

/**
 * Method used to subscribe in XMPP the publisher
 * This method must be called once the validation of the parameters has been made.
 * @param actor - Name of the channel to subscribe to
 * @param jid - publisher to subscribe
 * @param cb - that receives (status, result).
 */
hSubscribe.prototype.sendXMPPSubscription = function(actor, jid, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: actor})
        .c('subscription', {jid: jid, subscription: 'subscribed'});


    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hSubscribe;