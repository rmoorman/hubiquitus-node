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
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetSubscriptions'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: <String[]>
 */
hGetSubscriptions.prototype.exec = function(hMessage, context, cb){
    db.get('hSubscriptions').findOne({_id: hMessage.publisher}, function(err, doc){

        var subscriptions = [];
        if(!err){
            var subs = doc && doc.subs ? doc.subs : [];

            //Only return active channels
            for(var i = 0; i < subs.length; i++)
                if(db.cache.hChannels[subs[i]] && db.cache.hChannels[subs[i]].active)
                    subscriptions.push(subs[i]);

            cb(status.OK, subscriptions);

        } else
            cb(status.TECH_ERROR, JSON.stringify(err));
    });

};

exports.Command = hGetSubscriptions;