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
 * This file contains method to validate Hubiquitus data models. They check
 * the basic attributes that each structure needs to have.
 */

var codes = require('./codes.js').hResultStatus;


/**
 * Check if a hChannel has all the needed attributes before storing it.
 * @param hChannel - The hChannel to validate
 * @param cb - Function (err, msg) where error is a constant from hResultStatus
 */
exports.validateHChannel = function(hChannel, cb){
    var i;
    var required = ['_id', 'host', 'owner', 'participants', 'active'];

    //Test if object exists
    if( !(hChannel instanceof Object) )
        return cb(codes.INVALID_ATTR, 'invalid object received');


    //Test required attributes
    for(i = 0; i < required.length; i++)
        if(hChannel[required[i]] == null || hChannel[required[i]] == undefined)
            return cb(codes.MISSING_ATTR, 'missing attribute ' + required[i]);


    //Test if correct format/ correct values
    if(typeof hChannel._id != 'string')
        return cb(codes.INVALID_ATTR, 'chid not a string');

    if(hChannel._id == '')
        return cb(codes.INVALID_ATTR, 'chid is empty');

    if(/(system\.indexes|^h)/.test(hChannel._id))
        return cb(codes.INVALID_ATTR, 'using reserved keyword as chid');

    if(hChannel.chdesc && typeof hChannel.chdesc != 'string')
        return cb(codes.INVALID_ATTR, 'chdesc is not a string');

    if(typeof hChannel.priority !== 'undefined'){
        if(typeof hChannel.priority !== 'number')
            return cb(codes.INVALID_ATTR, 'priority not a number');

        if(hChannel.priority < 0 || hChannel.priority > 5)
            return cb(codes.INVALID_ATTR, 'priority is has not a valid value');
    }

    if(typeof hChannel.location !== 'undefined' && !(hChannel.location instanceof Object))
        return cb(codes.INVALID_ATTR, 'location not an object');

    if(hChannel.host == '')
        return cb(codes.INVALID_ATTR, 'host is empty');

    if(typeof hChannel.owner != 'string')
        return cb(codes.INVALID_ATTR, 'owner is not a string');

    if(!/^\w+@\w(\w|\.)*$/.test(hChannel.owner))
        return cb(codes.INVALID_ATTR, 'owner is not a bare jid');

    if( !(hChannel.participants instanceof Array))
        return cb(codes.INVALID_ATTR, 'participants is not an array');

    for(i = 0; i < hChannel.participants.length; i++)
        if(!/^\w+@\w(\w|\.)*$/.test(hChannel.participants[i]))
            return cb(codes.INVALID_ATTR, 'participant ' + i + ' is not a JID');

    if(typeof hChannel.active !== 'boolean')
        return cb(codes.INVALID_ATTR, 'active is not a boolean');

    if(typeof hChannel.headers !== 'undefined'){
        if( !(hChannel.headers instanceof Array))
            return cb(codes.INVALID_ATTR, 'headers is not an array');

        for(i = 0; i < hChannel.headers.length; i++)
            if( !(hChannel.headers[i] instanceof Object) || typeof hChannel.headers[i].hK != 'string' ||
                typeof hChannel.headers[i].hV != 'string')
                return cb(codes.INVALID_ATTR, 'header ' + i + ' is not an hHeader');
    }

    return cb();
};
