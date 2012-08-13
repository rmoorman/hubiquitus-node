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

describe('hListFilters', function(){

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);
    var status = require('../lib/codes.js').hResultStatus;
    var cmd;
    var filterName = 'a filter';
    var activeChan = config.db.createPk();
    var activeChan2 = config.db.createPk();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChan, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChan2, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })

    beforeEach(function(){
        cmd = {
            msgid : 'testCmd',
            actor : 'hnode@' + hClient.serverDomain,
            type : 'hCommand',
            priority : 0,
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hListFilters'
            }
        };
    })

    it('should return hResult OK with an empty array as result if no filter exists', function(done){
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an empty array as result if actor does not contain filters', function(done){
        cmd.payload.params = {actor: 'i do not have filters'};
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an array having newly added filter as part of result', function(done){
        var filterCmd = {
            msgid : 'testCmd',
            actor : 'hnode@' + hClient.serverDomain,
            type : 'hCommand',
            priority : 0,
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
        hClient.processMsgInternal(filterCmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hClient.processMsgInternal(cmd, function(hMessage){

                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result');

                for(var i = 0; i < hMessage.payload.result.length; i++)
                    if(hMessage.payload.result[i].name == filterName)
                        done();
            })
        });
    })

    it('should return hResult OK with an array having only filters for specified channel', function(done){
        cmd.payload.params = {actor: activeChan2};

        var filterCmd = {
            msgid : 'testCmd',
            actor : 'hnode@' + hClient.serverDomain,
            type : 'hCommand',
            priority : 0,
            publisher : config.logins[0].jid,
            published : new Date(),
            payload : {
                cmd : 'hSetFilter',
                params : {
                    actor: activeChan2,
                    name: filterName,
                    relevant: true
                }
            }
        };
        hClient.processMsgInternal(filterCmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hClient.processMsgInternal(cmd, function(hMessage){

                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result');

                hMessage.payload.result.should.have.length(1);

                for(var i = 0; i < hMessage.payload.result.length; i++)
                    if(hMessage.payload.result[i].name == filterName)
                        done();
            })
        });
    })

    it('should return hResult OK with an array having filters for different channels if nothing specified', function(done){
        delete cmd.payload.params;

        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.should.have.property('result');

            hMessage.payload.result.should.have.length(2);
            done();
        });
    })

})