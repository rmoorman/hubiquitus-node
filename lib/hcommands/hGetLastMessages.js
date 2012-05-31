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
 * Recovers last published messages to a channel. The messages recovered will
 * only be returned if they were not transient.
 * Receives as parameter a chid an an optional quantity of messages to recover,
 * if this quantity is not specified the default value from the channel will be
 * tried and if not the default value of the command.
 */
var status = require('../codes.js').hResultStatus;

var hGetLastMessages = function(){
    //Default max quantity of messages to be returned. This will be used
    //If a max quantity is not specified and if there is not a default value for the channel
    this.quant = 10;
};

/**
 * Method executed each time an hCommand with cmd = 'hGetLastMessages' is received.
 * Once the execution finishes we should call the callback.
 * @param hCommand - hCommand received with cmd = 'hGetLastMessages'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: [hMessage]
 */
hGetLastMessages.prototype.exec = function(hCommand, context, cb){
    var params = hCommand.params;

    if( !params || typeof params !== 'object'){
        cb(status.INVALID_ATTR, 'invalid params object received');
        return;
    }

    //Test for missing chid
    if( !params.chid ){
        cb(status.MISSING_ATTR, 'command missing chid');
        return;
    }

    var sender = hCommand.sender.replace(/\/.*/, '');
    var chid = params.chid;
    var quant = this.quant;

    var channel = context.cache.hChannels[chid];

    if(channel && channel.participants.indexOf(sender) > -1){

        var it = 0;
        while(it < channel.headers.length && channel.headers[it].hKey != 'maxMsgRetrieval') it++;

        if(channel.headers[it])
            quant = params.quant || channel.headers[it].hValue || quant; //In case header mal format

        context.models.hMessage.where('chid', chid)
            .desc('published')
            .limit(quant)
            .run(function(err, docs){
                var messages = [];

                if(!err){
                    docs.forEach(function(hMessage){
                        hMessage._id = undefined;
                        messages.push(hMessage);
                    });
                    cb(status.OK, messages);
                }else {
                    cb(status.TECH_ERROR, JSON.stringify(err));
                }
            });

    }else{
        cb(status.NOT_AUTHORIZED, 'not authorized to retrieve messages from "'+ chid);
    }

};

exports.Command = hGetLastMessages;