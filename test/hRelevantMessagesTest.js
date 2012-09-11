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

describe('hRelevantMessages', function(){

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);
    var status = require('../lib/codes.js').hResultStatus;
    var cmd;
    var nbMsgs = 10;
    var activeChan = config.db.createPk();
    var notInPart = config.db.createPk();
    var inactiveChan = config.db.createPk();
    var emptyChannel = config.db.createPk();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChan, [config.validJID], config.validJID, true, done);
    })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, {
                relevance: new Date( new Date().getTime() + 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, {
                relevance: new Date( new Date().getTime() - 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, done);
        })

    before(function(done){
        this.timeout(5000);
        config.createChannel(emptyChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(notInPart, ['a@b.com'], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })

    beforeEach(function(){
        cmd = {
            msgid : 'hCommandTest123',
            actor : 'hnode@' + hClient.serverDomain,
            type : 'hCommand',
            priority : 0,
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hRelevantMessages',
                params : {
                    actor: activeChan
                }
            }
        };
    })

    it('should return hResult error INVALID_ATTR if no param object sent', function(done){
        delete cmd.payload.params;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if param is not an object', function(done){
        cmd.payload.params = 'this is not an object';
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if actor is missing', function(done){
        delete cmd.payload.params.actor;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.result.should.match(/actor/);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if actor is not a string', function(done){
        cmd.payload.params.actor = [];
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.result.should.match(/actor/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if channel was not found', function(done){
        cmd.payload.params.actor = 'this channel does not exist';
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if not in participants list', function(done){
        cmd.payload.params.actor = notInPart;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        cmd.payload.params.actor = inactiveChan;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an array of valid messages and without msgs missing relevance', function(done){
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.length.should.be.eql(nbMsgs);

            for(var i = 0; i < hMessage.payload.result.length; i++)
                hMessage.payload.result[i].relevance.getTime().should.be.above(new Date().getTime());
            done();
        });
    })

    it('should return hResult OK with an empty array if no matching msgs found', function(done){
        cmd.payload.params.actor = emptyChannel;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.length.should.be.eql(0);
            done();
        });
    })

})