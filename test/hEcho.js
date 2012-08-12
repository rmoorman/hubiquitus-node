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

describe('hEcho', function(){

    var echoCmd;
    var hEcho;
    var status = require('../lib/codes.js').hResultStatus;

    beforeEach(function(done){
        echoCmd = {
            msgid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            priority : 0,
            publisher : 'fake jid',
            published : new Date(),
            payload : {
                cmd : 'hEcho',
                params : {hello: 'world'}
            }
        };

        hEcho = new hEchoModule();
        done();
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