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
var config = require('./_config.js');
var errors = require('../lib/codes.js').errors;
var hResultStatus = require('../lib/codes.js').hResultStatus;


describe('hAdmin XMPP Connection', function(){

    var hAdmin = config.xmppConnection;

    before(function(done){
        var db = require('../lib/mongo.js').db;
        db.once('connect', done);
        db.connect(config.mongoURI);
    })

    after(function(done){
        var db = require('../lib/mongo.js').db;
        db.once('disconnect', done);
        db.disconnect();
    })

    describe('#connect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.xmppParams));
        })

        afterEach(function(done){
            hAdmin.once('disconnect', done);
            hAdmin.disconnect();
        })

        it('should emit an event when connected', function(done){
            hAdmin.once('connect', done);
            hAdmin.connect(xmppOptions);
        })

        it('should emit an error when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            hAdmin.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(errors.AUTH_FAILED);
                error.msg.should.be.a('string');
                done() });
            hAdmin.connect(xmppOptions);
        })

        it('should emit an error when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            hAdmin.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(errors.JID_MALFORMAT);
                error.msg.should.be.a('string');
                done() });
            hAdmin.connect(xmppOptions);
        })

    })

    describe('#publishHChannel()', function(){

        var hChannel = {
            chid: 'a channel',
            host: 'domain.com',
            owner: config.validJID,
            participants: [config.validJID],
            active: true
        };

        beforeEach(function(done){
            hAdmin.once('connect', done);
            hAdmin.connect(config.xmppParams);
        })

        afterEach(function(done){
            hAdmin.once('disconnect', done);
            hAdmin.disconnect();
        })

        it('should do nothing if not connected and a cb was not passed ', function(done){
            hAdmin.once('disconnect', function(){
                hAdmin.publishHChannel(hChannel);
                done();
            });
            hAdmin.disconnect();
        })

        it('should return hResult error NOT_CONNECTED if not connected and cb', function(done){
            hAdmin.once('disconnect', function(){
                hAdmin.publishHChannel(hChannel, function(hResult){
                    should.exist(hResult);
                    hResult.status.should.be.eql(hResultStatus.NOT_CONNECTED);
                    hResult.result.should.be.a('string');
                    done();
                });
            });
            hAdmin.disconnect();
        })

        it('should execute and do not throw error if correct and no cb', function(){
            hAdmin.publishHChannel(hChannel);
        })


        it('should return hResult OK if correctly executed', function(done){
            hAdmin.publishHChannel(hChannel, function(hResult){
                should.exist(hResult);
                hResult.status.should.be.eql(hResultStatus.OK);
                done();
            });
        })

    })
})