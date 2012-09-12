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

describe('hSetFilter', function(){

    var config = require('./_config.js');

    var hResultStatus = require('../lib/codes.js').hResultStatus;
    var hCommandController = new config.cmdController(config.cmdParams);

    var cmd = {};
    var activeChan = config.getNewCHID();
    var inactiveChan = config.getNewCHID();
    var filterName = config.db.createPk();

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.logins[0].jid], config.logins[0].jid, false, done);
    })

    beforeEach(function(){
        cmd = {
            msgid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hSetFilter',
                params : {
                    actor: activeChan,
                    name: filterName
                }
            }
        };
    })

    it('should return hResult INVALID_ATTR if params is not present', function(done){
        delete cmd.payload.params;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AUTHORIZED if the channel is inactive', function(done){
        cmd.payload.params.actor = inactiveChan;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AVAILABLE if the actor does not exist', function(done){
        cmd.payload.params.actor = 'not a valid actor';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AUTHORIZED if the client is not in participants list', function(done){
        cmd.publisher = 'not_in_part@' + config.validDomain;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult MISSING_ATTR if actor is missing', function(done){
        delete cmd.payload.params.actor;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/actor/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if name is missing', function(done){
        delete cmd.payload.params.name;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/name/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if relevance is specified', function(done){
        cmd.payload.params.template = {relevance: new Date() };
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/relevance/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if published is specified', function(done){
        cmd.payload.params.template = {published: new Date() };
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/published/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if persistent is specified', function(done){
        cmd.payload.params.template = {persistent: false};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/persistent/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if msgid is specified', function(done){
        cmd.payload.params.template = {msgid: config.db.createPk()};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/msgid/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if actor is specified in template', function(done){
        cmd.payload.params.template = {actor: config.db.createPk()};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/actor/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if radius specified but lat missing', function(done){
        cmd.payload.params.radius = 1000;
        cmd.payload.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if radius specified but lng missing', function(done){
        cmd.payload.params.radius = 1000;
        cmd.payload.params.template = {location: {lat: Math.random()*100000 }};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/lat/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lat is specified but radius is not', function(done){
        cmd.payload.params.template = {location: {lat: Math.random()*100000 }};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/lat/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lng is specified but radius is not', function(done){
        cmd.payload.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lng is specified but radius is not', function(done){
        cmd.payload.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if headers is specified but not an object', function(done){
        cmd.payload.params.template = {headers: 'not an object'};
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.result.should.be.a('string').and.match(/headers/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if nothing was set', function(done){
        delete cmd.payload.params.relevant;
        delete cmd.payload.params.radius;
        delete cmd.payload.params.template;

        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult OK adding a filter if everything is correct', function(done){
        cmd.payload.params.template = {publisher: 'someone@someone.com'};
        cmd.payload.params.name = filterName;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            should.exist(hCommandController.context.hClient.filters[activeChan][filterName]);
            done();
        });
    })

    it('should return hResult OK updating a filter if exists and everything is correct', function(done){
        cmd.payload.params.template = {publisher: 'someoneElse@someone.com'};
        cmd.payload.params.name = filterName;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            should.exist(hCommandController.context.hClient.filters[activeChan][filterName]);
            hCommandController.context.hClient.filters[activeChan][filterName].should.have.property('template', cmd.payload.params.template);
            done();
        });
    })

    describe('hClient filter', function(){
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

        it('should add filters and add it to list of filtersOrder', function(done){
            cmd.payload.params.template = {publisher: 'someone@someone.com'};
            cmd.publisher = config.logins[0].jid;
            cmd.payload.params.name = filterName;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('status', hResultStatus.OK);
                hClient.filters[activeChan].should.have.property(filterName);
                hClient.filtersOrder[activeChan].should.include(filterName);
                done();
            });
        })

        it('should add a second filter after first one in filterOrder', function(done){
            cmd.payload.params.template = {publisher: 'another@someone.com'};
            cmd.publisher = config.logins[0].jid;
            cmd.payload.params.name = config.db.createPk();
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[activeChan][1].should.be.eql(cmd.payload.params.name);
                done();
            });
        })

        it('should update filter without altering filterOrder', function(done){
            cmd.payload.params.template = {publisher: 'another@someone.com'};
            cmd.publisher = config.logins[0].jid;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[activeChan][0].should.be.eql(filterName);
                hClient.filtersOrder[activeChan].should.have.lengthOf(2);
                done();
            });
        })

    })
})