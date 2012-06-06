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
var db = require('../lib/mongo.js').db;

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('hCommand', function(){

    var hCommandController;
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var mongoURI = 'mongodb://localhost/test';
    var params = {
        jid: 'hnode',
        password: 'password',
        host: 'localhost',
        port: 5276,
        modulePath : 'test/aux',
        timeout : 1000
    };

    before(function(done){
        db.on('connect', done);
        db.connect(mongoURI);
    })

    after(function(done){
        db.on('disconnect', done);
        db.disconnect();
    })

    describe('#Process an hCommand', function(){

        beforeEach(function(){
            cmd = {
                reqid  : 'hCommandTest123',
                sender : 'fake jid',
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'dummyCommand'
            };

            hCommandController = new Controller(params);
        })

        it('should call module when module exists', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.OK);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should call module when cmd with different case', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.OK);
                done();
            });
            cmd.cmd = 'dummycommand';
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult when command not found', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.NOT_AVAILABLE);
                done();
            });

            cmd.cmd = 'inexistent command';
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult when command timesout', function(done){
            cmd.cmd = 'nothingCommand'; //Does nothing, forces timeout

            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.EXEC_TIMEOUT);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should not allow command to call cb if after timeout', function(done){
            this.timeout(3000);

            cmd.cmd = 'lateFinisher'; //Calls callback at 2seg

            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.EXEC_TIMEOUT);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should allow command to change timeout', function(done){
            this.timeout(4000);

            cmd.cmd = 'timeoutChanger'; //Calls callback at 2seg

            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('status', status.OK);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should ignore empty hcommands', function(done){
            hCommandController.on('hResult', function(res){
                //If it enters here there was a problem (multiple calls to done)
                done();
            });
            hCommandController.emit('hCommand', {});
            done();
        })

    })

})