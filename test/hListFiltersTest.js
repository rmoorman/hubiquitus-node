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

describe('hGetChannels', function(){

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
        config.createChannel(activeChan, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
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
            reqid: 'testCmd',
            entity: 'hnode@' + hClient.domain,
            sender: config.logins[0].jid,
            cmd: 'hListFilters'
        };
    })

    it('should return hResult OK with an empty array as result if no filter exists', function(done){
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an empty array as result if chid does not contain filters', function(done){
        cmd.params = {chid: 'i do not have filters'};
        hClient.command(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an array having newly added filter as part of result', function(done){
        hClient.command({
            reqid: 'testCmd',
            entity: 'hnode@' + hClient.domain,
            sender: config.logins[0].jid,
            cmd: 'hSetFilter',
            params: {
                chid: activeChan,
                name: filterName,
                relevant: true
            }
        }, function(hResult){

            hResult.should.have.property('status', status.OK);
            hClient.command(cmd, function(hResult){

                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result');

                for(var i = 0; i < hResult.result.length; i++)
                    if(hResult.result[i].name == filterName)
                        done();
            })
        });

    })

    it('should return hResult OK with an array having only filters for specified channel', function(done){
        cmd.params = {chid: activeChan2};

        hClient.command({
            reqid: 'testCmd',
            entity: 'hnode@' + hClient.domain,
            sender: config.logins[0].jid,
            cmd: 'hSetFilter',
            params: {
                chid: activeChan2,
                name: filterName,
                relevant: true
            }
        }, function(hResult){

            hResult.should.have.property('status', status.OK);
            hClient.command(cmd, function(hResult){

                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result');

                hResult.result.should.have.length(1);

                for(var i = 0; i < hResult.result.length; i++)
                    if(hResult.result[i].name == filterName)
                        done();
            })
        });

    })

    it('should return hResult OK with an array having filters for different channels if nothing specified', function(done){
        delete cmd.params;


        hClient.command(cmd, function(hResult){

            hResult.should.have.property('status', status.OK);
            hResult.should.have.property('result');

            hResult.result.should.have.length(2);
            done();
        })

    })

})