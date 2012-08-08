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
 * This command can be executed using two different algorithms:
 * 1. A 'linear' algorithm that is mono thread and a little faster if executed in a single environment without shards
 * 2. A 'mapReduce' algorithm that SHOULD be faster in a sharded environment.
 *
 * The default implementation is linear. to change set this.implementation to 'mapReduce' in hGetThreads constructor.
 */

var hResultStatus = require('../codes.js').hResultStatus;
var validator = require('../validators.js');
var db = require('../mongo.js').db;

var hGetThreads = function(){
    this.implementation = 'linear';
};

/**
 * Method executed each time an hCommand with cmd = 'hGetThreads' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetThreads'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An [] of hMessages
 */
hGetThreads.prototype.exec = function(hMessage, context, cb){
    var self = this;
    this.checkValidity(hMessage, function(err, result){
        if(!err){
            var hCommand = hMessage.payload;
            //For legacy purposes, if chid does not contain # or @domain, include them
            hCommand.params.actor = validator.normalizeChannel(hCommand.params.actor, validator.getDomainJID(hMessage.publisher));

            self[self.implementation](hMessage, context, cb);

        }else
            return cb(err, result);
    });
};

hGetThreads.prototype.mapReduce = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var status = hCommand.params.status;
    var actor = hCommand.params.actor;
    var self = this;

    var map = function(){
        emit(this.convid, {
            status: this.payload.status,
            published: this.published
        })
    };

    var reduce = function(k, values){
        var chosenValue = values[0];

        values.forEach(function(value){
            if(chosenValue.published < value.published)
                chosenValue = value;
        });

        return chosenValue;
    };

    db.get(chid).mapReduce(map, reduce, {
        out: {replace : db.createPk()}}, function(err, collection) {

        if(!err){
            var convids = [];
            var stream = collection.find({}).stream();

            stream.on("data", function(elem) {
                if(elem.value.status == status && context.hClient.filterMessage(elem))
                    convids.push(elem._id);
            });

            stream.on("close", function(){
                collection.drop();
                self.filterMessages(actor, convids, context, cb);
            });
        }else
            return cb(hResultStatus.TECH_ERROR, JSON.stringify(err));

    });

};

hGetThreads.prototype.linear = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var status = hCommand.params.status;
    var actor = hCommand.params.actor;
    var self = this;

    var stream = db.get(actor).find({
        type: /hConvState/i
    }).streamRecords();

    var foundElements = {};
    stream.on("data", function(hMessage) {
        if(foundElements[hMessage.convid]){
            if(foundElements[hMessage.convid].published < hMessage.published)
                foundElements[hMessage.convid] = hMessage;
        }else
            foundElements[hMessage.convid] = hMessage;
    });

    stream.on("end", function(){
        var convids = [];

        for(var convid in foundElements)
            if(foundElements.hasOwnProperty(convid) && foundElements[convid].payload.status == status)
                convids.push(convid);

        self.filterMessages(actor, convids, context, cb);
    });
};

hGetThreads.prototype.filterMessages = function(actor, convids, context, cb){
    var filteredConvids = [];
    var regexConvids = '(';

    //If no convids or no filters for the channel, do not access the db
    if( convids.length == 0 || !context.hClient.filtersOrder[actor] || context.hClient.filtersOrder[actor].length == 0)
        return cb(hResultStatus.OK, convids);

    for(var i = 0; i < convids.length; i++)
        regexConvids += convids[i] + '|';

    regexConvids = regexConvids.slice(0, regexConvids.length-1) + ')';

    var stream = db.get(actor).find({_id: new RegExp(regexConvids)}).stream();

    stream.on("data", function(hMessage) {
        if(context.hClient.filterMessage(hMessage))
            filteredConvids.push(hMessage.convid);
    });

    stream.on("close", function(){
        cb(hResultStatus.OK, filteredConvids);
    });

};

hGetThreads.prototype.checkValidity = function(hMessage, cb){
    var hCommand = hMessage;
    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(hResultStatus.INVALID_ATTR, 'invalid params object received');

    var actor = hCommand.params.actor;
    var status = hCommand.params.status;

    if(!actor)
        return cb(hResultStatus.MISSING_ATTR, 'missing actor');

    if(!status)
        return cb(hResultStatus.MISSING_ATTR, 'missing status');

    if(typeof actor != 'string')
        return cb(hResultStatus.INVALID_ATTR, 'actor is not a string');

    if(typeof status != 'string')
        return cb(hResultStatus.INVALID_ATTR, 'status is not a string');

    //For legacy purposes, if chid does not contain # or @domain, include them
    actor = validator.normalizeChannel(actor, validator.getDomainJID(hMessage.publisher));

    var hChannel = db.cache.hChannels[actor];

    if(!hChannel)
        return cb(hResultStatus.NOT_AVAILABLE, 'the channel ' + actor + ' does not exist');

    if(!hChannel.active)
        return cb(hResultStatus.NOT_AUTHORIZED, 'the channel ' + actor + 'is inactive');

    if(hChannel.participants.indexOf(validator.getBareJID(hCommand.publisher)) < 0)
        return cb(hResultStatus.NOT_AUTHORIZED, 'the sender is not in the channel participants list');

    cb();
};

exports.Command = hGetThreads;