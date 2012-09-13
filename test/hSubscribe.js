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

describe('hSubscribe', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = config.getNewCHID();
    var existingCHID2 = config.getNewCHID();
    var inactiveChannel = config.getNewCHID();

    before(config.beforeFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(existingCHID2, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd = {
            msgid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hSubscribe',
                params : {
                    actor: config.db.createPk()
                }
            }
        };
    })

    it('should return hResult error MISSING_ATTR when missing params', function(done){
        delete cmd.payload['params'];
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with params not an object', function(done){
        cmd.payload.params = 'string';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error MISSING_ATTR when actor is not part of params', function(done){
        cmd.payload.params = {};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with actor not a string', function(done){
        cmd.payload.params.actor = [];
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.match(/actor/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE when actor doesnt exist', function(done){
        cmd.payload.params = {actor: '#this channel does not exist@localhost'};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if not in subscribers list', function(done){
        cmd.payload.params = {actor: existingCHID};
        cmd.publisher = 'not_in_list@' + config.validDomain;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        cmd.payload.params = {actor: inactiveChannel};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK when correct', function(done){
        cmd.payload.params = {actor: existingCHID};
        cmd.publisher = config.validJID;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error if already subscribed', function(done){
        cmd.payload.params = {actor: existingCHID};
        cmd.publisher = config.validJID;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

})