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
var status = require('../lib/codes.js').hResultStatus;
var hEchoModule = require('../lib/hcommands/hEcho.js').Command;

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('hEcho', function(){

    var echoCmd;
    var hEcho;

    beforeEach(function(done){
        echoCmd = {
            reqid  : 'hCommandTest123',
            sender : 'fake jid',
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hEcho',
            params : {hello : 'world'}
        };
        hEcho = new hEchoModule();
        done();
    })

    describe('#Execute hEcho', function(){
        it('should emit result echoing input', function(done){
            hEcho.on('result', function(res){
                should.exist(res);
                res.should.have.property('hCommand');
                res.should.have.property('status', status.OK);
                res.should.have.property('result', echoCmd.params);
                done();
            });
            hEcho.exec(echoCmd, null);
        })
    })
})