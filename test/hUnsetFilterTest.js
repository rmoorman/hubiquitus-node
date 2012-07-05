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

describe('hUnsetFilter', function(){

    var config = require('./_config.js');

    var hResultStatus = require('../lib/codes.js').hResultStatus;
    var hCommandController = new config.cmdController(config.cmdParams);

    var cmd = {};
    var activeChan = config.getNewCHID();
    var filterName = config.db.createPk();
    var filterName2 = config.db.createPk();



    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
    })

    before(function(done){
        hCommandController.execCommand({
            reqid: 'testCmd',
            sender: config.logins[0].jid,
            cmd: 'hSetFilter',
            params: {
                chid: activeChan,
                name: filterName,
                relevant: true
            }
        }, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.OK);
            done();
        });
    })

    before(function(done){
        hCommandController.execCommand({
            reqid: 'testCmd',
            sender: config.logins[0].jid,
            cmd: 'hSetFilter',
            params: {
                chid: activeChan,
                name: filterName2,
                relevant: true
            }
        }, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.OK);
            done();
        });
    })

    beforeEach(function(){
        cmd = {
            reqid: 'testCmd',
            sender: config.logins[0].jid,
            cmd: 'hUnsetFilter',
            params: {
                name: filterName,
                chid: activeChan
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


    it('should return hResult NOT_AVAILABLE if the filter is not found', function(done){
        cmd.params.name = 'not a valid filter';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AVAILABLE if the channel does not exist is not found', function(done){
        cmd.params.chid = 'not a valid channel';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
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

    it('should return hResult MISSING_ATTR if chid is missing', function(done){
        delete cmd.params.chid;
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string').and.match(/chid/);
            done();
        });
    })

    it('should return hResult OK removing a filter if everything is correct', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', hResultStatus.OK);
            should.not.exist(hCommandController.context.hClient.filters[activeChan][filterName]);
            hCommandController.context.hClient.filtersOrder[activeChan].should.have.lengthOf(1);
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

        before(function(done){

            hClient.command({
                reqid: 'testCmd',
                entity: 'hnode@' + hClient.domain,
                sender: config.logins[0].jid,
                cmd: 'hSetFilter',
                params: {
                    chid: activeChan,
                    name: filterName2,
                    relevant: true
                }
            }, function(hResult){
                hResult.should.have.property('status', hResultStatus.OK);
                done();
            });
        })

        it('should remove filter from the hClient', function(done){
            cmd.entity = 'hnode@' + hClient.domain;
            cmd.params.name = filterName2;
            hClient.filtersOrder[activeChan].should.have.lengthOf(1);
            should.exist(hClient.filters[activeChan][hClient.filtersOrder[activeChan][0]]);

            hClient.command(cmd, function(hResult){
                hResult.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[activeChan].should.have.lengthOf(0);
                should.not.exist(hClient.filters[activeChan][filterName2]);
                done();
            });
        })

    })

})