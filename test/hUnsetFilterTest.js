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
        this.timeout(5000);
        config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
    })

    before(function(done){
        var setCmd = {
            msgid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hSetFilter',
                params : {
                    actor: activeChan,
                    name: filterName,
                    relevant: true
                }
            }
        };

        hCommandController.execCommand(setCmd,function(hMessage){
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            done();
        });
    })

    before(function(done){
        var setCmd = {
            msgid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hSetFilter',
                params : {
                    actor: activeChan,
                    name: filterName2,
                    relevant: true
                }
            }
        };

        hCommandController.execCommand(setCmd,function(hMessage){
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            done();
        });
    })

    beforeEach(function(){
        cmd = {
            msgid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hUnsetFilter',
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


    it('should return hResult NOT_AVAILABLE if the filter is not found', function(done){
        cmd.payload.params.name = 'not a valid filter';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult NOT_AVAILABLE if the channel does not exist or is not found', function(done){
        cmd.payload.params.actor = 'not a valid channel';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.NOT_AVAILABLE);
            hMessage.payload.result.should.be.a('string');
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

    it('should return hResult OK removing a filter if everything is correct', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.OK);
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
            var setCmd = {
                msgid : 'testCmd',
                actor : 'session',
                type : 'hCommand',
                publisher : config.logins[0].jid,
                published : new Date(),
                payload : {
                    cmd : 'hSetFilter',
                    params : {
                        actor: activeChan,
                        name: filterName2,
                        relevant: true
                    }
                }
            };

            hClient.processMsgInternal(setCmd,function(hMessage){
                hMessage.payload.should.have.property('status', hResultStatus.OK);
                done();
            });
        })

        it('should remove filter from the hClient', function(done){
            cmd.publisher = config.logins[0].jid;
            cmd.payload.params.name = filterName2;
            hClient.filtersOrder[activeChan].should.have.lengthOf(1);
            should.exist(hClient.filters[activeChan][hClient.filtersOrder[activeChan][0]]);

            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.payload.should.have.property('status', hResultStatus.OK);
                hClient.filtersOrder[activeChan].should.have.lengthOf(0);
                should.not.exist(hClient.filters[activeChan][filterName2]);
                done();
            });
        })

    })

})