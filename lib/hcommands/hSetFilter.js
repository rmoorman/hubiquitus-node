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
var db = require('../mongo.js').db;
var validator = require('../validators.js');

var hSetFilter = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hSetFilter' is received.
 * Once the execution finishes we should call the callback.
 * @param hCommand - hCommand received with cmd = 'hSetFilter'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 */
hSetFilter.prototype.exec = function(hCommand, context, cb){
    this.validateCommand(hCommand, context, function(err, result){
        if(err)
            return cb(err, result);

        var cmd = hCommand.params;

        //If everything passes, just set the filter
        //If the filter did not exist, add it to the ordered list where they must be executed
        if(!context.filters[cmd.name])
            context.filtersOrder.push(cmd.name);

        context.filters[cmd.name] = cmd;

        cb(status.OK);
    })
};

hSetFilter.prototype.validateCommand = function(hCommand, context, cb){

    var cmd = hCommand.params;

    if( !cmd || !(cmd instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params for the command');

    if( !cmd.chid )
        return  cb(status.MISSING_ATTR, 'missing chid');

    if( !cmd.name )
        return cb(status.MISSING_ATTR, 'missing name attribute');

    var channel = db.cache.hChannels[cmd.chid];

    if( !channel )
        return  cb(status.NOT_AVAILABLE, 'chid not found');

    if( !channel.active )
        return cb(status.NOT_AUTHORIZED, 'the selected channel is inactive');

    if( channel.participants.indexOf(validator.getBareJID(hCommand.sender)) < 0 )
        return cb(status.NOT_AUTHORIZED, 'error adding filter with this credentials');

    if( cmd.template && cmd.template.relevance )
        return cb(status.INVALID_ATTR, 'exact matching not supported for relevance');

    if( cmd.template && cmd.template.published )
        return cb(status.INVALID_ATTR, 'exact matching for published attribute not support');

    if( cmd.template && cmd.template.transient )
        return cb(status.INVALID_ATTR, 'exact matching for transient attribute not support');

    if( cmd.radius &&
        (!cmd.template || !cmd.template.location || !cmd.template.location.lat || !cmd.template.location.lng) )
        return cb(status.MISSING_ATTR, 'radius was specified, but lat or lng coordinates were not');

    if( !cmd.radius && cmd.template && cmd.template.location && (cmd.template.location.lat || cmd.template.location.lng) )
        return cb(status.INVALID_ATTR, 'lat or lng coordinates were specified but no radius');

    if( cmd.template && cmd.template.headers && !(cmd.template.headers instanceof Object) )
        return cb(status.INVALID_ATTR, 'headers in template is not an object');

    cb();
};

exports.Command = hSetFilter;