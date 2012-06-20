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

var hPublish = function(){
};

/**
 * hPublish publishes a hMessage to a channel and, if selected, will store the message in Mongo.
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hPublish'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hPublish.prototype.exec = function(hCommand, context, cb){
    var self = this;
    var hMessage = hCommand.params;

    if( !hMessage || typeof hMessage !== 'object')
        return cb(status.MISSING_ATTR, 'invalid params object received');

    //Test for missing chid
    if( !hMessage.chid )
        return cb(status.MISSING_ATTR, 'hMessage missing chid');

    if( typeof hMessage.chid != 'string')
        return cb(status.INVALID_ATTR, 'hMessage chid is not a string');

    if( hMessage.type && typeof hMessage.type != 'string')
        return cb(status.INVALID_ATTR, 'hMessage type is not a string');

    if( hMessage.priority ){
        if(typeof hMessage.priority != 'number')
            return cb(status.INVALID_ATTR, 'hMessage priority is not a number');

        if(hMessage.priority > 5 || hMessage.priority < 0)
            return cb(status.INVALID_ATTR, 'hMessage priority is not a valid constant');
    }

    if( hMessage.transient && typeof hMessage.transient !== 'boolean')
        return cb(status.INVALID_ATTR, 'hMessage transient is not a boolean');

    if( hMessage.location && !(hMessage.location instanceof Object) )
        return cb(status.INVALID_ATTR, 'hMessage location is not an Object');

    if( hMessage.author && !/^\w+@\w((\w|\.)*|\/\w+)$/.test(hMessage.author) )
        return cb(status.INVALID_ATTR, 'hMessage author is not a JID');

    if( !hMessage.publisher )
        return cb(status.MISSING_ATTR, 'hMessage missing publisher');

    if(typeof hMessage.headers !== 'undefined'){
        if( !(hMessage.headers instanceof Array))
            return cb(status.INVALID_ATTR, 'headers is not an array');

        for(var i = 0; i < hMessage.headers.length; i++)
            if( !(hMessage.headers[i] instanceof Object) || typeof hMessage.headers[i].hK != 'string' ||
                typeof hMessage.headers[i].hV != 'string')
                return cb(status.INVALID_ATTR, 'header ' + i + ' is not an hHeader');
    }

    var publisher = hMessage.publisher.replace(/\/.*/,'');

    //Test sender against publisher (ignore the resource from both of them)
    if( hCommand.sender.replace(/\/.*/,'') != publisher )
        return cb(status.NOT_AUTHORIZED, 'publisher does not match sender');


    var channel = db.cache.hChannels[hMessage.chid];

    if(!channel)
        return cb(status.NOT_AVAILABLE, 'the channel does not exist');

    if(channel.participants.indexOf(publisher) < 0)
        return cb(status.NOT_AUTHORIZED, 'error publishing to channel with current credentials');

    if(channel.active == false)
        return cb(status.NOT_AUTHORIZED, 'the channel is inactive');

    //Location order: hMessage, channel (as defined in ref.)
    hMessage.location = hMessage.location || channel.location;

    //Priority order: hMessage, channel, 1 (as defined in ref.)
    hMessage.priority = hMessage.priority || channel.priority || 1;

    //If hAlert force at least minimum priority
    if( /hAlert/i.test(hMessage.type) && hMessage.priority < 2 )
        hMessage.priority = 2;


    //Complete missing values (msgid added later)
    var msgId = db.createPk();
    hMessage.convid = !hMessage.convid || hMessage.convid == hMessage.msgid ? msgId : hMessage.convid;
    hMessage.published = hMessage.published || new Date();


    //If not transient store it (If it does not exist it is transient)
    if( hMessage.transient === false ){
        hMessage._id = msgId;

        delete hMessage.transient;
        delete hMessage.msgid;
        if(!hMessage.location) delete hMessage.location; //Does not save null;

        db.saveHMessage(hMessage);

        hMessage.transient = false;
    }

    //Set the msgid AFTER saving because we use msgId as id for mongo
    hMessage.msgid = msgId;

    //Publish it to XMPP
    self.publishXMPP(hMessage, cb);
};

hPublish.prototype.publishXMPP = function(hMessage, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var attrs = {
        type: 'set',
        to: 'pubsub.' + xmppConnection.domain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.chid})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));

    xmppConnection.sendIQ(attrs, content, function(stanza){
        log.debug('hMessage published correctly', hMessage);
        cb(status.OK, hMessage);
    });

};

exports.Command = hPublish;