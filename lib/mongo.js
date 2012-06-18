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
 * db.collections[collectionName].validators.push(validator);
 * validators are functions with doc as 'this' and that must return true if the validation is ok, or false otherwise
 *
 * To simply force a value to be required add:
 * db.collections[collectionName].required[Key] = true;
 *
 * You can add functions that will be executed when an update/save is successful using:
 * db.collections[collectionName].onSave = [function(result),...]
 *
 * There is a special collection called 'hMessages'. This collection is virtual, meaning that is used to add
 * validators/ force mandatory attributes for all hMessages but the collection does not exist physically. Each hMessage
 * is saved in a collection named after the channel where it was published.
 */

var mongo = require('mongodb');

var status = require('./codes.js').statuses;

//Events
var util = require('util'),
    events = require('events').EventEmitter;

var Db = function(){
    this.db = null;
    this.server = null;
    this.status = status.DISCONNECTED;

    // static Collections that are created at startup
    this._staticCol = ['hCommands', 'hResults', 'hSubscriptions', 'hChannels'];
    this.collections = {};

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
    if( this.status == status.CONNECTED ){
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
                }

                //Init validators for collections and tell everyone that we are ready to go
                self._initDefaultValidators();
                self.status = status.CONNECTED;
                self.emit('connect');

            } else //Error opening database
                self.emit('error');
        });

    } else //Invalid URI
        this.emit('error');
};

/**
 * Disconnects from the database. When finishes emits the event 'disconnect'
 * If there is no connection it will automatically emit the event disconnect
 */
Db.prototype.disconnect = function(){

    if( this.status == status.CONNECTED ){
        var self = this;
        this.db.close(true, function(){
            self.status = 0;
            self.emit('disconnect');
        });

    }else //Not Connected
        this.emit('disconnect');
};

/**
 * Creates the default validators for the hubiquitus collections.
 * @private
 */
Db.prototype._initDefaultValidators = function(){
    this.collections.hChannels.required = {
        chid: true
    };

    //Symbolically create hMessages
    this.get('hMessages');
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
        return false;

    for(var req in required)
        if(required.hasOwnProperty(req) && required[req] &&
            (doc[req] == null || doc[req] === undefined))
            return false;


    for(var i = 0; i < validators.length; i++){
        if(!validators[i].call(doc))
            return false;
    }

    return true;
};

/**
 * Saves an object to a collection.
 * @param collection a db recovered collection (db.collection())
 * @param collectionForReq [Optional] The collection to use for testing requirements/onSavers (useful for hMessages)
 * @param doc the document to save
 * @param cb [Optional] the Callback to pass the error/result
 * @private
 */
Db.prototype._saver = function(collection, collectionForReq, doc, cb){
    var colForReq = collectionForReq || collection;

    var callback = function(err, result){
        var onSave = colForReq.onSave;

        if(!err && onSave instanceof Array)
            for(var i = 0; i < onSave.length; i++)
                onSave[i](result);

        return cb ? cb(err, result) : null;
    };

    if(this._testValidators(colForReq, doc))
        collection.save(doc, {safe: true}, callback);
    else
        callback('validation error', doc);
};

/**
 * Saves a hChannel to the database. If the channel given has an id existing in the database
 * already it will be updated.
 * @param hChannel - hChannel to create or update
 * @param cb - [Optional] Callback that receives (err, result)
 */
Db.prototype.saveHChannel = function(hChannel, cb){
    this._saver(this.collections.hChannels, undefined, hChannel, cb);
};

/**
 * Saves a hCommand to the database.
 * @param hCommand hCommand to save.
 * @param cb [Optional] callback to pass the error/result
 */
Db.prototype.saveHCommand = function(hCommand, cb){
    this._saver(this.collections.hCommands, undefined, hCommand, cb);
};

/**
 * Saves a hResult to the database.
 * @param hResult hResult to save.
 * @param cb [Optional] callback to pass the error/result
 */
Db.prototype.saveHResult = function(hResult, cb){
    this._saver(this.collections.hResults, undefined, hResult, cb);
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
        return cb ? cb('invalid chid/object', hMessage) : null;

    //Use 'virtual' hMessages collection to test requirements. But when saving use real collection
    this._saver(this.get(hMessage.chid), this.collections.hMessages, hMessage, cb);
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
        this.collections[collection] = col;
    }

    return this.collections[collection];
};

/**
 * Creates a valid Primary key string that can be used in mongo to create
 * an ObjectID. The returned value can be considered a UUID
 * @return String - PK that can be used to create new ObjectID();
 */
Db.prototype.createPk = function(){
    return '' + mongo.ObjectID.createPk();
};

exports.db = new Db();