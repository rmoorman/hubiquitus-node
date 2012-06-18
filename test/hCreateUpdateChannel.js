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
var config = require('./_config.js');

describe('hCreateUpdateChannel', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var createCmd;
    var status = require('../lib/codes.js').hResultStatus;

    before(config.beforeFN)

    after(config.afterFN)

    beforeEach(function(){
        createCmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hCreateUpdateChannel',
            params : {
                chid : '' + Math.floor(Math.random()*10000),
                active : true,
                host : '' + new Date(),
                owner : config.validJID,
                participants : [config.validJID]
            }
        };
    })

    it('should return hResult error without params', function(done){
        createCmd.params = null;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error with params not an object', function(done){
        createCmd.params = 'string';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error without chid', function(done){
        createCmd.params.chid = undefined;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/chid/i);
            done();
        });
    })

    it('should return hResult error without required attr', function(done){
        createCmd.params.host = undefined;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            done();
        });
    })

    it('should return hResult error if invalid hHeader content type', function(done){
        createCmd.params.headers= [{hKey: {}}];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/headers/i);
            done();
        });
    })

    it('should return hResult error if owner different than sender', function(done){
        createCmd.params.owner = 'another@another.jid';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if system.indexes used as chid', function(done){
        createCmd.params.chid = 'system.indexes';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if a word starting with "h" is used as chid', function(done){
        createCmd.params.chid = 'hSomething';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult ok if sender has resource and owner doesnt', function(done){
        createCmd.sender = config.validJID + '/resource';
        createCmd.params.owner = config.validJID;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult ok without optional attr', function(done){
        createCmd.params.chdesc = undefined;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error with invalid location format', function(done){
        createCmd.params.location = "";
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            done();
        });
    })

    it('should return hResult ok without location', function(done){
        delete createCmd.params.location;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult ok with every field correct', function(done){
        createCmd.params.chdesc = 'a';
        createCmd.params.priority = 3;
        createCmd.params.location = {lng : 's'};
        createCmd.params.headers = [{hKey : 'key', hValue: 'value'}];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    describe('#Update Channel', function(){
        //Channel that will be created and updated
        var existingCHID = '' + Math.floor(Math.random()*10000);

        before(function(done){
            config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
        })

        it('should return hResult ok if chid exists updating', function(done){
            createCmd.params.chid = existingCHID;
            createCmd.params.participants = ['u2@another'];
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.OK, 'first run will create not update');
                done();
            });
        })

        it('should return hResult error if sender tries to update owner', function(done){
            createCmd.params.owner = 'a@jid.different';
            createCmd.params.chid = existingCHID;
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.NOT_AUTHORIZED);
                done();
            });
        })

    })
})