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
 * @param hCommand - hCommand received with cmd = 'hRelevantMessages'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //Array of relevant hMessages
 */
hRelevantMessages.prototype.exec = function(hCommand, context, cb){

    this.validateCmd(hCommand, context, function(err, result){
        if(!err){
            var channel = hCommand.params.chid;

            //For legacy purposes, if chid does not contain # or @domain, include them
            channel = /^[^#].*/.test(channel) ? '#' + channel : channel;
            channel += /@/.test(channel) ? '' : '@' + validator.getDomainJID(hCommand.sender);

            var hMessages = [];
            var stream = db.get(channel)
                .find({relevance: {$gte: new Date()}}).sort({published:-1}).skip(0).stream();

            stream.on("data", function(hMessage) {
                hMessage.chid = channel;
                hMessage.msgid = hMessage._id;

                delete hMessage._id;

                hMessage = context.hClient.filterMessage(hMessage);

                if(hMessage)
                    hMessages.push(hMessage);

            });

            stream.on('close', function(){
                cb(status.OK, hMessages);
            });

        }else
            cb(err, result);
    });
};

hRelevantMessages.prototype.validateCmd = function(cmd, context, cb){
    if( !cmd.params || !(cmd.params instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params object received');

    var chid = cmd.params.chid;

    if( !chid )
        return cb(status.MISSING_ATTR, 'missing chid');

    if( typeof chid !== 'string' )
        return cb(status.INVALID_ATTR, 'invalid chid received');

    //For legacy purposes, if chid does not contain # or @domain, include them
    chid = /^[^#].*/.test(chid) ? '#' + chid : chid;
    chid += /@/.test(chid) ? '' : '@' + validator.getDomainJID(cmd.sender);

    var channel = db.cache.hChannels[chid];

    if( !channel )
        return cb(status.NOT_AVAILABLE, 'the channel chid was not found');

    if( !channel.active )
        return cb(status.NOT_AUTHORIZED, 'the channel chid is inactive');

    if(channel.participants.indexOf(validator.getBareJID(cmd.sender)) < 0)
        return cb(status.NOT_AUTHORIZED, 'error recovering messages with current credentials');

    cb();
};

exports.Command = hRelevantMessages;