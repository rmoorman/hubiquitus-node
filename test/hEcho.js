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

describe('hEcho', function(){

    var hCommandController;
    var echoCmd;

    beforeEach(function(done){
        var params = {
            modulePath : 'lib/hcommands',
            timeout : 5000,
            'mongo.URI' : 'mongodb://localhost/test'
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

    describe('#Execute hEcho', function(){
        it('should emit hResult echoing input', function(done){
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
    })
})