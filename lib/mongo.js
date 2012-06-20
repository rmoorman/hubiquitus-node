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
 * Mongo Abstraction Layer. This allows access to the different collections
 * that are managed in hubiquitus giving the user some convenience methods
 * to create and recover models.
 *
 * To retrieve data from a collection use db.get(collectionName).find() //See mongodb-native for advanced commands
 *
 * To add validators that will be executed when an element has to be updated/saved:
 * db.get(collectionName).validators.push(validator);
 * validators are functions with doc as 'this' and that must return null if they pass or {code: mongoCodes, msg: <MSG>}
 * if they do not.
 *
 * To simply force a value to be required add:
 * db.get(collectionName).required[Key] = true;
 *
 * You can add functions that will be executed when an update/save is successful using:
 * db.get(collectionName).onSave = [function(result),...]
 *
 * There is a special collection called 'hMessages'. This collection is virtual, meaning that is used to add
 * validators/ force mandatory attributes for all hMessages but the collection does not exist physically. Each hMessage
 * is saved in a collection named after the channel where it was published.
 */

var mongo = require('mongodb'),
    log = require('winston');

var codes = require('./codes.js').mongoCodes;
//Events
var util = require('util'),
    events = require('events').EventEmitter;

var Db = function(){
    this.db = null;
    this.server = null;
    this.status = codes.DISCONNECTED;

    // static Collections that are created at startup
    this._staticCol = ['hCommands', 'hResults', 'hSubscriptions', 'hChannels'];
    this.collections = {};

    //Caches
    this.cache = {
        hChannels: {}
    };

    events.call(this);
};
util.inherits(Db, events);

/**
 * Connects to a server and then gives access to the database. Once
 * connected emits the event 'connect'. If already connected to a database
 * it will just emit the event.
 * @param uri - address of the database in the form: mongodb://<host>[:port]/<db>
 * @param opts - [Optional] options object as defined in http://mongodb.github.com/node-mongodb-native/api-generated/server.html
 */
Db.prototype.connect = function(uri, opts){
    var self = this;

    //Already connected
    if( this.status == codes.CONNECTED ){
        this.emit('connect');
        return;
    }

    //Create regex to parse/test URI
    var matches = /^mongodb:\/\/(\w+)(:(\d+)|)\/(\w+)$/.exec(uri);

    //Test URI
    if(matches != null){
        //Parse URI
        var host = matches[1],
            port = parseInt(matches[3]) || 27017,
            dbName = matches[4];

        //Create the Server and the DB to access mongo
        this.server = new mongo.Server(host, port, opts);
        this.db = new mongo.Db(dbName, this.server);

        //Connect to Mongo
        this.db.open(function(err, db){

            if(!err){

                //load static collections
                for(var i = 0; i < self._staticCol.length; i++){
                    self.collections[self._staticCol[i]] = db.collection(self._staticCol[i]);
                    self.collections[self._staticCol[i]].required = {};
                    self.collections[self._staticCol[i]].validators = [];
                    self.collections[self._staticCol[i]].onSave = [];
                }

                //Init validators for collections and tell everyone that we are ready to go
                self._initDefaultCollections(function(){
                    self.status = codes.CONNECTED;
                    self.emit('connect');
                });

            } else //Error opening database
                self.emit('error', {
                    code: codes.TECH_ERROR,
                    msg: 'could not open database'
                });
        });

    } else //Invalid URI
        this.emit('error', {
            code: codes.INVALID_URI,
            msg: 'the URI ' + uri + ' is invalid'
        });
};

/**
 * Disconnects from the database. When finishes emits the event 'disconnect'
 * If there is no connection it will automatically emit the event disconnect
 */
Db.prototype.disconnect = function(){

    if( this.status == codes.CONNECTED ){
        var self = this;
        this.db.close(true, function(){
            self.status = codes.DISCONNECTED;
            self.emit('disconnect');
        });

    }else //Not Connected
        this.emit('disconnect');
};

/**
 * Initializes static hubiquitus collections
 * @param cb - When initialization is finished the callback will be called.
 * @private
 */
Db.prototype._initDefaultCollections = function(cb){
    this.collections.hChannels.required = {
        _id: true,
        host: true,
        owner: true,
        participants: true,
        active: true
    };


    this.collections.hChannels.validators.push(function(){
        if(typeof this._id != 'string')
            return {code: codes.INVALID_ATTR, msg: 'chid not a string'};

        if(this._id == '')
            return {code: codes.INVALID_ATTR, msg: 'chid is empty'};

        if(/(system\.indexes|^h)/.test(this._id))
            return {code: codes.INVALID_ATTR, msg: 'using reserved keyword as chid'};

        if(this.chdesc && typeof this.chdesc != 'string')
            return {code: codes.INVALID_ATTR, msg: 'chdesc is not a string'};

        if(typeof this.priority !== 'undefined'){
            if(typeof this.priority !== 'number')
                return {code: codes.INVALID_ATTR, msg: 'priority not a number'};

            if(this.priority < 0 || this.priority > 4)
                return {code: codes.INVALID_ATTR, msg: 'priority is has not a valid value'};
        }

        if(typeof this.location !== 'undefined' && !(this.location instanceof Object))
            return {code: codes.INVALID_ATTR, msg: 'location not an object'};

        if(this.host == '')
            return {code: codes.INVALID_ATTR, msg: 'host is empty'};

        if(typeof this.owner != 'string')
            return {code: codes.INVALID_ATTR, msg: 'owner is not a string'};

        if(!/^\w+@\w(\w|\.)*$/.test(this.owner))
            return {code: codes.INVALID_ATTR, msg: 'owner is not a bare jid'};

        if( !(this.participants instanceof Array))
            return {code: codes.INVALID_ATTR, msg: 'participants is not an array'};

        for(var i = 0; i < this.participants.length; i++)
            if(!/^\w+@\w(\w|\.)*$/.test(this.participants[i]))
                return {code: codes.INVALID_ATTR, msg: 'participant ' + i + ' is not a JID'};

        if(typeof this.active !== 'boolean')
            return {code: codes.INVALID_ATTR, msg: 'active is not a boolean'};

        if(typeof this.headers !== 'undefined'){
            if( !(this.headers instanceof Array))
                return {code: codes.INVALID_ATTR, msg: 'headers is not an array'};

            for(var i = 0; i < this.headers.length; i++)
                if( !(this.headers[i] instanceof Object) || typeof this.headers[i].hK != 'string' ||
                    typeof this.headers[i].hV != 'string')
                    return {code: codes.INVALID_ATTR, msg: 'header ' + i + ' is not an hHeader'};
        }
    });

    //Ensure there is an index for hChannel _id
//    this.collections.hChannels.ensureIndex('_id', {unique: true});

    //Set up cache invalidation
    var self = this;
    this.collections.hChannels.onSave = [function(doc){
        self.cache.hChannels[doc._id] = doc;
    }];

    //Symbolically create hMessages
    this.get('hMessages');

    var stream = this.collections.hChannels.find({}).streamRecords();
    stream.on("data", function(hChannel) {
        self.cache.hChannels[hChannel._id] = hChannel;
    });
    stream.on("end", cb);
};

/**
 * Tests whether the doc passes the validators set for the collection.
 * @param collection - The collection that has the validators
 * @param doc - The object to test
 * @return Boolean that checks if passes all validators
 * @private
 */
Db.prototype._testValidators = function(collection, doc){
    var validators = collection.validators;
    var required = collection.required;

    //Test if object exists
    if( !(doc instanceof Object) )
        return {
            code: codes.VALIDATION_ERR,
            msg: 'invalid object received'
        };

    for(var req in required)
        if(required[req] === true &&
            (doc[req] == null || doc[req] === undefined))
            return {
                code: codes.MISSING_ATTR,
                msg: 'missing attribute ' + req };


    var returnCode;
    for(var i = 0; i < validators.length; i++){
        returnCode = validators[i].call(doc);
        if(returnCode)
            return returnCode;
    }

    return null;
};

/**
 * Saves an object to a collection.
 * @param collection a db recovered collection (db.collection())
 * @param doc the document to save
 * @param options [Optional] options object{
 *  colForReq: <collection> //The collection to use for testing requirements/onSavers (useful for hMessages)
 * }
 * @param cb [Optional] the Callback to pass the error/result
 * @private
 */
Db.prototype._saver = function(collection, doc, options, cb){
    //Allow not to specify options and pass a callback directly
    if(typeof options === 'function'){ cb = options; options = {}; }
    else if (!options) options = {};


    var colForReq = options.colForReq || collection;

    var callback = function(err, result){
        //If it is treated as an update, use the original saved doc
        var savedElem = typeof result === 'number' ? doc : result;
        var onSave = colForReq.onSave;

        if(!err && onSave instanceof Array)
            for(var i = 0; i < onSave.length; i++)
                onSave[i](savedElem);

        if(err)
            log.debug('Error saving in mongodb', err);
        else
            log.debug('Correctly saved to mongodb', result);

        return cb ? cb(err, err ? result : savedElem) : null;
    };

    var validationFail = this._testValidators(colForReq, doc);
    if(!validationFail)
        collection.save(doc, {safe: true}, callback);
    else
        callback(validationFail, doc);
};

/**
 * Saves a hChannel to the database. If the channel given has an id existing in the database
 * already it will be updated.
 * @param hChannel - hChannel to create or update
 * @param cb - [Optional] Callback that receives (err, result)
 */
Db.prototype.saveHChannel = function(hChannel, cb){
    this._saver(this.collections.hChannels, hChannel, cb);
};

/**
 * Saves a hCommand to the database.
 * @param hCommand hCommand to save.
 * @param cb [Optional] callback to pass the error/result
 */
Db.prototype.saveHCommand = function(hCommand, cb){
    this._saver(this.collections.hCommands, hCommand, cb);
};

/**
 * Saves a hResult to the database.
 * @param hResult hResult to save.
 * @param cb [Optional] callback to pass the error/result
 */
Db.prototype.saveHResult = function(hResult, cb){
    this._saver(this.collections.hResults, hResult, cb);
};

/**
 * Saves a hMessage to the correct collection in the database. The CHID of the hMessage will *not*
 * be checked to see if the channel exists. A collection with the chid given will be created.
 * @param hMessage - hMessage to create in the database
 * @param cb [Optional] Callback that receives (err, result)
 */
Db.prototype.saveHMessage = function(hMessage, cb){

    //Protect against invalid collection name. An empty chid/ hMessage can make everything crash
    if(!hMessage || !hMessage.chid)
        return cb ? cb({
            code: codes.MISSING_ATTR,
            msg: 'missing attribute chid' }, hMessage) : null;

    //Use 'virtual' hMessages collection to test requirements. But when saving use real collection
    this._saver(this.get(hMessage.chid), hMessage, {
        colForReq: this.collections.hMessages
    }, cb);
};

/**
 * This method returns the collection from where it is possible to search and add validators.
 * @param collection - The collection name to recover.
 * @return the collection object.
 */
Db.prototype.get = function(collection){

    //This is needed because hMessages collections are created on the fly.
    if(!this.collections[collection]){
        var col = this.db.collection(collection);
        col.validators = [];
        col.required = {};
        col.onSave = [];
        this.collections[collection] = col;
    }

    return this.collections[collection];
};

/**
 * Creates a valid Primary key that can be used in mongo. The returned value can be considered a UUID
 * @return String - PK that can be used as UUID _id in documents.
 */
Db.prototype.createPk = function(){
    return '' + mongo.ObjectID.createPk();
};

exports.db = new Db();