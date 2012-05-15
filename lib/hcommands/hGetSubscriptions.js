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
 * Searches for the subscriptions of the <Sender> to channels that are
 * currently active.
 */

var status = require('../codes.js').hResultStatus;

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hGetSubscriptions = function(){
    events.call(this);
};
util.inherits(hGetSubscriptions, events);

/**
 * Method executed each time an hCommand with cmd = 'hGetSubscriptions' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hGetSubscriptions'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hGetSubscriptions.prototype.exec = function(hCommand, context){
    var self = this;
    var resultValue = null;
    var statusValue = null;

    context.models.user.findOne({jid: hCommand.sender}, function(err, doc){
        if(!err){
            log.info('Subscriptions for', hCommand.sender, 'recovered successfully');
            var subscriptions = doc && doc.subs ? doc.subs : [];

            //Only return active channels
            if(subscriptions.length > 0){

                var channelsRegEx = '';
                for(var i = 0; i < subscriptions.length -1; i++)
                    channelsRegEx += subscriptions[i] + '|';
                channelsRegEx += subscriptions[subscriptions.length -1];

                context.models.hChannel.find({chid: new RegExp(channelsRegEx), active: 'Y'}, function(err, docs){
                    if(!err){
                        resultValue = [];
                        statusValue = status.OK;
                        docs.forEach(function(doc){ resultValue.push(doc.chid)});

                    } else{
                        statusValue = status.TECH_ERROR;
                        resultValue = JSON.stringify(err);
                    }

                    log.info('Finished retrieving subscriptions with status', statusValue, resultValue);
                    self.emit('result', {hCommand: hCommand, status: statusValue, result: resultValue});

                });
            }

        }else{
            resultValue = JSON.stringify(err);
            statusValue = status.TECH_ERROR;
        }

        statusValue = statusValue || status.OK;
        resultValue = resultValue || subscriptions;

        log.info('Finished retrieving subscriptions with status', statusValue, resultValue);
        self.emit('result', {hCommand: hCommand, status: statusValue, result: resultValue});
    });
};

/**
 * Create an instance of hGetSubscriptions and expose it
 */
var hCommand = new hGetSubscriptions();
exports.Command = hCommand;