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

describe('hSubscribe', function(){

    var hCommandController;
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = 'Existing ID';
    var jidInParticipants = 'u1@localhost';
    var mongoURI = 'mongodb://localhost/test';

    var controllerParams= {
        jid: 'hnode.localhost',
        password: 'password',
        host: 'localhost',
        port: 5276,
        modulePath : 'lib/hcommands',
        timeout : 5000
    };

    before(function(done){
        db.on('connect', done);
        db.connect(mongoURI);
    })

    after(function(done){
        db.on('disconnect', done);
        db.disconnect();
    })

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : jidInParticipants,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hSubscribe',
            params : {chid: Math.random()}
        };
        hCommandController = new Controller(controllerParams);
    })

    it('should emit hResult error when missing params', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
        delete cmd['params'];
        hCommandController.emit('hCommand', {hCommand: cmd});
    })

    it('should emit hResult error when chid doesnt exist', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            res.hResult.should.have.property('cmd', cmd.cmd);
            res.hResult.should.have.property('reqid', cmd.reqid);
            res.hResult.should.have.property('status').and.equal(status.NOT_AUTHORIZED);
            res.hResult.should.have.property('result').and.be.a('string');
            done();
        });
        cmd.params = {chid: 'this CHID does not exist'};
        hCommandController.emit('hCommand', {hCommand: cmd});
    })

    it('should emit hResult error if not in participants list', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
        cmd.params = {chid: existingCHID};
        cmd.sender = 'not in list';
        hCommandController.emit('hCommand', {hCommand: cmd});
    })

    it('should emit hResult when correct', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
        cmd.params = {chid: existingCHID};
        cmd.sender = jidInParticipants;
        hCommandController.emit('hCommand', {hCommand: cmd});
    })

    it('should emit hResult error if already subscribed', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
        cmd.params = {chid: existingCHID};
        cmd.sender = jidInParticipants;
        hCommandController.emit('hCommand', {hCommand: cmd});
    })

})