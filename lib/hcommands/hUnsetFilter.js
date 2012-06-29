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

var hUnsetFilter = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hUnsetFilter' is received.
 * Once the execution finishes we should call the callback.
 * @param hCommand - hCommand received with cmd = 'hUnsetFilter'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 */
hUnsetFilter.prototype.exec = function(hCommand, context, cb){
    this.validateCommand(hCommand, context, function(err, result){
        if(!err){

            var name = hCommand.params.name;
            var chid = hCommand.params.chid;

            //Remove from ordered list
            var filtersOrder = context.hClient.filtersOrder[chid];
            context.hClient.filtersOrder[chid].splice(filtersOrder.indexOf(name, 1));

            //Really remove from the filters
            delete context.hClient.filters[chid][name];

            cb(status.OK);

        }else
            cb(err, result);
    })
};

hUnsetFilter.prototype.validateCommand = function(hCommand, context, cb){

    var cmd = hCommand.params;

    if( !cmd || !(cmd instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params for the command');

    if( !cmd.name )
        return cb(status.MISSING_ATTR, 'missing name attribute');

    if( !cmd.chid )
        return cb(status.MISSING_ATTR, 'missing chid attribute');

    if( !context.hClient.filters[cmd.chid] || !context.hClient.filters[cmd.chid][cmd.name] )
        return cb(status.NOT_AVAILABLE, 'the filter was not found');

    cb();
};

exports.Command = hUnsetFilter;