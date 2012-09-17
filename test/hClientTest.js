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

    })

    describe('#filterMessage()', function(){
        var cmdMsg, hMsg;
        var activeChan = config.getNewCHID();
        var filterName = config.db.createPk();
        var filterName2 = config.db.createPk();

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


            cmdMsg = {
                msgid : 'testCmd',
                convid : 'testCmd',
                actor : 'hnode@' + hClient.serverDomain,
                type : 'hCommand',
                priority : 0,
                publisher : config.logins[0].jid,
                published : new Date(),
                payload : {
                    cmd : 'hSetFilter',
                    params : {
                        actor : activeChan,
                        name: filterName
                    }
                }
            };

            hMsg = {
                msgid : config.db.createPk(),
                convid : config.db.createPk(),
                actor : activeChan,
                priority : 1,
                publisher : 'someone@domain.com',
                published : new Date()
            };

        })

        it('should return null if convid set in filter and do not match', function(done){
            cmdMsg.payload.params.template = {convid: config.db.createPk()};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if convid set in filter and matches', function(done){
            cmdMsg.payload.params.template = {convid: hMsg.msgid};
            hMsg.convid = hMsg.msgid;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if type set in filter and do not match', function(done){
            cmdMsg.payload.params.template = {type: config.db.createPk()};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if type set in filter and matches', function(done){
            cmdMsg.payload.params.template = {type: 'a type'};
            hMsg.type = 'a type';

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if priority set in filter and do not match', function(done){
            cmdMsg.payload.params.template = {priority: 5};
            hMsg.priority = 2;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if priority set in filter and matches', function(done){
            cmdMsg.payload.params.template = {priority: 5};
            hMsg.priority = 5;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if location in filter and msg does not have', function(done){
            cmdMsg.payload.params.template = {location: {zip: '75006'}};
            delete hMsg.location;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if location in filter has attr and msg does not', function(done){
            cmdMsg.payload.params.template = {location: {zip: '75006'}};
            hMsg.location = {};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if location in filter and same in msg but do not match', function(done){
            cmdMsg.payload.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75003'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if location in filter and same in msg', function(done){
            cmdMsg.payload.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75006'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if location attr in filter present and msg has also other attrs', function(done){
            cmdMsg.payload.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75006', addr: 'noway street'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if author set in filter and do not match', function(done){
            cmdMsg.payload.params.template = {author: 'im an author'};
            hMsg.author = 'im not the same author';

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if author set in filter and matches', function(done){
            cmdMsg.payload.params.template = {author: 'im an author'};
            hMsg.author = 'im an author';

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if publisher set in filter and do not match', function(done){
            cmdMsg.payload.params.template = {publisher: 'another@bites.the.dust'};
            hMsg.publisher = 'another@one.bites.the.dust';

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if publisher set in filter and matches', function(done){
            cmdMsg.payload.params.template = {publisher: 'another@bites.the.dust'};
            hMsg.publisher = 'another@bites.the.dust';

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if headers in filter and msg does not have', function(done){
            cmdMsg.payload.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            delete hMsg.headers;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if headers in filter has attr and msg does not', function(done){
            cmdMsg.payload.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if headers in filter and same in msg but do not match', function(done){
            cmdMsg.payload.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 21};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if headers in filter and same obj in msg', function(done){
            cmdMsg.payload.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 20};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if headers attr in filter present and msg has also other attrs', function(done){
            cmdMsg.payload.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 20, 'RELEVANCE_OFFSET': 5};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if payload in filter and msg does not have', function(done){
            cmdMsg.payload.params.template = {payload: {something: 'is awesome'}};
            delete hMsg.payload;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has attr and msg does not', function(done){
            cmdMsg.payload.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter and same in msg but do not match', function(done){
            cmdMsg.payload.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is not awesome'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an object inside like in msg but do not match', function(done){
            cmdMsg.payload.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'not awesome'}};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an array inside like in msg but with less elements', function(done){
            cmdMsg.payload.params.template = {payload: {something: ['is', 'awesome']}};
            hMsg.payload = {something: ['is', 'awesome', 'not']};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an array inside like in msg but in different order', function(done){
            cmdMsg.payload.params.template = {payload: {something: ['awesome', 'is']}};
            hMsg.payload = {something: ['is', 'awesome']};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);;
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if payload in filter and same obj in msg', function(done){
            cmdMsg.payload.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is awesome'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);;
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if payload attr in filter present and msg has also other attrs', function(done){
            cmdMsg.payload.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is awesome', like: 'life'};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if payload with obj in filter and same obj in payload in msg', function(done){
            cmdMsg.payload.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'awesome'}};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if payload with obj in filter and same obj in payload + others in msg', function(done){
            cmdMsg.payload.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'awesome', like: {maybe: 'life'}}};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if payload in filter has an array inside that matches msg', function(done){
            cmdMsg.payload.params.template = {payload: {something: ['awesome', 'is']}};
            hMsg.payload = {something: ['awesome', 'is']};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if radius set and distance is smaller than that in template', function(done){
            cmdMsg.payload.params.template = {location: {lat: 48.832563, lng: 2.34762}};
            cmdMsg.payload.params.radius = 5000;
            hMsg.location= {lat: 48.842012, lng: 2.330024};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if radius set and distance is smaller than that in template', function(done){
            cmdMsg.payload.params.template = {location: {lat: 48.832563, lng: 2.34762}};
            cmdMsg.payload.params.radius = 5000;
            hMsg.location= {lat: 48.842012, lng: 2.330024};

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if relevant set and msg does not have relevance attribute', function(done){
            cmdMsg.payload.params.relevant = true;
            delete hMsg.relevance;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if relevant set and msg is not relevant anymore', function(done){
            cmdMsg.payload.params.relevant = true;
            hMsg.relevance = new Date( new Date().getTime() - 15000);

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return msg if relevant set and msg is relevant', function(done){
            cmdMsg.payload.params.relevant = true;
            hMsg.relevance = new Date( new Date().getTime() + 15000);

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if msg passes first filter but not second one', function(done){
            cmdMsg.payload.params.template = {priority: 5};
            hMsg.priority = 5;

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);

                cmdMsg.payload.params.name = filterName2;
                cmdMsg.payload.params.template = {publisher: 'someone@else.com'};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    should.not.exist(hClient.filterMessage(hMsg));
                    done();
                });
            });
        })

        it('should return msg if there are two filters and passes both', function(done){
            cmdMsg.payload.params.template = {priority: 5};
            hMsg.priority = 5;
            hMsg.publisher = 'someone@else.com'

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);

                cmdMsg.payload.params.name = filterName2;
                cmdMsg.payload.params.template = {publisher: 'someone@else.com'};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    hClient.filterMessage(hMsg).should.be.eql(hMsg);
                    done();
                });
            });
        })

    })

    describe('#processMsgInternal()', function(){
        var cmdMsg, hMsg;

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        beforeEach(function(){


            cmdMsg = {
                msgid : 'testCmd',
                convid : 'testCmd',
                actor : 'hnode@' + hClient.serverDomain,
                type : 'hCommand',
                priority : 0,
                publisher : config.logins[1].jid,
                published : new Date(),
                payload : {}
            };
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
                item.payload.should.have.property('cmd', cmdMsg.payload.cmd);
                item.should.not.have.property('persistent');
                item.should.not.have.property('msgid');

                config.db.get('hMessages').findOne({ _id: item._id}, testResult);
            };

            //Called by testCommand
            var testResult = function(err, item2) {
             should.not.exist(err);
             should.exist(item2);
             item2.should.have.property('type', 'hResult');
             item2.payload.should.have.property('cmd', cmdMsg.cmd);
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