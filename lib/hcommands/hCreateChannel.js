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

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hCreateChannel = function(){
    events.call(this);
};
util.inherits(hCreateChannel, events);

/**
 * Method executed each time an hCommand with cmd = 'hCreateChan' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hCreateChan'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hCreateChannel.prototype.exec = function(hCommand, context){
    var self = this;
    var channel = hCommand.params;
    var paths = ['chid', 'chdesc', 'priority', 'location',
        'host', 'owner', 'participants', 'active', 'headers'];
    var i, statusValue, result;

    if( !channel || typeof channel !== 'object'){
        self.emit('result', {hCommand: hCommand, status: status.INVALID_ATTR,
            result: 'invalid params object received'});
        return;
    }

    //Set all fields in the instance
    var instance = new context.models.hChannel();
    for(i = 0; i < paths.length; i++)
        if(channel[paths[i]])
            instance[paths[i]] = channel[paths[i]];

    instance.save(function(err){
        if(!err){
            self.createXMPPChannel(hCommand, function(err){
                log.info('Channel', channel.chid, 'Created Successfully');
                self.emit('result', {hCommand: hCommand, status: status.OK});
            });

        } else{
            //Default behaviour
            statusValue = status.TECH_ERROR;
            result = JSON.stringify(err);

            //chid already exists
            if(err.name == 'MongoError' && err.code == 11000 && err.err.match(/chid/i)){
                statusValue = status.INVALID_ATTR;
                result = 'chid already exists';
            }

            //Validation error
            else if(err.name == 'ValidationError'){
                i = 0;
                while(i < paths.length && !err.errors[paths[i]]) i++;
                if(i < paths.length){
                    statusValue = err.errors[paths[i]].type == 'required' ? status.MISSING_ATTR : status.INVALID_ATTR;
                    result = err.errors[paths[i]].message;
                }
            }

            log.info('Error Creating Channel, Status:', status, 'Result:', result);
            self.emit('result', {hCommand: hCommand, status: statusValue, result: result});
        }

    });
};

/**
 * Method used to create a XMPP Channel using options from the hCommand.
 * This method must be called once the validation of the parameters has been made.
 * @param hCommand - hCommand validated
 * @param cb - receives error or nothing.
 */
hCreateChannel.prototype.createXMPPChannel = function(hCommand, cb){
    var self = this;
    var msgId = Math.floor(Math.random()*100000000000000001);

    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: 'hnode.localhost',
        to: 'pubsub.' + 'localhost',
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('create', {node : hCommand.params.chid});

    this.on('stanza', function(stanza){
        if(stanza.is('iq') && stanza.attrs.id == msgId){
            cb();
            self.removeAllListeners('stanza');
        }
    });
    this.emit('send', msg);
};

/**
 * Create an instance of hCreateChannel and expose it
 */
var hCommand = new hCreateChannel();
exports.Command = hCommand;