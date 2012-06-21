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

describe('hGetLastMessages', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = config.db.createPk();
    var chanWithHeader = config.db.createPk();
    var inactiveChan = config.db.createPk();
    var DateTab = [];

    var maxMsgRetrieval = 6;

    before(config.beforeFN)

    before(function(done){
        config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    before(function(done){
        hCommandController.execCommand({
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hCreateUpdateChannel',
            params : {
                chid : chanWithHeader,
                active : true,
                host : '' + new Date(),
                owner : config.validJID,
                participants : [config.validJID],
                headers : [{hK: 'MAX_MSG_RETRIEVAL', hV: ''+maxMsgRetrieval}]
            }
        }, null, function(hResult){done();});
    })



    for(var i = 0; i < 11; i++)
        before(function(done){
            config.publishMessage(config.validJID, chanWithHeader, undefined, undefined, undefined, false, done);
        })

    after(config.afterFN)

    beforeEach(function(){
        cmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hGetLastMessages',
            params : {
                chid: existingCHID,
                nbLastMsg: 5
            }
        };
    })

    it('should return hResult ok if there are no hMessages stored', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('cmd', cmd.cmd);
            hResult.should.have.property('reqid', cmd.reqid);
            hResult.should.have.property('status', status.OK);
            hResult.should.have.property('result').and. be.an.instanceof(Array);
            hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(0);
            done();
        });
    })

    describe('Test with messages published',function() {

        for(var i = 0; i < 11; i++) {
            var count = 0;
            var date = new Date(100000 + i * 100000);
            DateTab.push(date);
            before(function(done){
                config.publishMessage(config.validJID, existingCHID, undefined, undefined,DateTab[count], false, done);
                count++;
            })

        }

        it('should return hResult error MISSING_ATTR if no params is passed', function(done){
            delete cmd.params;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.MISSING_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error MISSING_ATTR if no channel is passed', function(done){
            delete cmd.params.chid;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.MISSING_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if publisher not in participants list', function(done){
            cmd.sender = 'not in list';
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.NOT_AUTHORIZED);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AVAILABLE if channel does not exist', function(done){
            cmd.params.chid = 'this channel does not exist';
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.NOT_AVAILABLE);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if channel inactive', function(done){
            cmd.params.chid = inactiveChan;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.NOT_AUTHORIZED);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult ok with 10 msgs if not header in chan and cmd quant not a number', function(done){
            cmd.params.nbLastMsg = 'not a number';
            cmd.params.chid = existingCHID;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 messages if not default in channel or cmd', function(done){
            delete cmd.params.nbLastMsg;
            cmd.params.chid = existingCHID;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 last messages', function(done){
            delete cmd.params.nbLastMsg;
            cmd.params.chid = existingCHID;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);

                for(i=0; i<10;i++) {
                    var int = DateTab.length - (i + 1);

                    //Should be a string for compare
                    var supposedDate = '' +DateTab[int];
                    var trueDate = '' + hResult.result[i].published;

                    supposedDate.should.be.eql(trueDate);
                }
                done();
            });
        })

        it('should return hResult ok with default messages of channel if not specified', function(done){
            delete cmd.params.nbLastMsg;
            cmd.params.chid = chanWithHeader;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(maxMsgRetrieval);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified with headers', function(done){
            var length = 4;
            cmd.params.nbLastMsg = length;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified if header specified', function(done){
            var length = 4;
            cmd.params.nbLastMsg = length;
            cmd.params.chid = chanWithHeader;
            hCommandController.execCommand(cmd, null, function(hResult){
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })
    })



})