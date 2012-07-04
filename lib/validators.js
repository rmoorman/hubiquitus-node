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

    if(!exports.validateJID(hChannel.owner))
        return cb(codes.INVALID_ATTR, 'owner is not a string');

    if(exports.splitJID(hChannel.owner)[2])
        return cb(codes.INVALID_ATTR, 'owner is not a bare jid');

    if( !(hChannel.participants instanceof Array))
        return cb(codes.INVALID_ATTR, 'participants is not an array');

    for(i = 0; i < hChannel.participants.length; i++)
        if(!exports.validateJID(hChannel.participants[i]) || exports.splitJID(hChannel.participants[i])[2])
            return cb(codes.INVALID_ATTR, 'participant ' + i + ' is not a JID');

    if(typeof hChannel.active !== 'boolean')
        return cb(codes.INVALID_ATTR, 'active is not a boolean');

    if(typeof hChannel.headers !== 'undefined' && !(hChannel.headers instanceof Object))
        return cb(codes.INVALID_ATTR, 'invalid headers object received');

    return cb();
};

/**
 * Checks if an hMessage is correctly formatted and has all the correct attributes
 * @param hMessage - hMessage to validate
 * @param cb - Function (err, result) where err is from hResult.status or nothing and
 * result is a string or nothing
 */
exports.validateHMessage = function(hMessage, cb){
    var db = require('./mongo.js').db;

    if( !hMessage || typeof hMessage !== 'object')
        return cb(codes.MISSING_ATTR, 'invalid params object received');

    //Test for missing chid
    if( !hMessage.chid )
        return cb(codes.MISSING_ATTR, 'hMessage missing chid');

    if( typeof hMessage.chid != 'string')
        return cb(codes.INVALID_ATTR, 'hMessage chid is not a string');

    if( hMessage.type && typeof hMessage.type != 'string')
        return cb(codes.INVALID_ATTR, 'hMessage type is not a string');

    if( hMessage.priority ){
        if(typeof hMessage.priority != 'number')
            return cb(codes.INVALID_ATTR, 'hMessage priority is not a number');

        if(hMessage.priority > 5 || hMessage.priority < 0)
            return cb(codes.INVALID_ATTR, 'hMessage priority is not a valid constant');
    }

    if( hMessage.relevance ){
        hMessage.relevance = new Date(hMessage.relevance); //Sent as a string, convert back to date

        if(hMessage.relevance == 'Invalid Date')
            return cb(codes.INVALID_ATTR, 'hMessage relevance is specified and is not a valid date object');
    }

    if( hMessage.transient && typeof hMessage.transient !== 'boolean')
        return cb(codes.INVALID_ATTR, 'hMessage transient is not a boolean');

    if( hMessage.location && !(hMessage.location instanceof Object) )
        return cb(codes.INVALID_ATTR, 'hMessage location is not an Object');

    if( hMessage.author && !exports.validateJID(hMessage.author) )
        return cb(codes.INVALID_ATTR, 'hMessage author is not a JID');

    if( !hMessage.publisher )
        return cb(codes.MISSING_ATTR, 'hMessage missing publisher');

    if( hMessage.published ){
        hMessage.published = new Date(hMessage.published); //Sent as a string, convert back to date

        if(hMessage.published == 'Invalid Date')
            return cb(codes.INVALID_ATTR, 'hMessage published is specified and is not a valid date object');
    }

    if(typeof hMessage.headers !== 'undefined' && !(hMessage.headers instanceof Object))
        return cb(codes.INVALID_ATTR, 'invalid headers object received');

    if(hMessage.headers){
        if(hMessage.headers.RELEVANCE_OFFSET && typeof hMessage.headers.RELEVANCE_OFFSET !== 'number')
            return cb(codes.INVALID_ATTR, 'invalid RELEVANCE_OFFSET header received');

        if(hMessage.headers.MAX_MSG_RETRIEVAL && typeof hMessage.headers.MAX_MSG_RETRIEVAL !== 'number')
            return cb(codes.INVALID_ATTR, 'invalid MAX_MSG_RETRIEVAL header received');
    }

    var channel = db.cache.hChannels[hMessage.chid];

    if(!channel)
        return cb(codes.NOT_AVAILABLE, 'the channel does not exist');

    if(channel.participants.indexOf(hMessage.publisher.replace(/\/.*/,'')) < 0)
        return cb(codes.NOT_AUTHORIZED, 'error publishing to channel with current credentials');

    if(channel.active == false)
        return cb(codes.NOT_AUTHORIZED, 'the channel is inactive');

    cb();
};

/**
 * Removes attributes that are objects and do not have any attributes inside (removes empty objects).
 * It also removes attributes that are strings and that are empty (ie. "")
 * @param obj - Object that has the object attributes
 * @param attrs - Array with the names of the attributes that must be deleted from obj if empty.
 */
exports.cleanEmptyAttrs = function(obj, attrs){
    var found;
    for(var i = 0; i < attrs.length; i++){
        found = false;

        // Search if object has attributes
        if(obj[attrs[i]] instanceof Object){
            for(var attr in obj[attrs[i]])
                if(obj[attrs[i]].hasOwnProperty(attr))
                    found = true;

        } else if( typeof obj[attrs[i]] === 'string' && obj[attrs[i]] != '')
            found = true;

        if(!found)
            delete obj[attrs[i]];
    }

    return obj; //Make it chainable
};

/**
 * Returns true or false if it is a valid JID following hubiquitus standards
 * @param jid - the jid string to validate
 */
exports.validateJID = function(jid){
    return new RegExp("^(?:([^@/<>'\"]+)@)([^@/<>'\"]+)(?:/([^/<>'\"]*))?$").test(jid);
};

/**
 * Splits a VALID JID in three parts: (user)(domain)(resource), the third part can be empty
 * @param jid - JID to split
 */
exports.splitJID = function(jid){
    return typeof jid === 'string' ?
        jid.match(new RegExp("^(?:([^@/<>'\"]+)@)([^@/<>'\"]+)(?:/([^/<>'\"]*))?$")).splice(1, 3) : null;
};

exports.getBareJID = function(jid){
    var jidParts = exports.splitJID(jid);
    return jidParts[0] + '@' + jidParts[1];
};

/**
 * Compares two JIDs. Can use modifiers to ignore certain parts
 * @param jid1 - First JID to compare
 * @param jid2 - Second JID
 * @param mod - String with modifiers. Accepted:
 *  r: considers resource
 * @return {Boolean} true if equal.
 */
exports.compareJIDs = function(jid1, jid2, mod){
    if(!exports.validateJID(jid1) || !exports.validateJID(jid2))
        return false;

    var j1 = exports.splitJID(jid1);
    var j2 = exports.splitJID(jid2);

    if(!j1 || !j2)
        return false;

    if(/r/.test(mod))
        return j1[0] == j2[0] && j1[1] == j2[1] && j1[2] == j2[2];
    else
        return j1[0] == j2[0] && j1[1] == j2[1];
};
