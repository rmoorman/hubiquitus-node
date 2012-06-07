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

var log = require('winston');

var status = require('../codes.js').hResultStatus;
var db = require('../mongo.js').db;

var hGetSubscriptions = function(){
};

/**
 * Searches for subscriptions of <Sender> to channels that are currently active.
 *
 * @param hCommand - hCommand received with cmd = 'hGetSubscriptions'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: <String[]>
 */
hGetSubscriptions.prototype.exec = function(hCommand, context, cb){
    var resultValue = null;
    var statusValue = null;

    db.models.subscription.findOne({jid: hCommand.sender}, function(err, doc){
        if(!err){
            var subs = doc && doc.subs ? doc.subs : [];
            resultValue = [];

            //Only return active channels
            var hChannels = db.cache.hChannels;
            for(var i = 0; i < subs.length; i++)
                if(hChannels[subs[i]] && hChannels[subs[i]].active)
                    resultValue.push(subs[i]);


        }else{
            resultValue = JSON.stringify(err);
            statusValue = status.TECH_ERROR;
        }

        statusValue = statusValue || status.OK;

        log.info('Finished retrieving subscriptions with status', statusValue, resultValue);
        cb(statusValue, resultValue);
    });
};

exports.Command = hGetSubscriptions;