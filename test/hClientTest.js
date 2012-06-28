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
        var cmd, hMsg;
        var activeChan = config.db.createPk();
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
            config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
        })

        beforeEach(function(){
            cmd = {
                reqid: 'testCmd',
                entity: 'hnode@' + hClient.domain,
                sender: config.logins[0].jid,
                cmd: 'hSetFilter',
                params: {
                    chid: activeChan,
                    name: filterName
                }
            };

            hMsg = {
                chid: activeChan,
                msgid: config.db.createPk(),
                convid: config.db.createPk(),
                priority: 1,
                publisher: 'someone@domain.com',
                published: new Date()
            }

        })

        it('should return null if convid set in filter and do not match', function(done){
            cmd.params.template = {convid: config.db.createPk()};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if convid set in filter and matches', function(done){
            cmd.params.template = {convid: hMsg.msgid};
            hMsg.convid = hMsg.msgid;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if type set in filter and do not match', function(done){
            cmd.params.template = {type: config.db.createPk()};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if type set in filter and matches', function(done){
            cmd.params.template = {type: 'a type'};
            hMsg.type = 'a type';

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if priority set in filter and do not match', function(done){
            cmd.params.template = {priority: 5};
            hMsg.priority = 2;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if priority set in filter and matches', function(done){
            cmd.params.template = {priority: 5};
            hMsg.priority = 5;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if location in filter and msg does not have', function(done){
            cmd.params.template = {location: {zip: '75006'}};
            delete hMsg.location;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if location in filter has attr and msg does not', function(done){
            cmd.params.template = {location: {zip: '75006'}};
            hMsg.location = {};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if location in filter and same in msg but do not match', function(done){
            cmd.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75003'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if location in filter and same in msg', function(done){
            cmd.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75006'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if location attr in filter present and msg has also other attrs', function(done){
            cmd.params.template = {location: {zip: '75006'}};
            hMsg.location = {zip: '75006', addr: 'noway street'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if author set in filter and do not match', function(done){
            cmd.params.template = {author: 'im an author'};
            hMsg.author = 'im not the same author';

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if author set in filter and matches', function(done){
            cmd.params.template = {author: 'im an author'};
            hMsg.author = 'im an author';

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if publisher set in filter and do not match', function(done){
            cmd.params.template = {publisher: 'another@bites.the.dust'};
            hMsg.publisher = 'another@one.bites.the.dust';

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if publisher set in filter and matches', function(done){
            cmd.params.template = {publisher: 'another@bites.the.dust'};
            hMsg.publisher = 'another@bites.the.dust';

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if headers in filter and msg does not have', function(done){
            cmd.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            delete hMsg.headers;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if headers in filter has attr and msg does not', function(done){
            cmd.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if headers in filter and same in msg but do not match', function(done){
            cmd.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 21};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if headers in filter and same obj in msg', function(done){
            cmd.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 20};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if headers attr in filter present and msg has also other attrs', function(done){
            cmd.params.template = {headers: {'MAX_MSG_RETRIEVAL': 20}};
            hMsg.headers = {'MAX_MSG_RETRIEVAL': 20, 'RELEVANCE_OFFSET': 5};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if payload in filter and msg does not have', function(done){
            cmd.params.template = {payload: {something: 'is awesome'}};
            delete hMsg.payload;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has attr and msg does not', function(done){
            cmd.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter and same in msg but do not match', function(done){
            cmd.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is not awesome'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an object inside like in msg but do not match', function(done){
            cmd.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'not awesome'}};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an array inside like in msg but with less elements', function(done){
            cmd.params.template = {payload: {something: ['is', 'awesome']}};
            hMsg.payload = {something: ['is', 'awesome', 'not']};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return null if payload in filter has an array inside like in msg but in different order', function(done){
            cmd.params.template = {payload: {something: ['awesome', 'is']}};
            hMsg.payload = {something: ['is', 'awesome']};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                should.not.exist(hClient.filterMessage(hMsg));
                done();
            });
        })

        it('should return message if payload in filter and same obj in msg', function(done){
            cmd.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is awesome'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if payload attr in filter present and msg has also other attrs', function(done){
            cmd.params.template = {payload: {something: 'is awesome'}};
            hMsg.payload = {something: 'is awesome', like: 'life'};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return message if payload with obj in filter and same obj in payload in msg', function(done){
            cmd.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'awesome'}};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if payload with obj in filter and same obj in payload + others in msg', function(done){
            cmd.params.template = {payload: {something: {'is': 'awesome'}}};
            hMsg.payload = {something: {'is': 'awesome', like: {maybe: 'life'}}};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if payload in filter has an array inside that matches msg', function(done){
            cmd.params.template = {payload: {something: ['awesome', 'is']}};
            hMsg.payload = {something: ['awesome', 'is']};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if radius set and distance is smaller than that in template', function(done){
            cmd.params.template = {location: {lat: 48.832563, lng: 2.34762}};
            cmd.params.radius = 5000;
            hMsg.location= {lat: 48.842012, lng: 2.330024};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return msg if radius set and distance is smaller than that in template', function(done){
            cmd.params.template = {location: {lat: 48.832563, lng: 2.34762}};
            cmd.params.radius = 5000;
            hMsg.location= {lat: 48.842012, lng: 2.330024};

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);
                hClient.filterMessage(hMsg).should.be.eql(hMsg);
                done();
            });
        })

        it('should return null if msg passes first filter but not second one', function(done){
            cmd.params.template = {priority: 5};
            hMsg.priority = 5;

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);

                cmd.params.name = filterName2;
                cmd.params.template = {publisher: 'someone@else.com'};
                hClient.command(cmd, function(hResult){
                    hResult.should.have.property('status', codes.hResultStatus.OK);
                    should.not.exist(hClient.filterMessage(hMsg));
                    done();
                });
            });
        })

        it('should return msg if there are two filters and passes both', function(done){
            cmd.params.template = {priority: 5};
            hMsg.priority = 5;
            hMsg.publisher = 'someone@else.com'

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', codes.hResultStatus.OK);

                cmd.params.name = filterName2;
                cmd.params.template = {publisher: 'someone@else.com'};
                hClient.command(cmd, function(hResult){
                    hResult.should.have.property('status', codes.hResultStatus.OK);
                    hClient.filterMessage(hMsg).should.be.eql(hMsg);
                    done();
                });
            });
        })

    })

})