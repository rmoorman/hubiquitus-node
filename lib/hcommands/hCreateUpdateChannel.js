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
var unsubscriberModule = require('./hUnsubscribe.js').Command;
var validators = require('../validators.js');

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
hCreateUpdateChannel.prototype.exec = function(hMessage, context, cb){
    var self = this;
    var hCommand = hMessage.payload;
    var channel = hCommand.params;

    if( !channel || typeof channel !== 'object')
        return cb(status.INVALID_ATTR, 'invalid params object received');

    //Test owner against sender (ignore resources)
    if( channel.owner && !validators.compareJIDs(hMessage.publisher, channel.owner) )
        return cb(status.NOT_AUTHORIZED, 'owner does not match sender');

    //This test is applied not to break other tests that include if chid exists, etc.
    if( validators.isChannel(channel.actor) ){

        //Test if valid name and if valid domain
        if( !(new RegExp('(^[^@]*$|@' + validators.getDomainJID(hMessage.publisher) + '$)').test(channel.actor)) )
            return cb(status.INVALID_ATTR, 'trying to use a different domain than current');

        //For legacy purposes, if chid does not contain # or @domain, include them
        channel.actor = validators.normalizeChannel(channel.actor, validators.getDomainJID(hMessage.publisher));

    }

    var existingChannel = db.cache.hChannels[channel.actor];

    //Verify if trying to change owner
    if(existingChannel && !existingChannel.owner.match(channel.owner))
        return cb(status.NOT_AUTHORIZED, 'trying to change owner');

    //If participants were removed, unsubscribe them
    var unsubscriber = new unsubscriberModule();

    //copy message for unsubscribe
    var unsubscribeMsg = {};
    Object.getOwnPropertyNames(hMessage).forEach(function (name) {
        unsubscribeMsg[name] = hMessage[name];
    });
    unsubscribeMsg.type = "hCommand";
    unsubscribeMsg.payload = {};

    if(existingChannel)
        for(var i = 0; i < existingChannel.participants.length; i++)
            if(channel['participants'].indexOf(existingChannel.participants[i]) < 0) {
                unsubscribeMsg.publisher = existingChannel.participants[i];
                unsubscribeMsg.payload.params = {actor: channel.actor};
                unsubscriber.exec(unsubscribeMsg, context, function(status, result){});
            }


    //Set received channel chid as our _id
    channel._id = channel.actor;
    delete channel.actor;

    //Remove empty headers and location
    validators.cleanEmptyAttrs(channel, ['headers', 'location', 'chdesc']);

    var useValidators;

    //If error with one of the getBareJID, ignore it, just use validation and we will get correct error
    try{
        useValidators = validators.getBareJID(hMessage.publisher) != validators.getBareJID(hAdmin.jid);
    } catch(err){
        useValidators = true;
    }

    db.saveHChannel(channel, useValidators, function(err, result){
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
 * @param actor - Name of the channel to create in the XMPP Server
 * @param cb - function() when finishes.
 */
hCreateUpdateChannel.prototype.createXMPPChannel = function(actor, cb){
    var self = this;
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };
    var content = new xmlElement('pubsubl', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('create', {node : actor});
    hAdmin.sendIQ(attrs, content, function(stanza){
        self.configureXMPPChannel(actor, cb);
    });

};

/**
 * Configures a XMPP Channel with the correct parameters to use it with hNode
 * @param chid - Channel identifier
 * @param cb - function() when finishes
 */
hCreateUpdateChannel.prototype.configureXMPPChannel = function(actor, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})

        //Configuration header
        .c('configure', {node: actor})
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

    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hCreateUpdateChannel;