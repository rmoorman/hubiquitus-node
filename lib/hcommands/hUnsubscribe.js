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

/**
 * Subscribes a publisher to a channel
 */
var status = require('../codes.js').hResultStatus;
var xmpp = require('node-xmpp');

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hUnsubscribe = function(){
    events.call(this);
};
util.inherits(hUnsubscribe, events);

/**
 * Method executed each time an hCommand with cmd = 'hUnsubscribe' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hUnsubscribe'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hUnsubscribe.prototype.exec = function(hCommand, context){
    var self = this;
    var statusValue, resultValue;

    if( !hCommand.params ){
        this.emit('result', {hCommand: hCommand, status: status.MISSING_ATTR,
            result: 'missing params object'});
        return;
    }

    var channel = hCommand.params.chid;

    if( !channel ){
        this.emit('result', {hCommand: hCommand, status: status.MISSING_ATTR,
            result: 'missing chid'});
        return;
    }

    //Removing resource
    var user = hCommand.sender.replace(/\/.*/,'');
    context.models.subscription.findOne({jid: user}, function(err, doc){
        if(!err){
            if(doc){
                //Search for subscription
                var i = 0;
                while(i < doc.subs.length && doc.subs[i] != channel) i++;

                if(i < doc.subs.length){
                    //Unsubscribe...
                    doc.subs.splice(i, 1);
                    doc.save(function(err){
                        if(!err){
                            self.XMPPUnsubscribe(channel, user, context, function(){
                                log.info('Finished unsubscribing to channel correctly');
                                self.emit('result', {hCommand: hCommand, status: status.OK});
                            });

                        } else{
                            statusValue = status.TECH_ERROR;
                            resultValue = JSON.stringify(err);

                            log.info('Finished unsubscribing to channel with status', statusValue, resultValue);
                            self.emit('result', {hCommand: hCommand, status: statusValue, result: resultValue});
                        }
                    });
                    return;
                }
            }
            //Doesn't exist in collection or not found in array, so it does not have subscriptions
            statusValue = status.INVALID_ATTR;
            resultValue = 'user not subscribed to channel';

        }else{
            statusValue = status.TECH_ERROR;
            resultValue = JSON.stringify(err);
        }

        log.info('Finished unsubscribing to channel with status', statusValue, resultValue);
        self.emit('result', {hCommand: hCommand, status: statusValue, result: resultValue});
    });
};

/**
 * Unsubscribes the user from the XMPP Node.
 * @param chid - Channel to unsubscribe from
 * @param jid - JID of the user to unsubscribe
 * @param context - Context received from the controller
 * @param cb - Executed when finished
 */
hUnsubscribe.prototype.XMPPUnsubscribe = function(chid, jid, context, cb){
    var self = this;
    var msgId = Math.floor(Math.random()*100000000000001);

    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: context.jid,

        //Because our jid is well formatted there is no risk doing this
        to: 'pubsub.' + context.jid.replace(/\w+\./,''),
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'none'});

    var callback = function(stanza){
        if(stanza.attrs.id == msgId){
            self.removeListener('stanza', callback);
            cb();
        }};

    this.on('stanza',callback);

    this.emit('send', msg);
};

/**
 * Create an instance of hUnsubscribe and expose it
 */
var hCommand = new hUnsubscribe();
exports.Command = hCommand;