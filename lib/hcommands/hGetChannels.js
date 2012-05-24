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

var hGetChannels = function(){
};

/**
 * Recovers the channels from the database and returns a list of channels
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hGetChannels'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: hChannels array
 */
hGetChannels.prototype.exec = function(hCommand, context, cb){
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

            cb(status.OK, channels);
        }else {
            cb(status.TECH_ERROR, JSON.stringify(err));
        }
    });
};

exports.Command = hGetChannels;