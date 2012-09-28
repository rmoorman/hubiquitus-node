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
var codes = require('../lib/codes.js');
var validators = require('../lib/validators.js');

describe('hClient XMPP Connection', function(){

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    describe('#connect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
        })

        afterEach(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        it('should emit an event when connected', function(done){
            hClient.once('connect', done);
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.AUTH_FAILED);
                done() });
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.JID_MALFORMAT);
                done();
            });
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when invalid domain', function(done){
            var user = validators.splitJID(xmppOptions.jid)
            xmppOptions.jid = user[0] + '@anotherDomain';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.AUTH_FAILED);
                done();
            });
            hClient.connect(xmppOptions);
        })
    })

    describe('#FilterMessage()', function(){
        var cmdMsg, hMsg;
        var activeChan = config.getNewCHID();

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        before(function(done){
            this.timeout(5000);
            config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
        })

        beforeEach(function(){
            cmdMsg = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[0].jid, 'hCommand',{});
            cmdMsg.payload = {
                cmd : 'hCreateUpdateChannel',
                params : {
                    type: 'channel',
                    actor : activeChan,
                    active : true,
                    owner : config.logins[0].jid,
                    subscribers : [config.logins[0].jid],
                    filter: {
                        in:{
                            publisher: ['u1@localhost']
                        }
                    }
                }
            };

            hMsg = config.makeHMessage(activeChan, config.logins[0].jid, undefined, {})
            hMsg.priority = 1;
        })

        it('should return Ok', function(done){
            hClient.processMsgInternal(cmdMsg, function(){});
            hClient.processMsgInternal(hMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        it('should return INVALID_ATTR if hMessage don\'t respect filter', function(done){
            cmdMsg.payload.params.filter.in.publisher = ['u2@localhost'];
            hClient.processMsgInternal(cmdMsg, function(){});
            hClient.processMsgInternal(hMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                done();
            });
        })
    })

    describe('#processMsgInternal()', function(){
        var cmdMsg;

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        beforeEach(function(){
            cmdMsg = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[1].jid, 'hCommand',{});
        })

        it('should return hResult error INVALID_ATTR if actor is not a valide JID', function(done){
            cmdMsg.actor = "invalid JID";
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.MISSING_ATTR);
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if user different than publisher', function(done){
            cmdMsg.publisher = "another@jid";
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.NOT_AUTHORIZED);
                done();
            });
        })

        it('should allow to process message if user has resource and publisher doesnt', function(done){
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        it('should allow to process message if publisher has resource and user doesnt', function(done){
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            hClient.jid = hClient.jid.split("/")[0];
            cmdMsg.publisher = config.logins[1].jid;
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        it('should save hCommand and hResult with same _id when persistent=true without msgid and persistent', function(done){
            cmdMsg.persistent = true;
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            cmdMsg.payload.params.randomValue = '' + config.db.createPk();

            //Sequence: execCommand, testCommand, testResult

            var testCommand = function(err, item){
                should.not.exist(err);
                should.exist(item);
                item.should.have.property('type', 'hResult');
                item.should.not.have.property('persistent');
                item.should.not.have.property('msgid');

                config.db.get('hMessages').findOne({ _id: item._id}, testResult);
            };

            //Called by testCommand
            var testResult = function(err, item2) {
             should.not.exist(err);
             should.exist(item2);
             item2.should.have.property('type', 'hResult');
             item2.should.not.have.property('persistent');
             item2.should.not.have.property('msgid');
             done();
             };

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);

                config.db.get('hMessages').findOne({"payload.result.randomValue": cmdMsg.payload.params.randomValue}, testCommand);

            });
        })

    })

})