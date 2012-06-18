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
var db = require('../lib/mongo.js').db;

var validURI = require('./_config.js').mongoURI;

describe('#Database', function(){

    describe('#connect()',function(){
        afterEach(function(done){
            db.removeAllListeners('error');
            db.removeAllListeners('connect');
            db.removeAllListeners('disconnect');

            db.once('disconnect',done);
            db.disconnect();
        })

        it('should return invalid URI if URI does not start with mongodb://', function(done){
            db.once('error', function(error){
                done();
            });
            db.connect('localhost/dbName');
        })

        it('should return invalid URI if URI missing db', function(done){
            db.once('error', function(error){
                done();
            });
            db.connect('mongodb://localhost');
        })

        it('should return invalid URI if port is not a number', function(done){
            db.once('error', function(error){
                done();
            });
            db.connect('mongodb://localhost:notNumber/dbName');
        })

        it('should accept URI if it does not have a port and emit connect', function(done){
            db.once('connect', done);
            db.connect('mongodb://localhost/dbName');
        })

        it('should accept URI with port', function(done){
            //Will return an error because Mongo is not listening to that port
            db.once('error', done);
            db.connect('mongodb://localhost:10/dbName');
        })


        it('should emit connect automatically if a second connection is attempted and first one succeeds', function(done){
            //Will return an error because Mongo is not listening to that port
            var counter = 0;
            db.on('connect', function(){
                if(++counter == 2)
                    done();
                else if(counter == 1)
                    db.connect(validURI);
            });
            db.connect(validURI);
        })

    })

    describe('#disconnect()', function(){
        afterEach(function(done){
            db.removeAllListeners('error');
            db.removeAllListeners('connect');
            db.removeAllListeners('disconnect');

            db.once('disconnect',done);
            db.disconnect();
        })

        it('should emit disconnect if not connected and function called', function(done){
            db.once('disconnect', done);
            db.disconnect();
        })

        it('should emit disconnect when successful disconnection', function(done){
            db.once('disconnect', done);
            db.once('connect', function(){
                db.disconnect();
            });
            db.connect(validURI);
        })
    })

    describe('#saveHChannel()', function(){
        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        it('should allow to save without callback', function(done){
            var chid = db.createPk();
            db.saveHChannel({chid: chid});

            db.get('hChannels').findOne({chid: chid}, function(err, doc){
                should.not.exist(err);
                should.exist(doc);
                done();
            })
        })

        it('should call cb without error using valid hChannel', function(done){
            db.saveHChannel({chid: 'another chid'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                done();
            });
        })

        it('should call cb with error with hChannel without chid', function(done){
            db.saveHChannel({priority: 1}, function(err, result){
                should.exist(err);
                should.exist(result);
                done();
            });
        })

        it('should do nothing with hChannel without chid and no cb', function(){
            db.saveHChannel({priority: 1});
        })
    })

    describe('#saveHCommand()', function(){
        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        it('should allow to save without callback', function(done){
            var cmd = db.createPk();

            db.saveHCommand({cmd: cmd});

            db.get('hCommands').findOne({cmd: cmd}, function(err, doc){
                should.not.exist(err);
                should.exist(doc);
                done();
            })
        })

        it('should call cb without error using valid hCommand', function(done){
            db.saveHCommand({cmd: 'commandName'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                done();
            });
        })
    })

    describe('#saveHResult()', function(){
        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        it('should allow to save without callback', function(done){
            var cmd = db.createPk();
            db.saveHResult({cmd: cmd});

            db.get('hResults').findOne({cmd: cmd}, function(err, doc){
                should.not.exist(err);
                should.exist(doc);
                done();
            })
        })

        it('should call cb without error using valid hResult', function(done){
            db.saveHResult({cmd: 'commandName'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                done();
            });
        })
    })

    describe('#saveHMessage()', function(){
        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        it('should allow to save without callback', function(done){
            var chid = db.createPk();
            db.saveHMessage({chid: chid});

            db.get(chid).findOne({chid: chid}, function(err, doc){
                should.not.exist(err);
                should.exist(doc);
                done();
            })
        })

        it('should call cb without error using valid hMessage', function(done){
            db.saveHChannel({chid: 'chid'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                done();
            });
        })

        it('should call cb with error with hMessage without chid', function(done){
            db.saveHChannel({priority: 1}, function(err, result){
                should.exist(err);
                should.exist(result);
                done();
            });
        })

        it('should do nothing with hMessage without chid and error', function(){
            db.saveHChannel({priority: 1});
        })
    })

    describe('#searchCollections()', function(){
        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        it('should be able to search static collections', function(done){
            db.get('hChannels').findOne(function(err, item) {
                should.not.exist(err);
                done();
            });
        })

        it('should be able to search dynamic collections', function(done){
            db.get('newCollection').findOne(function(err, item) {
                should.not.exist(err);
                should.not.exist(item);
                done();
            });
        })
    })

    describe('#createPk()', function(){
        it('should return a 24 HEX encoded string that can be used as an _id for mongo', function(){
            var id = db.createPk();
            var mdb = require('mongodb');
            should.exist(id);
            id.should.have.length(24);
            id.should.match(/([0-9]|[a-f]|[A-F])/g);
            new mdb.ObjectID(id); //Will throw error if invalid id
        })
    })

})