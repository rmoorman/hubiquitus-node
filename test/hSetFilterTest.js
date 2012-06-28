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
    var activeChan = config.db.createPk();
    var inactiveChan = config.db.createPk();
    var filterName = config.db.createPk();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChan, [config.logins[0].jid], config.logins[0].jid, false, done);
    })

    beforeEach(function(){
        cmd = {
            reqid: 'testCmd',
            sender: config.logins[0].jid,
            cmd: 'hSetFilter',
            params: {
                chid: activeChan,
                name: filterName
            }
        };
    })

    it('should return hResult INVALID_ATTR if params is not present', function(done){
        delete cmd.params;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AUTHORIZED if the chid is inactive', function(done){
        cmd.params.chid = inactiveChan;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AVAILABLE if the chid does not exist', function(done){
        cmd.params.chid = 'not a valid chid';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AUTHORIZED if the client is not in participants list', function(done){
        cmd.sender = 'not in part@domain.com';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult MISSING_ATTR if chid is missing', function(done){
        delete cmd.params.chid;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string').and.match(/chid/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if name is missing', function(done){
        delete cmd.params.name;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string').and.match(/name/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if relevance is specified', function(done){
        cmd.params.template = {relevance: new Date() };
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/relevance/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if published is specified', function(done){
        cmd.params.template = {published: new Date() };
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/published/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if transient is specified', function(done){
        cmd.params.template = {transient: true };
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/transient/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if radius specified but lat missing', function(done){
        cmd.params.radius = 1000;
        cmd.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult MISSING_ATTR if radius specified but lng missing', function(done){
        cmd.params.radius = 1000;
        cmd.params.template = {location: {lat: Math.random()*100000 }};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string').and.match(/lat/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lat is specified but radius is not', function(done){
        cmd.params.template = {location: {lat: Math.random()*100000 }};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/lat/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lng is specified but radius is not', function(done){
        cmd.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if lng is specified but radius is not', function(done){
        cmd.params.template = {location: {lng: Math.random()*100000 }};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/lng/);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if headers is specified but not an object', function(done){
        cmd.params.template = {headers: 'not an object'};
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string').and.match(/headers/);
            done();
        });
    })

    it('should return hResult OK adding a filter if everything is correct', function(done){
        cmd.params.template = {publisher: 'someone@someone.com'};
        cmd.params.name = filterName;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.OK);
            should.exist(hCommandController.context.filters[filterName]);
            done();
        });
    })

    it('should return hResult OK updating a filter if exists and everything is correct', function(done){
        cmd.params.template = {publisher: 'someoneElse@someone.com'};
        cmd.params.name = filterName;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.OK);
            should.exist(hCommandController.context.filters[filterName]);
            hCommandController.context.filters[filterName].should.have.property('template', cmd.params.template);
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
            cmd.params.template = {publisher: 'someone@someone.com'};
            cmd.entity = 'hnode@' + hClient.domain;
            cmd.params.name = filterName;
            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', hResultStatus.OK);
                hClient.filters.should.have.property(filterName);
                hClient.filtersOrder.should.include(filterName);
                done();
            });
        })

        it('should add a second filter after first one in filterOrder', function(done){
            cmd.params.template = {publisher: 'another@someone.com'};
            cmd.entity = 'hnode@' + hClient.domain;
            cmd.params.name = config.db.createPk();
            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[1].should.be.eql(cmd.params.name);
                done();
            });
        })

        it('should update filter without altering filterOrder', function(done){
            cmd.params.template = {publisher: 'another@someone.com'};
            cmd.entity = 'hnode@' + hClient.domain;
            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[0].should.be.eql(filterName);
                hClient.filtersOrder.should.have.lengthOf(2);
                done();
            });
        })

    })
})