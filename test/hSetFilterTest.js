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
        cmd = config.makeHMessage('hnode@localhost', config.logins[0].jid, 'hCommand',{});
        cmd.msgid = 'testCmd';
        cmd.payload = {
                cmd : 'hSetFilter',
                params : {
                    actor: activeChan,
                    filter: {
                        in:{
                            publisher: ['u1@locahost']
                        }
                    }
                }
        };
    })

    it('should return hResult OK if params filter is present', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            done();
        });
    })
})