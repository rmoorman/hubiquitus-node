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
    var inactiveChan = config.db.createPk();
    var poorChannel = config.db.createPk();
    var richChannel = config.db.createPk();
    var channelPriority = 2;
    var channelLocation = {lat: '1234'};

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(poorChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    before(function(done){
        hCommandController.execCommand({
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hCreateUpdateChannel',
            params : {
                chid : richChannel,
                active : true,
                host : '' + new Date(),
                owner : config.validJID,
                participants : [config.validJID],
                location : channelLocation,
                priority : channelPriority
            }
        }, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();});
    })

    beforeEach(function(){
        var id = config.db.createPk();
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hPublish',
            params : {
                msgid: id,
                convid: id,
                chid: poorChannel,
                publisher: config.validJID
            }
        };
    })

    it('should return hResult error MISSING_ATTR when missing params', function(done){
        delete cmd['params'];
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with new msgid = convid when msgid and convid are not specified', function(done){
        delete cmd.params.msgid;
        delete cmd.params.convid;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.have.property('convid');
            hResult.result.should.have.property('msgid', hResult.result.convid);
            done();
        });
    })

    it('should return hResult OK with new msgid and specified convid when msgid is not sent and convid is', function(done){
        delete cmd.params.msgid;
        cmd.params.convid = config.db.createPk();
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.have.property('msgid');
            hResult.result.should.have.property('convid', cmd.params.convid);
            done();
        });
    })

    it('should return hResult OK with new msgid and convid equal if only msgid was sent', function(done){
        delete cmd.params.convid;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.have.property('msgid');
            hResult.result.should.have.property('convid', hResult.result.msgid);
            done();
        });
    })

    it('should return hResult OK with new msgid and convid equal if both were sent and were equal', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.have.property('msgid');
            hResult.result.should.have.property('convid', hResult.result.msgid);
            done();
        });
    })

    it('should return hResult OK with new msgid and same convid if both were sent and different', function(done){
        cmd.params.convid = config.db.createPk();
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.have.property('msgid');
            hResult.result.should.have.property('convid', cmd.params.convid);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR when chid is not present', function(done){
        delete cmd.params.chid;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR when chid is not string castable', function(done){
        cmd.params.chid = [];
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when chid does not exist', function(done){
        cmd.params.chid = 'this CHID does not exist';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.NOT_AVAILABLE);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED when chid is inactive', function(done){
        cmd.params.chid = inactiveChan;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR when type is not string castable', function(done){
        cmd.params.type = [];
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority not number castable', function(done){
        cmd.params.priority = 'this is not a number';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority set and > 5', function(done){
        cmd.params.priority = 6;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority set and < 0', function(done){
        cmd.params.priority = -1;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with priority = hMessage if specified', function(done){
        cmd.params.priority = 3;
        cmd.params.chid = poorChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('priority', 3);
            done();
        });
    })

    it('should return hResult OK with priority = hMessage if specified even if existing in channel', function(done){
        cmd.params.priority = 3;
        cmd.params.chid = richChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('priority', 3);
            done();
        });
    })

    it('should return hResult OK with priority = hChannel if not specified but existing in channel', function(done){
        delete cmd.params.priority;
        cmd.params.chid = richChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('priority', channelPriority);
            done();
        });
    })

    it('should return hResult OK with priority = 1 if not specified not existing in channel', function(done){
        delete cmd.params.priority;
        cmd.params.chid = poorChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('priority', 1);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if relevance specified and not a date', function(done){
        cmd.params.relevance = 'this is not a date';
        cmd.params.chid = poorChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with relevance set if no headers specified', function(done){
        var relevance = new Date( new Date().getTime() - 50000000 );
        cmd.params.relevance = relevance;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult OK with hServer published time + header if bigger than relevance set', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() - 50000000 );
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        cmd.params.relevance = relevance;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(hResult.result.published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK with relevance set if relevance_offset set but older', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() + 50000000 );
        cmd.params.relevance = relevance;
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult OK with user set published time + header if bigger than relevance set', function(done){
        var offset = 50000;
        var published = new Date( new Date().getTime() - 100000 );
        cmd.params.relevance = new Date( new Date().getTime() - 50000000 );
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        cmd.params.published = published;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK with relevance set if relevance_offset + user set published older', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() + 50000000 );
        var published = new Date( new Date().getTime() - 100000 );
        cmd.params.relevance = relevance;
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        cmd.params.published = published;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if transient is not boolean', function(done){
        cmd.params.transient = 'this is not a boolean';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK if correct and do not store it in mongo transient not specified', function(done){
        delete cmd.params.transient;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);

            config.db.get(cmd.params.chid).findOne({_id: hResult.result.msgid}, function(err, msg){
                should.not.exist(err);
                should.not.exist(msg);
                done();
            });

        });
    })

    it('should return hResult OK if correct and store it in mongo if not transient', function(done){
        cmd.params.transient = false;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            config.db.get(cmd.params.chid).findOne({_id: hResult.result.msgid}, function(err, msg){
                should.not.exist(err);
                should.exist(msg);
                msg.should.have.property('convid', hResult.result.convid);
                done();
            });
        });
    })

    it('should return hResult error INVALID_ATTR if location set and not an object', function(done){
        cmd.params.location = 1;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with location = hMessage if specified', function(done){
        cmd.params.location = { lng: '12345' };
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('location', cmd.params.location);
            done();
        });
    })

    it('should return hResult OK with location = hMessage if specified even if existing in channel', function(done){
        cmd.params.location = { lng: '12345' };
        cmd.params.chid = richChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('location', cmd.params.location);
            done();
        });
    })

    it('should return hResult OK with location = hChannel if not set but existing in channel', function(done){
        delete cmd.params.location;
        cmd.params.chid = richChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.location.should.be.eql(channelLocation);
            done();
        });
    })

    it('should return hResult OK without location if not set and not existing in channel', function(done){
        delete cmd.params.location;
        cmd.params.chid = poorChannel;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.not.have.property('location');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if author set and not a JID', function(done){
        cmd.params.author = 'this is not a jid';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK using a bare JID as author', function(done){
        cmd.params.author = 'a@b';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            done();
        });
    })

    it('should return hResult OK using a full JID as author', function(done){
        cmd.params.author = 'a@b/resource';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if publisher is not set', function(done){
        delete cmd.params.publisher;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if publisher != sender', function(done){
        cmd.params.publisher = 'a@b.com';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if published specified and not a date', function(done){
        cmd.params.published = 'this is not a date';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK without published set and have a set published time by server', function(done){
        delete cmd.params.published;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('published').and.be.an.instanceof(Date);
            done();
        });
    })

    it('should return hResult OK with set published time if specified ', function(done){
        cmd.params.published = new Date();
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status').and.equal(status.OK);
            hResult.result.should.have.property('published', cmd.params.published);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if headers is not an object', function(done){
        cmd.params.headers= 'aaa';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if RELEVANCE_OFFSET header is not a number', function(done){
        cmd.params.headers= {RELEVANCE_OFFSET: 'a string'};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.result.should.match(/RELEVANCE_OFFSET/);
            done();
        });
    })

    it('should return hResult OK with relevance set to published time + header', function(done){
        var published = new Date(),
            offset = 50000;
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        cmd.params.published = published;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK without relevance if nothing specified in msg or headers', function(done){
        delete cmd.params.relevance;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.not.have.property('relevance');
            done();
        });
    })

    it('should return hResult OK with relevance set to hServer published time + header', function(done){
        var offset = 50000;
        cmd.params.headers= {RELEVANCE_OFFSET: offset};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.relevance.getTime().should.be.eql(hResult.result.published.getTime() + offset);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if MAX_MSG_RETRIEVAL header is not a number', function(done){
        cmd.params.headers= {MAX_MSG_RETRIEVAL: 'a string'};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.result.should.match(/MAX_MSG_RETRIEVAL/);
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
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK when published without any optional attr', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK with every field correct', function(done){
        cmd.params.type = 'a type';
        cmd.params.priority = 3;
        cmd.params.relevance = new Date();
        cmd.params.transient = true;
        cmd.params.location = {lng: '123123'};
        cmd.params.author = 'a@b.com';
        cmd.params.headers = { MAX_MSG_RETRIEVAL: 3, RELEVANCE_OFFSET: 5450};
        cmd.params.payload = {};

        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

})