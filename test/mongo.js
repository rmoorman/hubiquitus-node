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

var should = require('should');
var Mongo = require('../lib/mongo.js').db;
var codes = require('../lib/codes.js');

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('Mongo', function(){

    var uri = 'mongodb://localhost/test';
    var db;

    beforeEach(function(done){
        db = new Mongo();
        done();
    })

    afterEach(function(done){
        //Clean up connection
        if(db.connection)
            db.connection.close(done);
        else
            done();
    })

    describe('#connect', function(){

        it('should return context object', function(done){
            var context = db.connect(uri);
            should.exist(context);

            context.should.have.property('models');
            context.should.have.property('connection');
            done();
        })

        it('should return object with models', function(done){
            var context = db.connect(uri);

            context.models.should.have.property('hChannel');
            done();
        })

        it('should return object with models containing hChannel', function(done){
            var context = db.connect(uri);

            context.models.should.have.property('hChannel');
            done();
        })

        it('should emit connect when connected', function(done){
            db.on('connect', done);
            db.connect(uri);
        })

        it('should emit error when a second connection is attempted', function(done){
            db.on('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', codes.errors.ALREADY_CONNECTED);
                done();
            });

            db.connect(uri);
            db.connect(uri);
        })

        it('should emit error when invalid address', function(done){
            db.on('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', codes.errors.TECH_ERROR);
                done();
            });

            var fakeUri = 'invalidUri';
            db.connect(fakeUri);
        })

        it('should emit error when timeout', function(done){
            this.timeout(5000);
            db.on('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', codes.errors.CONN_TIMEOUT);
                done();
            });

            var nonExistentAddress = 'mongodb://a';
            db.connect(nonExistentAddress);
        })

    })

})