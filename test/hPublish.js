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
    var msg;
    var status = require('../lib/codes.js').hResultStatus;
    var inactiveChan = config.getNewCHID();
    var poorChannel = config.getNewCHID();
    var richChannel = config.getNewCHID();
    var channelPriority = 2;
    var channelLocation = {lat: '1234'};
    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(poorChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })

    before(function(done){
        hCommandController.execCommand({
            msgid : 'hCommandTest123',
            convid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            priority : 0,
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hCreateUpdateChannel',
                params : {
                    actor : richChannel,
                    active : true,
                    owner : config.validJID,
                    participants : [config.validJID],
                    location : channelLocation,
                    priority : channelPriority
                }
            }
        }, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    beforeEach(function(){
        var id = config.db.createPk();
        msg = {
            msgid : id,
            convid : id,
            actor : poorChannel,
            publisher : config.validJID,
            published : new Date()
        };
    })

    it('should return hResult OK with new msgid = convid when msgid and convid are not specified', function(done){
        delete msg.msgid;
        delete msg.convid;

        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('convid');
            hMessage.payload.result.should.have.property('msgid', hMessage.payload.result.convid);
            done();
        });
    })

    it('should return hResult OK with new msgid and specified convid when msgid is not sent and convid is', function(done){
        delete msg.msgid;
        msg.convid = config.db.createPk();
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('msgid');
            hMessage.payload.result.should.have.property('convid', msg.convid);
            done();
        });
    })

    it('should return hResult OK with new msgid and convid equal if only msgid was sent', function(done){
        delete msg.convid;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('msgid');
            hMessage.payload.result.should.have.property('convid', hMessage.payload.result.msgid);
            done();
        });
    })

    it('should return hResult OK with new msgid and convid equal if both were sent and were equal', function(done){
        var msgid = msg.msgid;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('msgid');
            hMessage.payload.result.should.have.property('convid', msgid);
            done();
        });
    })

    it('should return hResult OK with new msgid and same convid if both were sent and different', function(done){
        msg.convid = config.db.createPk();
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('msgid');
            hMessage.payload.result.should.have.property('convid', msg.convid);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR when actor is not present', function(done){
        delete msg.actor;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR when actor is not string castable', function(done){
        msg.actor = [];
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error when actor does not exist', function(done){
        msg.actor = '#this channel does not exist@localhost';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED when actor is inactive', function(done){
        msg.actor = inactiveChan;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR when type is not string castable', function(done){
        msg.type = [];
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority not number castable', function(done){
        msg.priority = 'this is not a number';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority set and > 5', function(done){
        msg.priority = 6;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority set and < 0', function(done){
        msg.priority = -1;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with priority = hMessage if specified', function(done){
        msg.priority = 3;
        msg.actor = poorChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('priority', 3);
            done();
        });
    })

    it('should return hResult OK with priority = hMessage if specified even if existing in channel', function(done){
        msg.priority = 3;
        msg.actor = richChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('priority', 3);
            done();
        });
    })

    it('should return hResult OK with priority = hChannel if not specified but existing in channel', function(done){
        delete msg.priority;
        msg.actor = richChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('priority', channelPriority);
            done();
        });
    })

    it('should return hResult OK with priority = 1 if not specified not existing in channel', function(done){
        delete msg.priority;
        msg.actor = poorChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('priority', 1);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if relevance specified and not a date', function(done){
        msg.relevance = 'this is not a date';
        msg.actor = poorChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with relevance set if no headers specified', function(done){
        var relevance = new Date( new Date().getTime() - 50000000 );
        msg.relevance = relevance;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult OK with hServer published time + header if bigger than relevance set', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() - 50000000 );
        msg.headers= {RELEVANCE_OFFSET: offset};
        msg.relevance = relevance;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(hMessage.payload.result.published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK with relevance set if relevance_offset set but older', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() + 50000000 );
        msg.relevance = relevance;
        msg.headers= {RELEVANCE_OFFSET: offset};
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult OK with user set published time + header if bigger than relevance set', function(done){
        var offset = 50000;
        var published = new Date( new Date().getTime() - 100000 );
        msg.relevance = new Date( new Date().getTime() - 50000000 );
        msg.headers= {RELEVANCE_OFFSET: offset};
        msg.published = published;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK with relevance set if relevance_offset + user set published older', function(done){
        var offset = 50000;
        var relevance = new Date( new Date().getTime() + 50000000 );
        var published = new Date( new Date().getTime() - 100000 );
        msg.relevance = relevance;
        msg.headers= {RELEVANCE_OFFSET: offset};
        msg.published = published;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(relevance.getTime());
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if persistent is not boolean', function(done){
        msg.persistent = 'this is not a boolean';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK if correct and do not store it in mongo persistent not specified', function(done){
        delete msg.persistent;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);

            config.db.get(msg.actor).findOne({_id: hMessage.payload.result.msgid}, function(err, msg){
                should.not.exist(err);
                should.not.exist(msg);
                done();
            });

        });
    })

    it('should return hResult OK if correct and store it in mongo if persistent', function(done){
        msg.persistent = true;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            config.db.get(msg.actor).findOne({_id: hMessage.payload.result.msgid}, function(err, msgRes){
                should.not.exist(err);
                should.exist(msgRes);
                msgRes.should.have.property('convid', hMessage.payload.result.convid);
                done();
            });
        });
    })

    it('should return hResult error INVALID_ATTR if location set and not an object', function(done){
        msg.location = 1;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with location = hMessage if specified', function(done){
        msg.location = { lng: '12345' };
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('location', msg.location);
            done();
        });
    })

    it('should return hResult OK with location = hMessage if specified even if existing in channel', function(done){
        msg.location = { lng: '12345' };
        msg.actor = richChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('location', msg.location);
            done();
        });
    })

    it('should return hResult OK with location = hChannel if not set but existing in channel', function(done){
        delete msg.location;
        msg.actor = richChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.location.should.be.eql(channelLocation);
            done();
        });
    })

    it('should return hResult OK without location if not set and not existing in channel', function(done){
        delete msg.location;
        msg.actor = poorChannel;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.not.have.property('location');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if author set and not a JID', function(done){
        msg.author = 'this is not a jid';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK using a bare JID as author', function(done){
        msg.author = 'a@b';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK using a full JID as author', function(done){
        msg.author = 'a@b/resource';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if publisher is not set', function(done){
        delete msg.publisher;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if publisher != sender', function(done){
        msg.publisher = 'a@b.com';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if published specified and not a date', function(done){
        msg.published = 'this is not a date';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK without published set and have a set published time by server', function(done){
        delete msg.published;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('published').and.be.an.instanceof(Date);
            done();
        });
    })

    it('should return hResult OK with set published time if specified ', function(done){
        msg.published = new Date();
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.have.property('published', msg.published);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if headers is not an object', function(done){
        msg.headers= 'aaa';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if RELEVANCE_OFFSET header is not a number', function(done){
        msg.headers= {RELEVANCE_OFFSET: 'a string'};
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.result.should.match(/RELEVANCE_OFFSET/);
            done();
        });
    })

    it('should return hResult OK with relevance set to published time + header', function(done){
        var published = new Date(),
            offset = 50000;
        msg.headers= {RELEVANCE_OFFSET: offset};
        msg.published = published;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(published.getTime() + offset);
            done();
        });
    })

    it('should return hResult OK without relevance if nothing specified in msg or headers', function(done){
        delete msg.relevance;
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.not.have.property('relevance');
            done();
        });
    })

    it('should return hResult OK with relevance set to hServer published time + header', function(done){
        var offset = 50000;
        msg.headers= {RELEVANCE_OFFSET: offset};
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.relevance.getTime().should.be.eql(hMessage.payload.result.published.getTime() + offset);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if MAX_MSG_RETRIEVAL header is not a number', function(done){
        msg.headers= {MAX_MSG_RETRIEVAL: 'a string'};
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.result.should.match(/MAX_MSG_RETRIEVAL/);
            done();
        });
    })

    it('should return hResult error if not in participants list', function(done){
        msg.publisher = 'not@in.list';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('cmd', 'send');
            hMessage.should.have.property('ref', msg.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error if sender != publisher', function(done){
        msg.publisher = 'a@b.com';
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('cmd', 'send');
            hMessage.should.have.property('ref', msg.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK when published without any optional attr', function(done){
        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK with every field correct', function(done){
        msg.type = 'a type';
        msg.priority = 3;
        msg.relevance = new Date();
        msg.persistent = false;
        msg.location = {lng: '123123'};
        msg.author = 'a@b.com';
        msg.headers = { MAX_MSG_RETRIEVAL: 3, RELEVANCE_OFFSET: 5450};
        msg.payload = {};

        hClient.processMsgInternal(msg, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    describe('direct sending', function(){
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

        it('should receive sent message if actor was a user', function(done){
            msg.actor = config.validJID;

            hClient.once('hMessage', function(hMessage){
                hMessage.should.have.property('actor', config.validJID);
                done();
            });

            hClient.processMsgInternal(msg, function(hMessage){
                hMessage.payload.should.have.property('status', status.OK);
            });
        })

        it('should save in mongo the message if persistent and sent message if actor was a user', function(done){
            this.timeout(5000);
            msg.actor = config.logins[0].jid;
            msg.persistent = true;
            var counter = 0;

            hClient.on('hMessage', function(hMessage){
                hMessage.should.have.property('actor', config.logins[0].jid);
                config.db.get('hMessages').findOne({_id: msg.msgid}, function(err, doc){
                    should.not.exist(err);
                    doc.should.have.property('_id', msg.msgid);

                    done();
                })
            });

            hClient.processMsgInternal(msg, function(hMessage) {});
        })

    })

})