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

var status = require('../codes.js').hResultStatus;
var xmpp = require('node-xmpp');

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

    //Test sender against publisher (ignore the resource from both of them)
    if( !hCommand.sender.replace(/\/.*/,'') == hMessage.publisher.replace(/\/.*/,'') ){
        cb(status.NOT_AUTHORIZED, 'owner does not match sender');
        return;
    }

    //Test for missing chid
    if( !hMessage.chid ){
        cb(status.MISSING_ATTR, 'hMessage missing chid');
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

                //If not transient store it (If it does not exist it is transient)
                if(hMessage['transient'] === false){

                    instance.save(function(errSave){
                        if(!errSave){
                            self.publishXMPP(hMessage, context, function(err){
                                log.info('Finished publishing to channel');
                                cb(status.OK);
                            })

                        }else{
                            log.info('Error publishing to channel', JSON.stringify(errSave));
                            cb(status.TECH_ERROR, JSON.stringify(errSave));
                        }
                    });


                } else{
                    //Just publish it to XMPP
                    self.publishXMPP(hMessage, context, function(err){
                        log.info('Finished publishing to channel');
                        cb(status.OK);
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
        cb(statusValue, resultValue);
    });

};

hPublish.prototype.publishXMPP = function(hMessage, context, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var attrs = {
        type: 'set',

        //Because our jid is well formatted there is no risk doing this
        to: 'pubsub.' + context.jid.replace(/\w+\./,'')
    };

    var content = new xmpp.Element('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.chid})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));

    context.sendIQ(attrs, content, function(stanza){
        cb();
    });

};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.Command = hPublish;