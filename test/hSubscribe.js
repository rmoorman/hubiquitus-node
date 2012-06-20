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
    var existingCHID = config.db.createPk();
    var inactiveChannel = config.db.createPk();

    before(config.beforeFN)

    before(function(done){
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hSubscribe',
            params : {chid: config.db.createPk()}
        };
    })

    it('should return hResult error when missing params', function(done){
        delete cmd['params'];
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when chid is not part of params', function(done){
        cmd.params = {};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status').and.equal(status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when chid doesnt exist', function(done){
        cmd.params = {chid: 'this CHID does not exist'};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status').and.equal(status.NOT_AVAILABLE);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if not in participants list', function(done){
        cmd.params = {chid: existingCHID};
        cmd.sender = 'not in list';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        cmd.params = {chid: inactiveChannel};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult when correct', function(done){
        cmd.params = {chid: existingCHID};
        cmd.sender = config.validJID;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error if already subscribed', function(done){
        cmd.params = {chid: existingCHID};
        cmd.sender = config.validJID;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

})