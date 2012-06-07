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
var xmpp = require('node-xmpp');
var db = require('../mongo.js').db;
var xmppConnection = require('../server_connectors/xmpp_component.js').componentConnection;

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
    var statusValue, resultValue;

    if( !hCommand.params ){
        cb(status.MISSING_ATTR, 'missing params object');
        return;
    }

    var channel = hCommand.params.chid;

    if( !channel ){
        cb(status.MISSING_ATTR, 'missing chid');
        return;
    }

    //Removing resource
    var user = hCommand.sender.replace(/\/.*/,'');
    db.models.subscription.findOne({jid: user}, function(err, doc){
        if(!err){
            if(doc){
                //Search for subscription
                if(doc.subs.indexOf(channel) > -1){
                    //Unsubscribe...
                    doc.subs.splice(doc.subs.indexOf(channel), 1);
                    doc.save(function(err){
                        if(!err){
                            self.XMPPUnsubscribe(channel, user, context, function(err){
                                log.info('Finished unsubscribing to channel correctly');
                                cb(status.OK);
                            });

                        } else{
                            statusValue = status.TECH_ERROR;
                            resultValue = JSON.stringify(err);

                            log.info('Finished unsubscribing to channel with status', statusValue, resultValue);
                            cb(statusValue, resultValue);
                        }
                    });
                    return;
                }
            }
            //Doesn't exist in collection or not found in array, so it does not have subscriptions
            statusValue = status.NOT_AUTHORIZED;
            resultValue = 'user not subscribed to channel';

        }else{
            statusValue = status.TECH_ERROR;
            resultValue = JSON.stringify(err);
        }

        log.info('Finished unsubscribing to channel with status', statusValue, resultValue);
        cb(statusValue, resultValue);
    });
};

/**
 * Unsubscribes the user from the XMPP Node.
 * @param chid - Channel to unsubscribe from
 * @param jid - JID of the user to unsubscribe
 * @param context - Context received from the controller
 * @param cb - Executed when finished, receives err or nothing
 */
hUnsubscribe.prototype.XMPPUnsubscribe = function(chid, jid, context, cb){

    var attrs = {
        type: 'set',

        //Because our jid is well formatted there is no risk doing this
        to: 'pubsub.' + context.jid.replace(/\w+\./,'')
    };

    var content = new xmpp.Element('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'none'});

    xmppConnection.sendIQ(attrs, content, function(stanza){
        cb();
    });
};

exports.Command = hUnsubscribe;