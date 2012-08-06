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

var hEcho = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hEcho' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage with hCommand received with cmd = 'hEcho'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 */
hEcho.prototype.exec = function(hMessage, context, cb){
    cb(status.OK, hMessage.cmd.params);
};

/**
 * Expose hEcho
 */
exports.Command = hEcho;