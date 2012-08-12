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

describe('hGetSubscriptions', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var actor = config.getNewCHID();
    var actorInactive = config.getNewCHID();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(actor, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, actor, done);
    })

    //Create it active
    before(function(done){
        this.timeout(5000);
        config.createChannel(actorInactive, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, actorInactive, done);
    })

    //Make it inactive
    before(function(done){
        this.timeout(5000);
        config.createChannel(actorInactive, [config.validJID], config.validJID, false, done);
    })

    beforeEach(function(){
        cmd = {
            msgid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            priority : 0,
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hGetSubscriptions',
            }
        };
    })

    it('should return hResult ok with an array as result if user doesnt have subscriptions', function(done){
        cmd.publisher = 'dontexist@a';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult ok with an array as result if user has subscriptions', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array);
            done();
        });
    })

    it('should return hResult ok with an array with a actor subscribed', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.result.should.include(actor);
            done();
        });
    })

    it('should return hResult ok with an array without a actor subscribed if channel is currently inactive', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.result.should.not.include(actorInactive);
            done();
        });
    })

})