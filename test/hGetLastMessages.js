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
    var existingCHID = config.getNewCHID();
    var chanWithHeader = config.getNewCHID();
    var inactiveChan = config.getNewCHID();
    var DateTab = [];

    var maxMsgRetrieval = 6;

    before(config.beforeFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(existingCHID, [config.validJID, config.logins[0].jid], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.validJID, config.logins[0].jid], config.validJID, false, done);
    })

    before(function(done){
        this.timeout(10000);
        var createCmd = config.makeHMessage('hnode@localhost', config.validJID, 'hCommand', {});
        createCmd.msgid = 'hCommandTest123',
        createCmd.payload = {
            cmd : 'hCreateUpdateChannel',
            params : {
                actor: chanWithHeader,
                active : true,
                owner : config.validJID,
                subscribers : [config.validJID, config.logins[0].jid],
                headers : {'MAX_MSG_RETRIEVAL': ''+maxMsgRetrieval}
            }
        };

        var nbOfPublish = 0;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.status.should.be.eql(status.OK);
            for(var i = 0; i < 11; i++)
                config.publishMessage(config.validJID, chanWithHeader, undefined, undefined, undefined, true, function() {
                    nbOfPublish += 1;
                    if(nbOfPublish == 10)
                        done();
                });
        });
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd = config.makeHMessage(existingCHID, config.validJID, 'hCommand',{});
        cmd.msgid = 'hCommandTest123';
        cmd.payload = {
            cmd : 'hGetLastMessages',
            params : {
                nbLastMsg: 5
            }
        };
    })

    it('should return hResult ok if there are no hMessages stored', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.should.have.property('result').and. be.an.instanceof(Array);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(0);
            done();
        });
    })

    describe('Test with messages published',function() {

        for(var i = 0; i < 11; i++) {
            var count = 0;
            var date = new Date(100000 + i * 100000);
            DateTab.push(date);
            before(function(done){
                config.publishMessage(config.validJID, existingCHID, undefined, undefined,DateTab[count], true, done);
                count++;
            })

        }

        it('should return hResult error INVALID_ATTR with actor not a channel', function(done){
            cmd.actor = 'not a channel@localhost';
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.INVALID_ATTR);
                hMessage.payload.should.have.property('result').and.match(/actor/);
                done();
            });
        })

        it('should return hResult error MISSING_ATTR if no channel is passed', function(done){
            delete cmd.actor;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.MISSING_ATTR);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if publisher not in subscribers list', function(done){
            cmd.publisher = 'someone@' + config.validDomain;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AVAILABLE if channel does not exist', function(done){
            cmd.actor = '#this channel does not exist@localhost';
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if channel inactive', function(done){
            cmd.actor = inactiveChan;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult ok with 10 msgs if not header in chan and cmd quant not a number', function(done){
            cmd.payload.params.nbLastMsg = 'not a number';
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 messages if not default in channel or cmd', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 last messages', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){

                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);

                for(i=0; i<10;i++) {
                    var int = DateTab.length - (i + 1);

                    //Should be a string for compare
                    var supposedDate = '' +DateTab[int];
                    var trueDate = '' + hMessage.payload.result[i].published;

                    supposedDate.should.be.eql(trueDate);
                }
                done();
            });
        })

        it('should return hResult ok with default messages of channel if not specified', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = chanWithHeader;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(maxMsgRetrieval);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified with headers', function(done){
            var length = 4;
            cmd.payload.params.nbLastMsg = length;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified if header specified', function(done){
            var length = 4;
            cmd.payload.params.nbLastMsg = length;
            cmd.actor = chanWithHeader;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })
    })

    describe('test filters', function(){
        var hClientConst = require('../lib/hClient.js').hClient;
        var hClient = new hClientConst(config.cmdParams);

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        for(var i = 0; i < 5; i++) {
            before(function(done){
                this.timeout(5000);
                config.publishMessage(config.validJID, existingCHID, 'a type', undefined, undefined, true, done);
            })
        }

        before(function(done){
            var filterCmd = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[0].jid, 'hCommand', {});
            filterCmd.payload = {
                cmd : 'hSetFilter',
                params : {
                    actor: existingCHID,
                    name: 'a filter',
                    template: {type: 'a type'}
                }
            };

            hClient.processMsgInternal(filterCmd, function(hMessage){
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })


        it('should return only filtered messages with right quantity', function(done){
            cmd.payload.params.nbLastMsg = 3;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.have.length(3);
                for(var i = 0; i < hMessage.payload.result.length; i++)
                    hMessage.payload.result[i].should.have.property('type', 'a type');
                done();
            })
        })

        it('should return only filtered messages with less quantity if demanded does not exist.', function(done){
            cmd.payload.params.nbLastMsg = 1000;
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.have.length(5);
                for(var i = 0; i < hMessage.payload.result.length; i++)
                    hMessage.payload.result[i].should.have.property('type', 'a type');
                done();
            })
        })

    })

})