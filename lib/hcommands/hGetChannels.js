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

var hGetChannels = function(){
    events.call(this);
};
util.inherits(hGetChannels, events);

/**
 * Method executed each time an hCommand with cmd = 'hGetChannels' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hGetChannels'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hGetChannels.prototype.exec = function(hCommand, context){
    var self = this;

    //Recover list of all the channels
    //The filter of mongoose does not work because some fields are left (id, and others)
    context.models.hChannel.find({}, function(err, docs){
        var channels = [];
        var channel;
        if(!err){
            docs.forEach(function(doc){
                channel = {
                    active : doc.active,
                    chid : doc.chid,
                    chdesc : doc.chdesc,
                    owner : doc.owner,
                    host : doc.host,
                    headers : doc.headers,
                    participants : doc.participants,
                    location : doc.location,
                    priority : doc.priority
                };
                channels.push(channel);

            });

            self.emit('result', {hCommand: hCommand, result: channels, status: status.OK});

        }else {
            self.emit('result', {hCommand: hCommand, status: status.TECH_ERROR,
                result: JSON.stringify(err)});
        }
    });
};


/**
 * Create an instance of hGetChannels and expose it
 */
var hCommand = new hGetChannels();
exports.Command = hCommand;