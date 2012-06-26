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
 * validators are functions(doc, cb). They will be executed asynchronously and they should return cb() if correct or
 * cb(<hResult.status>, <msg>) if there  was an error
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

var codes = require('./codes.js');
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
    if( this.status == codes.mongoCodes.CONNECTED ){
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
                    self.status = codes.mongoCodes.CONNECTED;
                    self.emit('connect');
                });

            } else //Error opening database
                self.emit('error', {
                    code: codes.mongoCodes.TECH_ERROR,
                    msg: 'could not open database'
                });
        });

    } else //Invalid URI
        this.emit('error', {
            code: codes.mongoCodes.INVALID_URI,
            msg: 'the URI ' + uri + ' is invalid'
        });
};

/**
 * Disconnects from the database. When finishes emits the event 'disconnect'
 * If there is no connection it will automatically emit the event disconnect
 */
Db.prototype.disconnect = function(){

    if( this.status == codes.mongoCodes.CONNECTED ){
        var self = this;
        this.db.close(true, function(){
            self.status = codes.mongoCodes.DISCONNECTED;
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
    var validators = require('./validators.js');

    this.collections.hChannels.validators.push(validators.validateHChannel);

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
 * Saves an object to a collection.
 * @param collection a db recovered collection (db.collection())
 * @param doc the document to save
 * @param options [Optional] options object{
 *  virtual: <collection> //The collection to use for onSavers (useful for hMessages)
 * }
 * @param cb [Optional] the Callback to pass the error/result
 * @private
 */
Db.prototype._saver = function(collection, doc, options, cb){
    //Allow not to specify options and pass a callback directly
    if(typeof options === 'function'){ cb = options; options = {}; }
    else if (!options) options = {};

    var callback = function(err, result){
        //If it is treated as an update, use the original saved doc
        var savedElem = typeof result === 'number' ? doc : result;
        var onSave = options.virtual ? options.virtual.onSave : collection.onSave;

        if(!err){
            log.debug('Correctly saved to mongodb', result);
            for(var i = 0; i < onSave.length; i++)
                onSave[i](savedElem);

            return typeof cb === 'function' ? cb(err, savedElem) : null;

        } else{
            log.debug('Error saving in mongodb', err);
            return typeof cb === 'function' ? cb(codes.hResultStatus.TECH_ERROR, JSON.stringify(err)) : null;
        }
    };

    collection.save(doc, {safe: true}, callback);
};

/**
 * Updates an object from a collection (useful when using $push, $pull, etc)
 * @param collection a db recovered collection (db.collection())
 * @param selector object that selects the document to update
 * @param doc object following mongodb-native conventions with attributes to update
 * @param options [Optional] options object{
 *  virtual: <collection> //The collection to use for onSavers (useful for hMessages)
 * }
 * @param cb [Optional] the Callback to pass the error/result
 * @private
 */
Db.prototype._updater = function(collection, selector, doc, options, cb){
    //Allow not to specify options and pass a callback directly
    if(typeof options === 'function'){ cb = options; options = {}; }
    else if (!options) options = {};

    var callback = function(err, result){
        //If it is treated as an update, use the original saved doc
        var savedElem = typeof result === 'number' ? doc : result;
        var onSave = options.virtual ? options.virtual.onSave : collection.onSave;

        if(!err){
            log.debug('Correctly updated document from mongodb', result);
            for(var i = 0; i < onSave.length; i++)
                onSave[i](savedElem);

            return typeof cb === 'function' ? cb(err, savedElem) : null;

        } else{
            log.debug('Error updating document in mongodb', err);

            return typeof cb === 'function' ? cb(codes.hResultStatus.TECH_ERROR, JSON.stringify(err)) : null;
        }
    };

    options.safe = true;
    collection.update(selector, doc, options, callback);
};

/**
 * Tests the validators for a document
 * @param doc - The document to validate
 * @param validators - Array of validator functions to execute
 * @param cb - Callback (err, msg) with error being a constant from hResult.status
 * @private
 */
Db.prototype._testValidators = function(doc, validators, cb){
    var counter = 0,
        first = true;

    //In case we don't validate anything
    if(validators.length == 0)
        cb();

    for(var i = 0; i < validators.length; i++)
        validators[i](doc, function(err, msg){
            if(err && first){
                first = false;
                return cb(err, msg);
            }
            else if(++counter == validators.length)
                return cb();
        });
};

/**
 * Saves a hChannel to the database. If the channel given has an id existing in the database
 * already it will be updated.
 * @param hChannel - hChannel to create or update
 * @param useValidators - [Optional] Boolean to use or not validators (useful when creating channels as admin).
 * Defaults to true
 * @param cb - [Optional] Callback that receives (err, result)
 */
Db.prototype.saveHChannel = function(hChannel, useValidators, cb){
    if(typeof useValidators === 'function'){ cb = useValidators; useValidators = true}

    var self = this;

    var callback = function(err, msg){
        if(err)
            return typeof cb === 'function' ? cb(err, msg) : null;
        else
            self._saver(self.collections.hChannels, hChannel, cb);
    };

    if(useValidators)
        this._testValidators(hChannel, this.collections.hChannels.validators, callback);
    else
        callback();
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
    //Use 'virtual' hMessages collection to test requirements. But when saving use real collection
    this._saver(this.get(hMessage.chid), hMessage, {virtual: this.get('hMessages')}, cb);
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