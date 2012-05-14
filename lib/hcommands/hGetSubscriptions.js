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

    context.models.user.findOne({jid: hCommand.sender}, function(err, doc){
        if(!err){
            log.info('Subscriptions for', hCommand.sender, 'recovered successfully');
            var subscriptions = doc && doc.subs ? doc.subs : [];
            self.emit('result', {hCommand: hCommand, status: status.OK, result: subscriptions});
        }else{
            var errMsg = JSON.stringify(err);
            log.info('Error retrieving subscriptions', errMsg);
            self.emit('result', {hCommand: hCommand, status: status.TECH_ERROR, result: errMsg});
        }
    });
};

/**
 * Create an instance of hGetSubscriptions and expose it
 */
var hCommand = new hGetSubscriptions();
exports.Command = hCommand;