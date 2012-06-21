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
var config = require('./_config.js');

var codes = require('../lib/codes.js').mongoCodes;
var status = require('../lib/codes.js').hResultStatus;

describe('#Database', function(){
    var validURI = config.mongoURI;

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
                should.exist(error);
                error.should.have.property('code', codes.INVALID_URI);
                error.should.have.property('msg');
                done();
            });
            db.connect('localhost/dbName');
        })

        it('should return invalid URI if URI missing db', function(done){
            db.once('error', function(error){
                should.exist(error);
                error.should.have.property('code', codes.INVALID_URI);
                error.should.have.property('msg');
                done();
            });
            db.connect('mongodb://localhost');
        })

        it('should return invalid URI if port is not a number', function(done){
            db.once('error', function(error){
                should.exist(error);
                error.should.have.property('code', codes.INVALID_URI);
                error.should.have.property('msg');
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
            db.once('error', function(error){
                should.exist(error);
                error.should.have.property('code', codes.TECH_ERROR);
                error.should.have.property('msg');
                done();
            });
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
        var validChannel;

        before(function(done){
            db.once('connect', done);
            db.connect(validURI);
        })

        beforeEach(function(){
            validChannel = {
                _id: db.createPk(),
                host: 'domain.com',
                owner: config.validJID,
                participants: [config.validJID],
                active: true
            };
        })

        it('should allow to save without callback', function(done){
            db.saveHChannel(validChannel);

            db.get('hChannels').findOne({_id: validChannel._id}, function(err, doc){
                should.not.exist(err);
                doc.should.be.eql(validChannel);
                done();
            })
        })

        it('should call cb without error using valid hChannel', function(done){
            db.saveHChannel(validChannel, function(err, result){
                should.not.exist(err);
                result.should.be.eql(validChannel);
                done();
            });
        })

        it('should call cb with error with hChannel without mandatory attribute', function(done){
            delete validChannel._id;
            db.saveHChannel(validChannel, function(err, result){
                should.exist(err);
                should.exist(result);
                err.should.be.eql(status.MISSING_ATTR);
                done();
            });
        })

        it('should do nothing with hChannel without chid and no cb', function(){
            delete validChannel._id;
            db.saveHChannel(validChannel);
        })

        it('should call onSave functions when succeeds even if it does not have cb', function(done){
            db.get('hChannels').onSave.push(function(result){
                db.get('hChannels').onSave.pop();
                done();
            });

            db.saveHChannel(validChannel);
        })

        it('should call onSave functions when succeeds and then call cb', function(done){
            var counter = 0;
            db.get('hChannels').onSave.push(function(result){
                db.get('hChannels').onSave.pop();
                if(++counter == 2)
                    done();
            });

            db.saveHChannel(validChannel, function(err, result){
                should.not.exist(err);
                result.should.be.eql(validChannel);
                if(++counter == 2)
                    done();
            });
        })

        it('should update cache when successful saving', function(done){
            db.saveHChannel(validChannel, function(err, result){
                should.not.exist(err);
                result.should.be.eql(validChannel);

                should.exist(db.cache.hChannels[validChannel._id]);
                db.cache.hChannels[validChannel._id]._id.should.be.eql(validChannel._id);
                done();
            });
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

        it('should call onSave functions when succeeds even if it does not have cb', function(done){
            db.get('hCommands').onSave.push(function(result){
                db.get('hCommands').onSave.pop();
                done();
            });

            db.saveHCommand({cmd: 'a cmd'});
        })

        it('should call onSave functions when succeeds and then call cb', function(done){
            var counter = 0;
            db.get('hCommands').onSave.push(function(result){
                db.get('hCommands').onSave.pop();
                if(++counter == 2)
                    done();
            });

            db.saveHCommand({cmd: 'a cmd'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                if(++counter == 2)
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

        it('should call onSave functions when succeeds even if it does not have cb', function(done){
            db.get('hResults').onSave.push(function(result){
                db.get('hResults').onSave.pop();
                done();
            });

            db.saveHResult({cmd: 'a cmd'});
        })

        it('should call onSave functions when succeeds and then call cb', function(done){
            var counter = 0;
            db.get('hResults').onSave.push(function(result){
                db.get('hResults').onSave.pop();
                if(++counter == 2)
                    done();
            });

            db.saveHResult({cmd: 'a cmd'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                if(++counter == 2)
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
            var chid = '' + db.createPk();
            db.saveHMessage({chid: chid});

            db.get(chid).findOne({chid: chid}, function(err, doc){
                should.not.exist(err);
                should.exist(doc);
                done();
            })
        })

        it('should call cb without error using valid hMessage', function(done){
            db.saveHMessage({chid: 'chid'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                done();
            });
        })

        it('should call onSave functions when succeeds even if it does not have cb', function(done){
            db.get('hMessages').onSave.push(function(result){
                db.get('hMessages').onSave.pop();
                done();
            });

            db.saveHMessage({chid: 'a chid'});
        })

        it('should call onSave functions when succeeds and then call cb', function(done){
            var counter = 0;
            db.get('hMessages').onSave.push(function(result){
                db.get('hMessages').onSave.pop();
                if(++counter == 2)
                    done();
            });

            db.saveHMessage({chid: 'a chid'}, function(err, result){
                should.not.exist(err);
                should.exist(result);
                if(++counter == 2)
                    done();
            });
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
        it('should return a string', function(){
            var id = db.createPk();
            should.exist(id);
            id.should.be.a('string');
        })
    })

})