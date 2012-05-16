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
 * hPublish publishes a hMesssage to a channel and, if marked,
 * will store the hMessage in Mongo
 */
var status = require('../codes.js').hResultStatus;
var xmpp = require('node-xmpp');

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hPublish = function(){
    events.call(this);
};
util.inherits(hPublish, events);

/**
 * Method executed each time an hCommand with cmd = 'hPublish' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hPublish'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hPublish.prototype.exec = function(hCommand, context){
    var self = this;
    var hMessage = hCommand.params;
    var paths = ['chid', 'convid', 'type', 'priority', 'relevance', 'payload',
        'location', 'author', 'publisher', 'published', 'headers'];

    if( !hMessage || typeof hMessage !== 'object'){
        self.emit('result', {hCommand: hCommand, status: status.MISSING_ATTR,
            result: 'invalid params object received'});
        return;
    }

    //Test sender against publisher (ignore the resource from both of them)
    if( !hCommand.sender.replace(/\/.*/,'') == hMessage.publisher.replace(/\/.*/,'') ){
        self.emit('result', {hCommand: hCommand, status: status.NOT_AUTHORIZED,
            result: 'owner does not match sender'});
        return;
    }

    //Test for missing chid
    if( !hMessage.chid ){
        self.emit('result', {hCommand: hCommand, status: status.MISSING_ATTR,
            result: 'hMessage missing chid'});
        return;
    }

    context.models.hChannel.findOne({chid: hMessage.chid, participants: hMessage.publisher}, function(err, channel){
        var resultValue = null;
        var statusValue = null;

        if(!err){
            if(channel){

                var instance = hMessage['transient'] == true ? {} : new context.models.hMessage();

                //Fill default values from channel
                if(channel.location){
                    instance.location = {};
                    var locValues = ['lat', 'lng', 'zip'];
                    for(var i = 0; i < locValues.length; i++)
                        if(channel.location[locValues[i]])
                            instance.location[locValues[i]] = channel.location[locValues[i]];
                }

                instance.priority = channel.priority;

                //Copy values from received message
                for(var i = 0; i < paths.length; i++)
                    if(hMessage[paths[i]])
                        instance[paths[i]] = hMessage[paths[i]];

                //Fill values
                instance.msgid = UUID();
                instance.convid = instance.convid || instance.msgid;
                instance.published = instance.published || new Date();

                //If not transient store it
                if(!hMessage['transient'] || hMessage['transient'] == false){

                    instance.save(function(errSave){
                        if(!errSave){
                            self.publishXMPP(hMessage, context, function(err){
                                log.info('Finished publishing to channel');
                                self.emit('result', {hCommand: hCommand, status: status.OK});
                            })

                        }else{
                            log.info('Error publishing to channel', JSON.stringify(errSave));
                            self.emit('result', {hCommand: hCommand, status: status.TECH_ERROR,
                                result: JSON.stringify(errSave)});
                        }
                    });


                } else{
                    //Just publish it to XMPP
                    self.publishXMPP(hMessage, context, function(err){
                        log.info('Finished publishing to channel');
                        self.emit('result', {hCommand: hCommand, status: status.OK});
                    })
                }
                return;

            }else{
                statusValue = status.NOT_AUTHORIZED;
                resultValue = 'error publishing to channel with current credentials';
            }

        }else{
            statusValue = status.TECH_ERROR;
            resultValue = JSON.stringify(err);
        }

        log.info('Finished publishing to channel with status', statusValue, resultValue);
        self.emit('result', {hCommand: hCommand, status: statusValue, result: resultValue});
    });

};

hPublish.prototype.publishXMPP = function(hMessage, context, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var self = this;
    var msgId = Math.floor(Math.random()*100000000001);

    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: context.jid,

        //Because our jid is well formatted there is no risk doing this
        to: 'pubsub.' + context.jid.replace(/\w+\./,''),
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.chid})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));

    this.on('stanza', function(stanza){
        if(stanza.attrs.id == msgId){
            cb();
            self.removeAllListeners('stanza');
        }
    });
    this.emit('send', msg);
};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

/**
 * Create an instance of hPublish and expose it
 */
var hCommand = new hPublish();
exports.Command = hCommand;