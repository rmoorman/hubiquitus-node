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
    var createCmd;
    var defaultParams;

    describe('#hCreateChannel', function(){
        beforeEach(function(done){
            var params = {
                modulePath : 'lib/hcommands',
                timeout : 10000,
                'mongo.URI' : 'mongodb://localhost/test'
            };

            hCommandController = new Controller(params);
            defaultParams = {
                chid : new Date() + Math.floor(Math.random()*1000000000000000000001),
                active : 'Y',
                host : 'a',
                owner : 'p',
                participants : ['']
            };
            createCmd= {
                reqid  : 'hCommandTest123',
                sender : 'fake jid',
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'hCreateChannel',
                params : defaultParams
            };
            done();
        })

        it('should emit hResult error without params', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.INVALID_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
            createCmd.params = null;
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult error with params not an object', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.INVALID_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
            createCmd.params = 'string';
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult error without chid', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.MISSING_ATTR);
                hResult.should.have.property('result').and.be.a('string').and.match(/chid/i);
                done();
            });
            createCmd.params.chid = undefined;
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult error without required attr', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.MISSING_ATTR);
                done();
            });
            createCmd.params.host = undefined;
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult error if chid exists', function(done){
            hCommandController.once('hResult', function(res){
                hCommandController.on('hResult', function(res){
                    should.exist(res);
                    res.should.have.property('hResult');
                    var hResult = res.hResult;
                    hResult.should.have.property('cmd', createCmd.cmd);
                    hResult.should.have.property('reqid', createCmd.reqid);
                    hResult.should.have.property('status', status.INVALID_ATTR);
                    hResult.should.have.property('result').and.be.a('string').and.match(/chid/i);
                    done();
                })
                hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
            });
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult error if invalid hHeader content type', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.INVALID_ATTR);
                hResult.should.have.property('result').and.be.a('string').and.match(/headers/i);
                done();
            });
            createCmd.params.headers= [{hKey: {}}];
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult ok without optional attr', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.OK);
                done();
            });
            createCmd.params.chdesc = undefined;
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })

        it('should emit hResult ok with every field correct', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.OK);
                done();
            });
            createCmd.params.chdesc = 'a';
            createCmd.params.priority = 3;
            createCmd.params.location = {lng : 's'};
            createCmd.params.headers = [{hKey : 'key', hValue: 'value'}];
            hCommandController.emit('hCommand', {from: createCmd.sender, hCommand: createCmd});
        })
    })
})