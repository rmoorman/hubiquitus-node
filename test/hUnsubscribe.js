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
    var existingCHID = config.db.createPk();
    var inactiveCHID = config.db.createPk();

    before(config.beforeFN)

    //Create active channel
    before(function(done){
        this.timeout(5000);
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, existingCHID, done);
    })

    //Create active channel to be inactive
    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveCHID, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to the channel to be inactive
    before(function(done){
        config.subscribeToChannel(config.validJID, inactiveCHID, done);
    })

    //Make channel inactive
    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveCHID, [config.validJID], config.validJID, false, done);
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd = {
            msgid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hUnsubscribe',
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

    it('should return hResult error NOT_AUTHORIZED when actor doesnt exist', function(done){
        cmd.payload.params = {actor: 'this CHID does not exist'};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AUTHORIZED if not subscribed and no subscriptions', function(done){
        cmd.publisher = 'a@jid.com';
        cmd.payload.params = {actor: existingCHID};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED when actor is inactive', function(done){
        cmd.payload.params = {actor: inactiveCHID};
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
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

})