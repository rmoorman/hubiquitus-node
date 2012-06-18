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

describe('hPublish', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = '' + Math.floor(Math.random()*10000);
    var inactiveChan = '' + Math.floor(Math.random()*10000);

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hPublish',
            params : {
                chid: existingCHID,
                publisher: config.validJID
            }
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

    it('should return hResult error when chid doesnt exist', function(done){
        cmd.params.chid = 'this CHID does not exist';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status').and.equal(status.NOT_AVAILABLE);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if not in participants list', function(done){
        cmd.params.publisher = 'not@in.list';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if sender != publisher', function(done){
        cmd.params.publisher = 'a@b.com';
        cmd.sender = 'a@c.com';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if channel inactive', function(done){
        cmd.params.chid = inactiveChan;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult when correct', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

})