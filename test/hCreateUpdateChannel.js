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

describe('hCreateUpdateChannel', function(){

    var hCommandController;
    var createCmd;
    var status = require('../lib/codes.js').hResultStatus;
    var mongoURI = 'mongodb://localhost/test';
    //A Channel that must exist in the database (created on first run. Some tests may fail)
    var existingID = 'Existing ID';

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
        var defaultParams = {
            chid : Math.floor(Math.random()*1000001),
            active : true,
            host : '' + new Date(),
            owner : 'fake@jid',
            participants : ['u1@localhost']
        };
        createCmd= {
            reqid  : 'hCommandTest123',
            sender : 'fake@jid',
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hCreateUpdateChannel',
            params : defaultParams
        };

        hCommandController = new Controller(controllerParams);
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult ok if chid exists updating', function(done){
        hCommandController.once('hResult', function(val){
            should.exist(val);
            val.should.have.property('hResult');
            var hResult = val.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK, 'first run will create not update');
            done();
        });
        createCmd.params.chid = existingID;
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult error if owner different than sender', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
        createCmd.params.owner = 'another@another.jid';
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult ok if sender has resource and owner doesnt', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
        createCmd.sender = 'another@another.jid/differentRes';
        createCmd.params.owner = 'another@another.jid';
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult error if sender tries to update owner', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
        createCmd.sender = 'a@jid.different';
        createCmd.params.owner = 'a@jid.different';
        createCmd.params.chid = existingID;
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult error with invalid location format', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            done();
        });
        createCmd.params.location = "";
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })

    it('should emit hResult ok without location', function(done){
        hCommandController.on('hResult', function(res){
            should.exist(res);
            res.should.have.property('hResult');
            var hResult = res.hResult;
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
        delete createCmd.params.location;
        hCommandController.emit('hCommand', {hCommand: createCmd});
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
        hCommandController.emit('hCommand', {hCommand: createCmd});
    })
})