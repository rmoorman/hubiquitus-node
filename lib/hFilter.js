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

var xmppConnectionConst = require('./server_connectors/xmpp_connection.js').Connection,
    cmdControllerConst = require('./hcommand_controller.js').Controller;

var statuses = require('./codes.js').statuses,
    errors = require('./codes.js').errors;

var codes = require('./codes.js');

var validator = require('./validators.js');

var log = require('winston');
var db = require('./mongo.js').db;


exports.validateFilter = function(hMessage, hCondition){

    var i;
    var filter;
    var actor = hMessage.actor;
    var publisher = hMessage.publisher.replace(/\/.*/, '');
    var validate = false;

    if(validator.isChannel(actor)) {
        filter = db.cache.hChannels[actor].filter
    }
    else
        filter = hCondition;

    if(Object.getOwnPropertyNames(filter).length > 0){
        for(i = 0; i < filter.in.publisher.length; i++){
            if(!validate && filter.in.publisher[i] === publisher){
                validate = true;
            }
        }
    }
    else
        validate = true;

    return validate;
};
