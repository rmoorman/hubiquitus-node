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
var mongoose = require('mongoose');

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};


describe('hGetLastMessages', function(){

    var hCommandController;
    var cmd;
    var status;
    var params;
    var existingCHID = 'Existing ID';
    var validJID = 'u1@localhost';
    var mongoURI = 'mongodb://localhost/test';

    describe('#hGetLastMessages', function(){
        before(function(){
            params = {
                jid: 'hnode.localhost',
                password: 'password',
                host: 'localhost',
                'mongo.URI' : mongoURI,
                port: 5276,
                modulePath : 'lib/hcommands',
                timeout : 5000
            };
            status = require('../lib/codes.js').hResultStatus;
        })

        beforeEach(function(){
            cmd= {
                reqid  : 'hCommandTest123',
                sender : validJID,
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'hGetLastMessages',
                params : {
                    chid: existingCHID,
                    quant: 5
                }
            };
            hCommandController = new Controller(params);
        })

        afterEach(function(done){
            mongoose.connect(mongoURI);
            mongoose.connection.close(done);
        })

        it('should emit hResult ok if there are no hMessages stored', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult error if no params is passed', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.INVALID_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
            delete cmd.params;
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult error if no channel is passed', function(done){
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
            delete cmd.params.chid;
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult error if publisher not in participants list', function(done){
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
            cmd.sender = 'not in list';
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult ok without quant', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array);
                done();
            });
            delete cmd.params.quant;
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult ok if there are hMessages', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

    })
})