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

describe('hGetThreads', function(){

    var activeChannel = config.db.createPk(),
        inactiveChannel = config.db.createPk(),
        hCommandController = new config.cmdController(config.cmdParams),
        status = require('../lib/codes.js').hResultStatus,
        correctStatus = config.db.createPk(),
        cmd = JSON.parse(JSON.stringify(config.genericCmdMsg)),
        convids = [],
        shouldNotAppearConvids = [];

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    //Root messages with different status
    for(var i = 0; i < 2; i++)
        before(function(done){
            config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: config.db.createPk()}, new Date(), false, function(hMessage) {
                hMessage.payload.should.have.property('status', status.OK);
                shouldNotAppearConvids.push(hMessage.payload.result.convid);
                done();
            });
        })

    //Change state of one of the previous convstate to a good one
    before(function(done){
        var opts = {};
        opts.priority = 3;
        opts.convid = shouldNotAppearConvids.pop();
        config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: correctStatus}, new Date(), false, opts, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            convids.push(hMessage.payload.result.convid);
            done();
        });
    })

    //Add a new conversation with good status
    before(function(done){
        var opts = {};
        opts.priority = 3;
        config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: correctStatus}, new Date(), false, opts, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            convids.push(hMessage.payload.result.convid);
            done();
        });
    })



    beforeEach(function(){
        cmd = JSON.parse(JSON.stringify(config.genericCmdMsg));
        cmd.payload.cmd = 'hGetThreads';
        cmd.payload.params = {
            actor: activeChannel,
            status: correctStatus
        };
    })

    it('should return hResult error INVALID_ATTR without params', function(done){
        cmd.payload.params = null;
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

    it('should return hResult error NOT_AUTHORIZED if the publisher is not a participant', function(done){
        cmd.publisher = 'not_a_participant@' + config.validDomain;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if the channel is inactive', function(done){
        cmd.payload.params.actor = inactiveChannel;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.match(/inactive/);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if actor is not provided', function(done){
        delete cmd.payload.params.actor;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.match(/actor/);
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

    it('should return hResult error MISSING_ATTR if status is not provided', function(done){
        delete cmd.payload.params.status;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.match(/status/);
            done();
        });

    })

    it('should return hResult error INVALID_ATTR with status not a string', function(done){
        cmd.payload.params.status= [];
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.match(/status/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if the channel does not exist', function(done){
        cmd.payload.params.actor = 'inexistent channel';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an empty [] if no messages found matching status', function(done){
        cmd.payload.params.status = config.db.createPk();
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an [] containing convids whose convstate status is equal to the sent one', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(convids.length);
            done();
        });
    })

    it('should return hResult OK with an [] without convid that was equal to the one sent but is not anymore', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            for(var i = 0; i < shouldNotAppearConvids.length; i++)
                hMessage.payload.result.should.not.include(shouldNotAppearConvids[i]);
            done();
        });
    })

    describe('test filters', function(){
        var hClientConst = require('../lib/hClient.js').hClient;
        var hClient = new hClientConst(config.cmdParams);

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        before(function(done){
            var filterCmd = {
                msgid : 'testCmd',
                actor : 'hnode@' + hClient.serverDomain,
                type : 'hCommand',
                priority : 0,
                publisher : config.logins[0].jid,
                published : new Date(),
                payload : {
                    cmd : 'hSetFilter',
                    params : {
                        actor: activeChannel,
                        name: 'a filter',
                        template: {priority: 3}
                    }
                }
            };
            hClient.processMsgInternal(filterCmd, function(hMessage){
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })

        it('should only return convids of filtered conversations', function(done){
            cmd.actor = 'hnode@' + hClient.serverDomain;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(1);
                done();
            });
        })

    })

})