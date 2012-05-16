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
 * Schemas are only used to initialize and set configs for the models.
 * To search use the Model:
 * DB.models.Model.find({restriction: 'rest'}, cb(err,docs));
 * To save an object: var instance = new db.models.Model();
 * Fill it and then save it with instance.save(cb(err));
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var errors = require('./codes.js').errors;

//Events
var util = require('util');
var events = require('events').EventEmitter;

var DB = function(){
    this.createHChannelSchema();
    this.createSubscriptionSchema();
    this.createHMessageSchema();
    events.call(this);
};
util.inherits(DB, events);


/**
 * Creates the hChannel Mongoose Schema with validators, setters and getters
 */
DB.prototype.createHChannelSchema = function(){

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

    var hChannelSchema = new Schema({

        chid : {type: String, required: true, unique: true},

        chdesc : String,

        priority : {type: Number, default: 1, min: 0, max: 5},

        location : {
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


    //Add schema to schema's list
    if(!(this.schemas instanceof Array)) this.schemas = [];
    this.schemas.push({name: 'hChannel', schema: hChannelSchema});

    //Create and add model to list of models
    if(!(this.models instanceof Object)) this.models = {};
    this.models.hChannel = mongoose.model('hChannel', hChannelSchema);
};

DB.prototype.createSubscriptionSchema = function(){

    var SubscriptionSchema = new Schema({

        jid : {type: String, required: true},

        subs : {type: [String], required: true}
    });

    //Add schema to schema's list
    if(!(this.schemas instanceof Array)) this.schemas = [];
    this.schemas.push({name: 'subscription', schema: SubscriptionSchema});

    //Create and add model to list of models
    if(!(this.models instanceof Object)) this.models = {};
    this.models.subscription = mongoose.model('subscription', SubscriptionSchema);
};

/**
 * Creates the hMessage Mongoose Schema with validators, setters and getters
 */
DB.prototype.createHMessageSchema = function(){

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

        headers : {type: [{}], set: headersSetter},

        payload: {type: {}}
    });

    hMessageSchema.path('headers').validate(headersValidator, 'pair-key error');


    //Add schema to schema's list
    if(!(this.schemas instanceof Array)) this.schemas = [];
    this.schemas.push({name: 'hMessageSchema', schema: hMessageSchema});

    //Create and add model to list of models
    if(!(this.models instanceof Object)) this.models = {};
    this.models.hMessage = mongoose.model('hMesssage', hMessageSchema);
};

/**
 * Connects to MongoDB and creates the models
 * @param uri - address to connect to MongoDB in the form mongodb://IP:PORT/database
 * @param options - an optional object containing options{
 * timeout : int - time in ms to consider a timeout when connecting
 * }
 * @return {Object} - Context object with all the loaded models, a
 * models attr with all the model's keys and a connection object.
 */
DB.prototype.connect = function(uri, options){
    var self = this;
    options = options || {};

    if(!uri || !uri.match(/^mongodb:\/\//)){
        this.emit('error', {
            code: errors.TECH_ERROR,
            msg: 'mongodb uri is not correctly formatted'
        });
        return null;
    }

    if(this.connection && this.connection.readyState != 0){
        this.emit('error', {
            code: errors.ALREADY_CONNECTED,
            msg: 'there is already an opened connection'
        });
        return null;
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
        self.emit('connect');
    });

    //Connect to the database
    mongoose.connect(uri);
    this.connection = mongoose.connection;


    //Load the context and return it
    return this.getContext();
};

/**
 * Recovers the models and object of the database
 */
DB.prototype.getContext = function(){
    var context = {};

    context.connection = this.connection;
    context.models = this.models;

    return context;
};

exports.db = DB;