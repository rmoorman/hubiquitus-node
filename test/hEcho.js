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
var hEchoModule = require('../lib/hcommands/hEcho.js').Command;
var config = require('./_config.js');

describe('hEcho', function(){

    var echoCmd;
    var hEcho;
    var status = require('../lib/codes.js').hResultStatus;
    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })
    console.log('ici');
    beforeEach(function(done){
        echoCmd = config.makeHMessage('hnode@localhost', config.logins[0].jid, 'hCommand',{});
        echoCmd.msgid = 'hCommandTest123';
        echoCmd.payload = {
                cmd : 'hEcho',
                params : {hello: 'world'}
        } ;

        hEcho = new hEchoModule();
        done();
    })

    it('should return hResult error if the hMessage can not be treat', function(done){
        echoCmd.payload.params.error = 'DIV0';
        hClient.processMsgInternal(echoCmd, function(hMessage){
            hMessage.should.have.property('ref', echoCmd.msgid);
            hMessage.payload.should.have.property('status', status.TECH_ERROR);
            done();
        });
    })

    describe('#Execute hEcho', function(){
        it('should emit result echoing input', function(done){
            hEcho.exec(echoCmd, null, function(statusValue, resultValue){
                should.exist(statusValue);
                should.exist(resultValue);
                statusValue.should.be.equal(status.OK);
                resultValue.should.be.equal(echoCmd.payload.params);
                done();
            });
        })
    })

})