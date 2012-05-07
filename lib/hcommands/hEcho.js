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
 * hEcho receives an hCommand and responds with a result
 * with the same <params> that were in the hCommand.
 */
var status = require('../codes.js').hResultStatus;

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hEcho = function(){
    events.call(this);
};
util.inherits(hEcho, events);

/**
 * Method executed each time an hCommand with cmd = 'hEcho' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hEcho'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hEcho.prototype.exec = function(hCommand, context){
    this.emit('result', {hCommand: hCommand, status: status.OK, result: hCommand.params});
};

/**
 * Create an instance of hEcho and expose it
 */
var hCommand = new hEcho();
exports.Command = hCommand;