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
        cmdController = new config.cmdController(config.cmdParams),
        status = require('../lib/codes.js').hResultStatus,
        correctStatus = config.db.createPk(),
        cmd = JSON.parse(JSON.stringify(config.genericCmd)),
        convids = [],
        shouldNotAppearConvids = [];

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(activeChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    //Root messages with different status
    for(var i = 0; i < 2; i++)
        before(function(done){
            var cmd = JSON.parse(JSON.stringify(config.genericCmd));
            cmd.cmd = 'hPublish';
            cmd.params = {
                chid: activeChannel,
                transient: false,
                publisher: config.validJID,
                type: 'hConvState',
                payload: {status: config.db.createPk()}
            };
            cmdController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('status', status.OK);
                shouldNotAppearConvids.push(hResult.result.convid);
                done();
            });
        })

    //Change state of one of the previous convstate to a good one
    before(function(done){
        var cmd = JSON.parse(JSON.stringify(config.genericCmd));
        cmd.cmd = 'hPublish';
        cmd.params = {
            chid: activeChannel,
            transient: false,
            publisher: config.validJID,
            priority: 3,
            convid: shouldNotAppearConvids.pop(),
            type: 'hConvState',
            payload: {status: correctStatus}
        };
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            convids.push(hResult.result.convid);
            done();
        });
    })

    //Add a new conversation with good status
    before(function(done){
        var cmd = JSON.parse(JSON.stringify(config.genericCmd));
        cmd.cmd = 'hPublish';
        cmd.params = {
            chid: activeChannel,
            transient: false,
            priority: 3,
            publisher: config.validJID,
            type: 'hConvState',
            payload: {status: correctStatus}
        };
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            convids.push(hResult.result.convid);
            done();
        });
    })



    beforeEach(function(){
        cmd = JSON.parse(JSON.stringify(config.genericCmd));
        cmd.cmd = 'hGetThreads';
        cmd.params = {
            chid: activeChannel,
            status: correctStatus
        };
    })

    it('should return hResult error INVALID_ATTR without params', function(done){
        cmd.params = null;
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with params not an object', function(done){
        cmd.params = 'string';
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if the sender is not a participant', function(done){
        cmd.sender = 'not@a.participant';
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if the channel is inactive', function(done){
        cmd.params.chid = inactiveChannel;
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.match(/inactive/);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if chid is not provided', function(done){
        delete cmd.params.chid;
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.match(/chid/);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with chid not a string', function(done){
        cmd.params.chid = [];
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.match(/chid/);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if status is not provided', function(done){
        delete cmd.params.status;
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.match(/status/);
            done();
        });

    })

    it('should return hResult error INVALID_ATTR with status not a string', function(done){
        cmd.params.status= [];
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.match(/status/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if the channel does not exist', function(done){
        cmd.params.chid = 'inexistent channel';
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.NOT_AVAILABLE);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an empty [] if no messages found matching status', function(done){
        cmd.params.status = config.db.createPk();
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an [] containing convids whose convstate status is equal to the sent one', function(done){
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(convids.length);
            done();
        });
    })

    it('should return hResult OK with an [] without convid that was equal to the one sent but is not anymore', function(done){
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            for(var i = 0; i < shouldNotAppearConvids.length; i++)
                hResult.result.should.not.include(shouldNotAppearConvids[i]);
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
            hClient.command({
                reqid: 'testCmd',
                entity: 'hnode@' + hClient.domain,
                sender: config.logins[0].jid,
                cmd: 'hSetFilter',
                params: {
                    chid: activeChannel,
                    name: 'a filter',
                    template: {priority: 3}
                }
            }, function(hResult){
                hResult.should.have.property('status', status.OK);
                done();
            });
        })

        it('should only return convids of filtered conversations', function(done){
            cmd.entity = 'hnode@' + hClient.domain;
            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', status.OK);
                hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(1);
                done();
            });
        })

    })

})