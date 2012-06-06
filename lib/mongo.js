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
 * This is a singleton object with a connection to the database.
 * To connect to the database use DB.connect(); *
 *
 * It also contains:
 *  a cache of channels initialized when the connection to the db succeeds (db.cache.hChannels = {})
 *  all hubiquitus models to save to mongo (db.models = {})
 *  all hMessage models already loaded (db.models.hMessage[chid]) (a hMessage is stored in a channel collection)
 *  a method to create a hMessage model to save it to the correct collection (db.createHMessageSchema(chid))
 *
 * Schemas are only used to initialize and set configs for the models.
 * To search use the Model:
 * DB.models[Model].find({restriction: 'rest'}, cb(err,docs));
 * To save an object: var instance = new DB.models[Model]();
 * Fill it and then save it with instance.save(cb(err));
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var errors = require('./codes.js').errors;

//Events
var util = require('util');
var events = require('events').EventEmitter;

var DB = function(){
    this.models = {
        hMessage: {}
    };
    this.createHChannelSchema();
    this.createSubscriptionSchema();
    this.createHCommandSchema();
    this.createHResultSchema();
    events.call(this);
};
util.inherits(DB, events);


/**
 * Creates the hChannel Mongoose Schema with validators, setters and getters
 */
DB.prototype.createHChannelSchema = function(){
    var self = this;

    var headersValidator = function(v){
        if(!v) return true;
        if(!(v instanceof Array)) return false;
        for(var i = 0; i < v.length; i++)
            if(typeof v[i].hKey != 'string' || typeof v[i].hValue != 'string')
                return false;
        return true;
    };

    var headersSetter = function(v){
        if(! (v instanceof Array)) return;
        var newV = [];
        for(var i = 0; i < v.length; i++)
            if(typeof v[i] === 'object')
                newV.push({
                    hKey : v[i].hKey,
                    hValue : v[i].hValue
                });
        return newV;
    };

    var locationValidator = function(v){
        return typeof v === 'object' || typeof v === 'undefined' || v == null;
    };

    var hChannelSchema = new Schema({

        chid : {type: String, required: true, unique: true},

        chdesc : String,

        priority : {type: Number, default: 1, min: 0, max: 5},

        location : {
            type: {},
            lat : String,
            lng : String,
            zip : String
        },

        host : {type: String, required: true},

        owner : {type: String, required: true},

        participants : {type: [String], required: true},

        active : {type: Boolean, required: true},

        headers : {type: [{}], set: headersSetter}
    });

    hChannelSchema.path('headers').validate(headersValidator, 'pair-key error');
    hChannelSchema.path('location').validate(locationValidator, 'invalid location type');

    hChannelSchema.pre('save', function(next){
        //TODO: Publish modification to admin channel
        log.debug('Updating hChannel Cache');
        self.cache.hChannels[this.chid] = JSON.parse(JSON.stringify(this));
        next();
    });

    hChannelSchema.pre('remove', function(next){
        log.debug('Updating hChannel Cache');
        delete self.cache.hChannels[this.chid];
        next();
    });

    //Create and add model to list of models
    this.models.hChannel = mongoose.model('hChannel', hChannelSchema);
};

DB.prototype.createSubscriptionSchema = function(){

    var SubscriptionSchema = new Schema({

        jid : {type: String, required: true},

        subs : {type: [String]}
    });

    //Create and add model to list of models
    this.models.subscription = mongoose.model('subscription', SubscriptionSchema);
};

/**
 * Creates the hMessage Schema. They will not be created at
 * start up but on the fly when a message is saved. The Schema
 * will be used in several collections having each the name of the
 * channel where they are published.
 * The created schema can be accessed through DB.models.hMessage[chid]
 * @param chid - The name of the chid (collection) where the messages
 * will be stored. This must be a **valid** mongo collection name.
 * @return the created model
 */
DB.prototype.createHMessageSchema = function(chid){
    log.debug('Creating hMesssage Schema for channel ' + chid);

    var hMessageSchema = new Schema({

        msgid : {type: String, required: true, unique: true},

        chid : {type: String, required: true},

        convid : {type: String, required: true},

        type: {type: String},

        priority : {type: Number, required: true, min: 0, max: 5},

        relevance : {type: Date},

        location : {
            lat : String,
            lng : String,
            zip : String
        },

        author: {type: String},

        publisher: {type: String, required: true},

        published: {type: Date, required: true},

        headers : {type: [{}]},

        payload: {type: {}}
    });

    //Create and add model to list of models
    this.models.hMessage[chid] = mongoose.model(chid, hMessageSchema, chid);

    return this.models.hMessage[chid];
};

/**
 * Creates the hCommand Mongoose Schema
 */
DB.prototype.createHCommandSchema = function(){

    var hCommandSchema = new Schema({

        reqid : {type: String, required: true, unique: true},

        requester : {type: String},

        sender : {type: String, required: true},

        entity : {type: String, required: true},

        sent : {type: Date, required: true},

        cmd : {type: String, required: true},

        params : {}
    });

    //Create and add model to list of models
    this.models.hCommand = mongoose.model('hCommand', hCommandSchema);
};

/**
 * Creates the hResult Mongoose Schema
 */
DB.prototype.createHResultSchema = function(){

    var hResultSchema = new Schema({

        reqid : {type: String, required: true, unique: true},

        cmd : {type: String, required: true},

        status : {type: Number, required: true},

        result : {}
    });

    //Create and add model to list of models
    this.models.hResult = mongoose.model('hResult', hResultSchema);
};

/**
 * Connects to MongoDB and creates the models
 * @param uri - address to connect to MongoDB in the form mongodb://IP:PORT/database
 * @param options - an optional object containing options{
 * timeout : int - time in ms to consider a timeout when connecting
 * }
 */
DB.prototype.connect = function(uri, options){
    var self = this;
    options = options || {};

    if(!uri || !uri.match(/^mongodb:\/\//)){
        this.emit('error', {
            code: errors.TECH_ERROR,
            msg: 'mongodb uri is not correctly formatted'
        });
        return;
    }

    if(this.connection && this.connection.readyState != 0){
        this.emit('error', {
            code: errors.ALREADY_CONNECTED,
            msg: 'there is already an opened connection'
        });
        return;
    }

    //Set timer for connection
    var timer = setTimeout(function(){
        self.emit('error', {
            code: errors.CONN_TIMEOUT,
            msg: 'timeout when connecting to mongodb'
        });
    }, options.timeout || 3000);


    //Emit Event when connected and erase timeout
    mongoose.connection.once('open', function(){
        clearTimeout(timer);
        self.createCaches(function(){
            self.emit('connect');
        });
    });

    //Connect to the database
    mongoose.connect(uri);
    this.connection = mongoose.connection;
};

/**
 * Disconnects from MongoDB and emits 'disconnect' when finished
 */
DB.prototype.disconnect = function(){
    var self = this;
    if(this.connection)
        this.connection.close(function(){
            self.emit('disconnect');
        });
    else
        self.emit('disconnect');
};

/**
 * This method creates (or updates) the whole cache stored in the DB singleton.
 * @param cb - function called when finished
 */
DB.prototype.createCaches = function(cb){
    var self = this;
    this.cache = {};

    this.models.hChannel.find({}, function(err, docs){
        if(!err){
            log.debug('Creating hChannel Cache');

            self.cache.hChannels = {};
            docs.forEach(function(channel){
                //Remove features from cache. Read only.
                self.cache.hChannels[channel.chid] = JSON.parse(JSON.stringify(channel));
            });

            cb();

        } else{
            log.error('Error Loading hChannel Cache');
            process.exit(1);
        }
    });

};

exports.db = new DB();