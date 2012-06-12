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

/*
 NEEDS BEFORE hSubscribe
 */
describe('hUnsubscribe', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = '' + Math.floor(Math.random()*10000);
    var inactiveCHID = '' + Math.floor(Math.random()*10000);

    before(config.beforeFN)

    //Create active channel
    before(function(done){
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, existingCHID, done);
    })

    //Create active channel to be inactive
    before(function(done){
        config.createChannel(inactiveCHID, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to the channel to be inactive
    before(function(done){
        config.subscribeToChannel(config.validJID, inactiveCHID, done);
    })

    //Make channel inactive
    before(function(done){
        config.createChannel(inactiveCHID, [config.validJID], config.validJID, false, done);
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hUnsubscribe',
            params : {chid: existingCHID}
        };
    })

    it('should return hResult error when missing params', function(done){
        delete cmd['params'];
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when chid doesnt exist', function(done){
        cmd.params = {chid: 'this CHID does not exist'};
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status').and.equal(status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if not subscribed', function(done){
        cmd.params = {chid: 'this CHID does not exist'};
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when chid is inactive', function(done){
        cmd.params = {chid: inactiveCHID};
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status').and.equal(status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult when correct', function(done){
        cmd.params = {chid: existingCHID};
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

})