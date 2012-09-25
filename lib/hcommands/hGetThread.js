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
var validator = require('../validators.js');
var db = require('../mongo.js').db;

var hGetThread = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hGetThread' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetThread'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An [] of hMessages
 */
hGetThread.prototype.exec = function(hMessage, context, cb){
    this.checkValidity(hMessage, context, function(err, result){
        if(!err){
            var hCommand = hMessage.payload;
            var hMessages = [];
            var actor = hMessage.actor;
            var convid = hCommand.params.convid;

            var stream = db.get(actor).find({convid: convid}).sort({published: 1}).skip(0).stream();

            var firstElement = true;

            stream.on("data", function(localhMessage) {
                localhMessage.actor = actor;
                localhMessage.msgid = localhMessage._id;
                delete localhMessage._id;

                if(firstElement && validator.validateFilter(localhMessage) === false)
                    stream.destroy();

                firstElement = false;

                hMessages.push(localhMessage);
            });

            stream.on("close", function(){
                cb(status.OK, hMessages);
            });

        } else
            return cb(err, result);
    });
};

hGetThread.prototype.checkValidity = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params object received');

    var actor = hMessage.actor;
    var convid = hCommand.params.convid;

    if(!actor)
        return cb(status.MISSING_ATTR, 'missing actor');

    if(!convid)
        return cb(status.MISSING_ATTR, 'missing convid');

    if(!validator.isChannel(actor))
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    if(typeof convid != 'string')
        return cb(status.INVALID_ATTR, 'convid is not a string');

    var hChannel = db.cache.hChannels[actor];

    if(!hChannel)
        return cb(status.NOT_AVAILABLE, 'the channel ' + actor + ' does not exist');

    if(!hChannel.active)
        return cb(status.NOT_AUTHORIZED, 'the channel ' + actor + 'is inactive');

    if(hChannel.subscribers.indexOf(validator.getBareJID(hMessage.publisher)) < 0)
        return cb(status.NOT_AUTHORIZED, 'the sender is not in the channel subscribers list');

    cb();
};

exports.Command = hGetThread;