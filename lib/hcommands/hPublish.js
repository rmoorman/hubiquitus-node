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

var hPublish = function(){
};

/**
 * hPublish publishes a hMessage to a channel and, if selected, will store the message in Mongo.
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hPublish'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hPublish.prototype.exec = function(hCommand, context, cb){
    var self = this;
    var hMessage = hCommand.params;
    var paths = ['chid', 'convid', 'type', 'priority', 'relevance', 'payload',
        'location', 'author', 'publisher', 'published', 'headers'];

    if( !hMessage || typeof hMessage !== 'object'){
        cb(status.MISSING_ATTR, 'invalid params object received');
        return;
    }

    if( !hMessage.publisher ){
        cb(status.MISSING_ATTR, 'hMessage missing publisher');
        return;
    }

    var publisher = hMessage.publisher.replace(/\/.*/,'');

    //Test sender against publisher (ignore the resource from both of them)
    if( hCommand.sender.replace(/\/.*/,'') != publisher ){
        cb(status.NOT_AUTHORIZED, 'publisher does not match sender');
        return;
    }

    //Test for missing chid
    if( !hMessage.chid ){
        cb(status.MISSING_ATTR, 'hMessage missing chid');
        return;
    }
    var channel = db.cache.hChannels[hMessage.chid];

    if(!channel){
        cb(status.NOT_AVAILABLE, 'the channel does not exist');
        return;
    }else if(channel.participants.indexOf(publisher) == -1){
        cb(status.NOT_AUTHORIZED, 'error publishing to channel with current credentials');
        return;
    }else if(channel.active == false){
        cb(status.NOT_AUTHORIZED, 'the channel is inactive');
        return;
    }

    var instance = {};
    //Instantiate correct collection object and create Schema if first time
    if(hMessage['transient'] === false){
        if(!db.models.hMessage[hMessage.chid])
            db.createHMessageSchema(hMessage.chid);

        instance = new db.models.hMessage[hMessage.chid]();
    }

    //Fill default values from channel
    instance.priority = channel.priority;
    if(channel.location)
        instance.location = JSON.parse(JSON.stringify(channel.location)); //Deep copy without mongo attributes.

    //Copy values from received message
    for(var i = 0; i < paths.length; i++)
        if(hMessage[paths[i]])
            instance[paths[i]] = hMessage[paths[i]];

    //Fill values
    instance.msgid = UUID();
    instance.convid = instance.convid || instance.msgid;
    instance.published = instance.published || new Date();
    instance.headers = instance.headers || [];

    //If hAlert force at least minimum priority
    if( /hAlert/i.test(instance.type) && instance.priority < 2 )
        instance.priority = 2;


    //If not transient store it (If it does not exist it is transient)
    if(hMessage['transient'] === false)
        instance.save(function(errSave){
            if(!errSave)
                log.info('Saved publication ' + instance.msgid + ' correctly');
            else
                log.warn('Error saving publication ' + instance.msgid, errSave);
        });

    //Publish it to XMPP
    self.publishXMPP(instance, context, cb);
};

hPublish.prototype.publishXMPP = function(hMessage, context, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var attrs = {
        type: 'set',
        to: 'pubsub.' + context.domain
    };

    var content = new xmpp.Element('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.chid})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));

    xmppConnection.sendIQ(attrs, content, function(stanza){
        log.info('Published ' + hMessage.msgid + ' correctly');
        cb(status.OK);
    });

};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.Command = hPublish;