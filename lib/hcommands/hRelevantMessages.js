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
var db = require('../mongo.js').db;
var validator = require('../validators.js');

var hRelevantMessages = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hRelevantMessages' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hRelevantMessages'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //Array of relevant hMessages
 */
hRelevantMessages.prototype.exec = function(hMessage, context, cb){

    this.validateCmd(hMessage, context, function(err, result){
        if(!err){
            var hCommand = hMessage.payload;
            var channel = hMessage.actor;

            var hMessages = [];
            var stream = db.get(channel)
                .find({relevance: {$gte: new Date()}}).sort({published:-1}).skip(0).stream();

            stream.on("data", function(localhMessage) {
                localhMessage.msgid = localhMessage._id;
                delete hMessage._id;

                if(validator.validateFilter(localhMessage))
                    hMessages.push(localhMessage);
            });

            stream.on('close', function(){
                cb(status.OK, hMessages);
            });

        }else
            cb(err, result);
    });
};

hRelevantMessages.prototype.validateCmd = function(hMessage, context, cb){
    var actor = hMessage.actor;

    if( !actor )
        return cb(status.MISSING_ATTR, 'missing actor');

    if(!validator.isChannel(actor))
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    var channel = db.cache.hChannels[actor];

    if( !channel )
        return cb(status.NOT_AVAILABLE, 'the channel actor was not found');

    if( !channel.active )
        return cb(status.NOT_AUTHORIZED, 'the channel actor is inactive');

    if(channel.subscribers.indexOf(validator.getBareJID(hMessage.publisher)) < 0)
        return cb(status.NOT_AUTHORIZED, 'error recovering messages with current credentials');

    cb();
};

exports.Command = hRelevantMessages;