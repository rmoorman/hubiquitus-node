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

describe('hGetThread', function(){

    var activeChannel = config.db.createPk(),
        inactiveChannel = config.db.createPk(),
        hCommandController = new config.cmdController(config.cmdParams),
        status = require('../lib/codes.js').hResultStatus,
        cmd = JSON.parse(JSON.stringify(config.genericCmdMsg)),
        convid,
        publishedMessages = 0;


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

    //Publish first message to get a valid convid and following ones with same convid
    before(function(done){
        config.publishMessageWithResult(config.validJID, activeChannel, undefined, undefined, new Date(), false, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            publishedMessages++;
            convid = hMessage.payload.result.convid;
            done();
        });
    })

    for(var i = 0; i < 4; i++)
        before(function(done){
            var opts = {};
            opts.convid = convid;
            config.publishMessageWithResult(config.validJID, activeChannel, undefined, undefined, new Date(), false, opts, function(hMessage) {
                hMessage.payload.should.have.property('status', status.OK);
                publishedMessages++;
                done();
            });
        })

    beforeEach(function(){
        cmd = JSON.parse(JSON.stringify(config.genericCmdMsg));
        cmd.payload.cmd = 'hGetThread';
        cmd.payload.params = {
            actor: activeChannel,
            convid: convid
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

    it('should return hResult error NOT_AUTHORIZED if the sender is not a participant', function(done){
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

    it('should return hResult error MISSING_ATTR if convid is not provided', function(done){
        delete cmd.payload.params.convid;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.match(/convid/);
            done();
        });

    })

    it('should return hResult error INVALID_ATTR with convid not a string', function(done){
        cmd.payload.params.convid = [];
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.match(/convid/);
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

    it('should return hResult OK with an empty [] if no messages found matching convid', function(done){
        cmd.payload.params.convid = config.db.createPk();
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an [] containing all messages with same convid', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(publishedMessages);
            done();
        });
    })

    describe('test filters', function(){
        var hClientConst = require('../lib/hClient.js').hClient;
        var hClient = new hClientConst(config.cmdParams);
        var filterMessagesPublished = 0;
        var convid2 = config.db.createPk();

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        before(function(done){
            var opts = {};
            opts.convid = convid;
            config.publishMessageWithResult(config.validJID, activeChannel, 'a type', undefined, new Date(), false, opts, function(hMessage) {
                hMessage.payload.should.have.property('status', status.OK);
                publishedMessages++;
                done();
            });
        })

        for(var i = 0; i < 3; i++)
            before(function(done){
                var opts = {};
                opts.convid = convid2;
                config.publishMessageWithResult(config.validJID, activeChannel, 'a type', undefined, new Date(), false, opts, function(hMessage) {
                    hMessage.payload.should.have.property('status', status.OK);
                    filterMessagesPublished++;
                    done();
                });
            })

        for(var i = 0; i < 3; i++)
            before(function(done){
                var opts = {};
                opts.convid = convid2;
                config.publishMessageWithResult(config.validJID, activeChannel, 'another type', undefined, new Date, false, opts, function(hMessage) {
                    hMessage.payload.should.have.property('status', status.OK);
                    filterMessagesPublished++;
                    done();
                });
            })

        before(function(done){
            var filterCmd = {
                msgid : 'testCmd',
                actor : 'hnode@' + hClient.domain,
                type : 'hCommand',
                priority : 0,
                publisher : config.logins[0].jid,
                published : new Date(),
                payload : {
                    cmd : 'hSetFilter',
                    params : {
                        actor: activeChannel,
                        name: 'a filter',
                        template: {type: 'a type'}
                    }
                }
            };
            hClient.processMsgInternal(filterCmd, function(hMessage){
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })


        it('should not return msgs if a msg OTHER than the first one pass the filter', function(done){
            cmd.actor = 'hnode@' + hClient.domain;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
                done();
            });
        })

        it('should return ALL convid msgs if the first one complies with the filter', function(done){
            cmd.actor = 'hnode@' + hClient.domain;
            cmd.payload.params.convid = convid2;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(filterMessagesPublished);
                done();
            });
        })

    })

})
