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

describe('hCommand', function(){

    var hCommandController;
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var params = JSON.parse(JSON.stringify(config.cmdParams));

    before(function(done){
        config.db.on('connect', done);
        config.db.connect(config.mongoURI);

        params.modulePath = 'test/aux';
        params.timeout = 1000;
        params.checkSender = true;
    })

    after(function(done){
        config.db.on('disconnect', done);
        config.db.disconnect();
    })


    beforeEach(function(){
        cmd = {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'dummyCommand'
        };

        hCommandController = new config.cmdController(params);
    })

    it('should call module when module exists', function(done){
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should call module when cmd with different case', function(done){
        cmd.cmd = 'dummycommand';
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult when command not found', function(done){
        cmd.cmd = 'inexistent command';
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.NOT_AVAILABLE);
            done();
        });
    })

    it('should return hResult when command timesout', function(done){
        cmd.cmd = 'nothingCommand'; //Does nothing, forces timeout
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should not allow command to call cb if after timeout', function(done){
        this.timeout(3000);

        cmd.cmd = 'lateFinisher'; //Calls callback at 2seg
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should allow command to change timeout', function(done){
        this.timeout(4000);

        cmd.cmd = 'timeoutChanger'; //Calls callback at 2seg
        hCommandController.execCommand(cmd, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

})