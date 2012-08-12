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
    var cmdMsg;
    var status = require('../lib/codes.js').hResultStatus;
    var params = JSON.parse(JSON.stringify(config.cmdParams));

    before(function(done){
        config.db.on('connect', done);
        config.db.connect(config.mongoURI);

        params.modulePath = 'test/aux';
        params.timeout = 1000;
    })

    after(function(done){
        config.db.on('disconnect', done);
        config.db.disconnect();
    })


    beforeEach(function(){
        cmdMsg = {
            msgid : 'testCmd',
            convid : 'testCmd',
            actor : 'session',
            type : 'hCommand',
            priority : 0,
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'dummyCommand',
                params : {}
            }
        };

        hCommandController = new config.cmdController(params);
    })

    it('should call module when module exists', function(done){
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should call module when cmd with different case', function(done){
        cmdMsg.payload.cmd = 'dummycommand';
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE when command not found', function(done){
        cmdMsg.payload.cmd = 'inexistent command';
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            done();
        });
    })

    it('should return hResult error EXEC_TIMEOUT when command timeout', function(done){
        cmdMsg.payload.cmd = 'nothingCommand'; //Does nothing, forces timeout
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should not allow command to call cb if after timeout', function(done){
        this.timeout(3000);

        cmdMsg.payload.cmd = 'lateFinisher'; //Calls callback at 2seg
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should allow command to change timeout', function(done){
        this.timeout(4000);

        cmdMsg.payload.cmd = 'timeoutChanger'; //Calls callback at 2seg
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return same msgid even if when transient=false msgid changes in mongodb', function(done){
        cmdMsg.transient = false;
        cmdMsg.payload.params.randomValue = '' + config.db.createPk();

        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.should.have.property('ref', cmdMsg.msgid);
            done();
        });
    })

})