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
        cmdController = new config.cmdController(config.cmdParams),
        status = require('../lib/codes.js').hResultStatus,
        cmd = JSON.parse(JSON.stringify(config.genericCmd)),
        convid,
        publishedMessages = 0;


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(activeChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    //Publish first message to get a valid convid and following ones with same convid
    before(function(done){
        var cmd = JSON.parse(JSON.stringify(config.genericCmd));
        cmd.cmd = 'hPublish';
        cmd.params = {
            chid: activeChannel,
            transient: false,
            publisher: config.validJID
        };
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            publishedMessages++;
            convid = hResult.result.convid;
            done();
        });
    })

    for(var i = 0; i < 4; i++)
        before(function(done){
            var cmd = JSON.parse(JSON.stringify(config.genericCmd));
            cmd.cmd = 'hPublish';
            cmd.params = {
                chid: activeChannel,
                convid: convid,
                transient: false,
                publisher: config.validJID
            };
            cmdController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('status', status.OK);
                publishedMessages++;
                done();
            });
        })

    beforeEach(function(){
        cmd = JSON.parse(JSON.stringify(config.genericCmd));
        cmd.cmd = 'hGetThread';
        cmd.params = {
            chid: activeChannel,
            convid: convid
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

    it('should return hResult error MISSING_ATTR if convid is not provided', function(done){
        delete cmd.params.convid;
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.match(/convid/);
            done();
        });

    })

    it('should return hResult error INVALID_ATTR with convid not a string', function(done){
        cmd.params.convid = [];
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.match(/convid/);
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

    it('should return hResult OK with an empty [] if no messages found matching convid', function(done){
        cmd.params.convid = config.db.createPk();
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an [] containing all messages with same convid', function(done){
        cmdController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(publishedMessages);
            done();
        });
    })

})
