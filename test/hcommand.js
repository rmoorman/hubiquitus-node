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
var Controller = require('../lib/hcommand_controller.js').Controller;
var status = require('../lib/codes.js').hResultStatus;

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('hCommand', function(){

    var hCommandController;
    var echoCmd;

    beforeEach(function(done){
        var params = {
            modulePath : 'lib/hcommands',
            timeout : 5000
        };
        hCommandController = new Controller(params);
        echoCmd = {
            reqid  : 'hCommandTest123',
            sender : 'fake jid',
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hEcho',
            params : {hello : 'world'}
        };
        done();
    })
    describe('#Process an hCommand', function(){
        it('should emit hResult when command finishes', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', echoCmd.cmd);
                hResult.should.have.property('reqid', echoCmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.eql(echoCmd.params);
                done();
            });
            hCommandController.emit('hCommand', {from: echoCmd.sender, hCommand: echoCmd});
        })

        it('should emit hResult when command not found', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.NOT_AVAILABLE);
                done();
            });

            echoCmd.cmd = 'inexistent command';
            hCommandController.emit('hCommand', {from: echoCmd.sender, hCommand: echoCmd});
        })

        it('should emit hResult when invalid credentials', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.INVALID_ATTR);
                done();
            });

            hCommandController.emit('hCommand', {from: 'another jid', hCommand: echoCmd});
        })

        it('should emit hResult not accepting bare jid from and full jid sender', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.INVALID_ATTR);
                done();
            });
            echoCmd.sender = 'a@b/asd';

            hCommandController.emit('hCommand', {from: 'a@b', hCommand: echoCmd});
        })

        it('should emit hResult accepting full jid from and bare jid sender', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.OK);
                done();
            });
            echoCmd.sender = 'a@b';

            hCommandController.emit('hCommand', {from: echoCmd.sender + '/asd', hCommand: echoCmd});
        })

        it('should emit hResult when command timesout', function(done){
            var params = {
                modulePath : 'test/aux',
                timeout : 1000
            };
            hCommandController = new Controller(params);
            var nothingCommand = echoCmd;
            nothingCommand.cmd = 'nothingCommand'; //Does nothing, forces timeout

            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.EXEC_TIMEOUT);
                done();
            });
            hCommandController.emit('hCommand', {from: echoCmd.sender, hCommand: nothingCommand});
        })
    })
})