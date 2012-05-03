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
 * To search use the Models: Model.find({restriction: 'rest'}, cb(err,docs));
 * To save an object: var instance = new Model();
 * Fill it and then save it with instance.save(cb(err));
 */

/** TO ADD A NEW SCHEMA TO MONGOOSE:
 * 1. Create your Mongoose Schema
 * 2. Add it to an object in the form {name: String, schema: Schema}
 * where name is the name of the collection and schema is the one from (1).
 * 3. Add the object from (2) to the array 'schemas'.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schemas = [];

/**
 * hLocation. This is not stored in a collection of mongodb but is a part
 * of other documents.
 */
var hLocationSchema = {
    lat : String,
    lng : String,
    zip : String
};

/**
 * hChannel
 */
var hChannelSchema = new Schema({

    chid : {type: String, unique: true},

    chdesc : String,

    priority : {type: Number, min: 0, max: 5},

    location : hLocationSchema,

    host : String,

    owner : String,

    participants : [String],

    active : {type: String, enum: ['Y', 'N'], uppercase: true},

    headers : {default: new Object()} //Doesn't cause errors when first person adds header
});
schemas.push({name: 'hChannel', schema: hChannelSchema});

/**
 * Connects to MongoDB and creates the models
 * @param uri - address to connect to MongoDB in the form mongodb://IP:PORT/database
 * @return {Object} - Context object with all the loaded models and a
 * models attr with all the model's keys.
 */
function dbInit(uri){

    //Connect to the database
    mongoose.connect(uri);

    //Load Models
    var context = {};
    context.models = [];
    for(var i = 0; i < schemas.length; i++){
        context.models.push(schemas[i].name);
        context[schemas[i].name] =
            mongoose.model(schemas[i].name, schemas[i].schema);
    }

    return context;
}

exports.dbInit = dbInit;
exports.schemas = schemas;