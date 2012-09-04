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

describe('hGetChannels', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var actor = config.getNewCHID();

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(actor, [config.validJID], config.validJID, true, done);
    })

    beforeEach(function(){
        cmd = {
            msgid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hGetChannels'
            }
        };
    })

    it('should return hResult OK with an array as result', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.should.have.property('result');
            hMessage.payload.result.should.be.an.instanceof(Array);
            done();
        });
    })

    it('should return hResult OK with an array having newly created channel as part of result', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', cmd.payload.cmd);
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.should.have.property('result');

            for(var i = 0; i < hMessage.payload.result.length; i++)
                if(hMessage.payload.result[i].actor == actor)
                    done();
        });
    })

})