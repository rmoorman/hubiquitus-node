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
    var chid = config.db.createPk();

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        config.createChannel(chid, [config.validJID], config.validJID, true, done);
    })

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hGetChannels'
        };
    })

    it('should return hResult OK with an array as result', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            hResult.should.have.property('result');
            hResult.result.should.be.an.instanceof(Array);
            done();
        });
    })

    it('should return hResult OK with an array having newly created channel as part of result', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            hResult.should.have.property('result');

            for(var i = 0; i < hResult.result.length; i++)
                if(hResult.result[i].chid == chid)
                    done();
        });
    })

})