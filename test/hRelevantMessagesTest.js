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
        config.createChannel(activeChan, [config.validJID], config.validJID, true, done);
    })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, false, {
                relevance: new Date( new Date().getTime() + 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, false, {
                relevance: new Date( new Date().getTime() - 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, false, done);
        })

    before(function(done){
        config.createChannel(emptyChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(notInPart, ['a@b.com'], config.validJID, true, done);
    })

    before(function(done){
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
            reqid: 'testCmd',
            entity: 'hnode@' + hClient.domain,
            sender: config.logins[0].jid,
            cmd: 'hRelevantMessages',
            params: { chid: activeChan }
        };
    })

    it('should return hResult error INVALID_ATTR if no param object sent', function(done){
        delete cmd.params;
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if param is not an object', function(done){
        cmd.params = 'this is not an object';
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if chid is missing', function(done){
        delete cmd.params.chid;
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.result.should.match(/chid/);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if chid is not a string', function(done){
        cmd.params.chid = [];
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.result.should.match(/chid/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if channel was not found', function(done){
        cmd.params.chid = 'this channel does not exist';
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if not in participants list', function(done){
        cmd.params.chid = notInPart;
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        cmd.params.chid = inactiveChan;
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an array of valid messages and without msgs missing relevance', function(done){
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.length.should.be.eql(nbMsgs);
            for(var i = 0; i < hResult.result.length; i++)
                hResult.result[i].relevance.getTime().should.be.above(new Date().getTime());
            done();
        });
    })

    it('should return hResult OK with an empty array if no matching msgs found', function(done){
        cmd.params.chid = emptyChannel;
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.length.should.be.eql(0);
            done();
        });
    })

})