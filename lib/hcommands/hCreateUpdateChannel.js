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
var mongoCodes = require('../codes.js').mongoCodes;
var xmlElement = require('node-xmpp').Element;
var db = require('../mongo.js').db;
var xmppConnection = require('../server_connectors/xmpp_hnode.js').ServerConnection;
var unsubscriberModule = require('./hUnsubscribe.js').Command;

var hCreateUpdateChannel = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hCreateUpdateChannel' is received.
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hCreateUpdateChannel'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 */
hCreateUpdateChannel.prototype.exec = function(hCommand, context, cb){
    var self = this;
    var channel = hCommand.params;

    if( !channel || typeof channel !== 'object')
        return cb(status.INVALID_ATTR, 'invalid params object received');

    //Test owner against sender (ignore resources)
    if( channel.owner && !hCommand.sender.replace(/\/.*/, '').match(channel.owner.replace(/\/.*/, '')) )
        return cb(status.NOT_AUTHORIZED, 'owner does not match sender');

    var existingChannel = db.cache.hChannels[channel.chid];

    //Verify if trying to change owner
    if(existingChannel && !existingChannel.owner.match(channel.owner))
        return cb(status.NOT_AUTHORIZED, 'trying to change owner');

//    //If participants were removed, unsubscribe them
//    var unsubscriber = new unsubscriberModule();
//    if(doc && channel['participants'] instanceof Array)
//        for(i = 0; i < doc.participants.length; i++)
//            if(channel['participants'].indexOf(doc.participants[i]) == -1)
//                unsubscriber.exec({sender: doc.participants[i],
//                    params: {chid: channel.chid}}, context, function(status, result){});


    //Set received channel chid as our _id
    channel._id = channel.chid;
    delete channel.chid;

    db.saveHChannel(channel, function(err, result){
        if(!err){
            if(existingChannel) //Updated
                cb(status.OK);
            else
                self.createXMPPChannel(result._id, cb);
        } else
            cb(err, result);
    });
};

/**
 * Method used to create a XMPP Channel using options from the hCommand.
 * This method must be called once the validation of the parameters has been made.
 * It will call configureXMPPChannel to configure the channel after creation
 * @param chid - Name of the channel to create in the XMPP Server
 * @param cb - function() when finishes.
 */
hCreateUpdateChannel.prototype.createXMPPChannel = function(chid, cb){
    var self = this;
    var attrs = {
        type: 'set',
        to: 'pubsub.' + xmppConnection.domain
    };
    var content = new xmlElement('pubsubl', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('create', {node : chid});

    xmppConnection.sendIQ(attrs, content, function(stanza){
        self.configureXMPPChannel(chid, cb);
    });
};

/**
 * Configures a XMPP Channel with the correct parameters to use it with hNode
 * @param chid - Channel identifier
 * @param cb - function() when finishes
 */
hCreateUpdateChannel.prototype.configureXMPPChannel = function(chid, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + xmppConnection.domain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})

        //Configuration header
        .c('configure', {node: chid})
        .c('x', {xmlns: 'jabber:x:data', type: 'submit'})
        .c('field', {'var': 'FORM_TYPE', type: 'hidden'})
        .c('value').t('http://jabber.org/protocol/pubsub#node_config').up()

        //Node configuration
        .up().c('field', {'var': 'pubsub#persist_items'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#send_last_published_item'}).c('value').t('never').up()
        .up().c('field', {'var': 'pubsub#presence_based_delivery'}).c('value').t('false').up()
        .up().c('field', {'var': 'pubsub#notify_config'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_delete'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_retract'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_sub'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#max_payload_size'}).c('value').t(50000).up();

    xmppConnection.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hCreateUpdateChannel;