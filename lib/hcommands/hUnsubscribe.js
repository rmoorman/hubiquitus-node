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

var hUnsubscribe = function(){
};

/**
 * Unsubscribes a publisher from a channel.
 * @param hCommand - hCommand received with cmd = 'hUnsubscribe'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hUnsubscribe.prototype.exec = function(hCommand, context, cb){
    var self = this;

    if( !hCommand.params )
        return cb(status.MISSING_ATTR, 'missing params object');

    var chid = hCommand.params.chid;

    if( !chid )
        return cb(status.MISSING_ATTR, 'missing chid');

    //For legacy purposes, if chid does not contain # or @domain, include them
    chid = validators.normalizeChannel(chid, validators.getDomainJID(hCommand.sender));

    var channel = db.cache.hChannels[chid];

    if( !channel )
        return cb(status.NOT_AUTHORIZED, 'chid does not exist');

    if(channel.active == false)
        return cb(status.NOT_AUTHORIZED, 'inactive channel');

    //Removing resource
    var user = hCommand.sender.replace(/\/.*/,'');
    db.get('hSubscriptions').findOne({_id: user, subs: chid}, function(err, doc){
        if(!err && doc)
            db._updater(db.get('hSubscriptions'), {_id: user}, {$pull: {subs: chid}}, function(err, result){
                if(!err)
                    self.XMPPUnsubscribe(chid, user, cb);
                else
                    return cb(err, result);
            });

        else if(!doc) //Doesn't exist in collection or not found in array, so it does not have subscriptions
            return cb(status.NOT_AUTHORIZED, 'user not subscribed to channel');

        else
            return cb(err, result);
    });
};

/**
 * Unsubscribes the user from the XMPP Node.
 * @param chid - Channel to unsubscribe from
 * @param jid - JID of the user to unsubscribe
 * @param cb - Executed when finished, receives err or nothing
 */
hUnsubscribe.prototype.XMPPUnsubscribe = function(chid, jid, cb){

    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.domain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'none'});

    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hUnsubscribe;