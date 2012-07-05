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
 * @param hCommand - hCommand received with cmd = 'hGetThread'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An [] of hMessages
 */
hGetThread.prototype.exec = function(hCommand, context, cb){
    this.checkValidity(hCommand, context, function(err, result){
        if(!err){
            var hMessages = [];
            var chid = hCommand.params.chid;
            var convid = hCommand.params.convid;

            //For legacy purposes, if chid does not contain # or @domain, include them
            chid = /^[^#].*/.test(chid) ? '#' + chid : chid;
            chid += /@/.test(chid) ? '' : '@' + validator.getDomainJID(hCommand.sender);

            var stream = db.get(chid).find({convid: convid}).sort({published: 1}).skip(0).stream();

            var firstElement = true;

            stream.on("data", function(hMessage) {
                hMessage.chid = chid;
                hMessage.msgid = hMessage._id;
                delete hMessage._id;

                if(firstElement && !context.hClient.filterMessage(hMessage))
                    stream.destroy();

                firstElement = false;

                hMessages.push(hMessage);
            });

            stream.on("close", function(){
                cb(status.OK, hMessages);
            });

        } else
            return cb(err, result);
    });
};

hGetThread.prototype.checkValidity = function(hCommand, context, cb){
    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params object received');

    var chid = hCommand.params.chid;
    var convid = hCommand.params.convid;

    if(!chid)
        return cb(status.MISSING_ATTR, 'missing chid');

    if(!convid)
        return cb(status.MISSING_ATTR, 'missing convid');

    if(typeof chid != 'string')
        return cb(status.INVALID_ATTR, 'chid is not a string');

    if(typeof convid != 'string')
        return cb(status.INVALID_ATTR, 'convid is not a string');

    //For legacy purposes, if chid does not contain # or @domain, include them
    chid = /^[^#].*/.test(chid) ? '#' + chid : chid;
    chid += /@/.test(chid) ? '' : '@' + validator.getDomainJID(hCommand.sender);

    var hChannel = db.cache.hChannels[chid];

    if(!hChannel)
        return cb(status.NOT_AVAILABLE, 'the channel ' + chid + ' does not exist');

    if(!hChannel.active)
        return cb(status.NOT_AUTHORIZED, 'the channel ' + chid + 'is inactive');

    if(hChannel.participants.indexOf(validator.getBareJID(hCommand.sender)) < 0)
        return cb(status.NOT_AUTHORIZED, 'the sender is not in the channel participants list');

    cb();
};

exports.Command = hGetThread;