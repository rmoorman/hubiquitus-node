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
    var splitJID = require('../lib/validators.js').splitJID;

    before(config.beforeFN);

    after(function(done) {
        this.timeout(5000);
        config.afterFN(done);
    });

    beforeEach(function(){

        createCmd = {
            msgid : 'hCommandTest123',
            actor : 'session',
            type : 'hCommand',
            priority : 0,
            publisher : config.validJID,
            published : new Date(),
            payload : {
                cmd : 'hCreateUpdateChannel',
                params : {
                    actor: config.getNewCHID(),
                    active : true,
                    owner : config.validJID,
                    subscribers : [config.validJID]
                }
            }
        };
    })

    it('should return hResult error INVALID_ATTR without params', function(done){
        createCmd.payload.params = null;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with params not an object', function(done){
        createCmd.payload.params = 'string';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error MISSING_ATTR without actor', function(done){
        delete createCmd.payload.params.actor;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/id/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with empty string as actor', function(done){
        this.timeout(5000);
        createCmd.payload.params.actor = '';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/id/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with actor with a different domain', function(done){
        createCmd.payload.params.actor = '#channel@another.domain';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED with using hAdminChannel as actor', function(done){
        createCmd.payload.params.actor = 'hAdminChannel';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if actor is not string castable', function(done){
        createCmd.payload.params.actor = [];
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/actor/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority is not a number', function(done){
        createCmd.payload.params.priority = 'not a number';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority >5', function(done){
        createCmd.payload.params.priority = 6;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority <0', function(done){
        createCmd.payload.params.priority = -1;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with invalid location format', function(done){
        createCmd.payload.params.location = "something";
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if owner is missing', function(done){
        delete createCmd.payload.params.owner;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if owner is an empty string', function(done){
        createCmd.payload.params.owner = '';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if owner JID is not bare', function(done){
        createCmd.payload.params.owner = createCmd.publisher + '/resource';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if subscribers is missing', function(done){
        delete createCmd.payload.params.subscribers;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/subscriber/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if subscribers is not an array', function(done){
        createCmd.payload.params.subscribers = '';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/subscriber/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if subscribers has an element that is not a string', function(done){
        createCmd.payload.params.subscribers = [{not: 'a string'}];
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/subscriber/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if subscribers has an element that is not a JID', function(done){
        createCmd.payload.params.subscribers = ['a@b', 'this is not a JID'];
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/subscriber/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if subscribers has an element that is not a bare JID', function(done){
        createCmd.payload.params.subscribers = ['a@b', 'a@b/resource'];
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/subscriber/i);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if active is missing', function(done){
        delete createCmd.payload.params.active;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/active/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if active is not a boolean', function(done){
        createCmd.payload.params.active = 'this is a string';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/active/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if headers is not an object', function(done){
        createCmd.payload.params.headers= 'something';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string').and.match(/header/i);
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if owner different than sender', function(done){
        createCmd.payload.params.owner = 'another@another.jid';
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
    })

    it('should return hResult OK if publisher has resource and owner doesnt', function(done){
        this.timeout(5000);
        createCmd.publisher = config.validJID + '/resource';
        createCmd.payload.params.owner = config.validJID;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK if actor is fully compliant with #chid@domain', function(done){
        this.timeout(5000);
        createCmd.payload.params.actor = '#actor@' + splitJID(config.validJID)[1];
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK without any optional attributes', function(done){
        this.timeout(5000);
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult ok with every attribute (including optional) correct', function(done){
        this.timeout(5000);
        createCmd.payload.params.chdesc = 'a';
        createCmd.payload.params.priority = 3;
        createCmd.payload.params.location = {lng : 's'};
        createCmd.payload.params.headers = {key: 'value'};
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should update cache after successful saving of hChannel', function(done){
        this.timeout(5000);
        var actor = '#' + config.db.createPk() + '@' + splitJID(config.validJID)[1];
        createCmd.payload.params.actor = actor;
        createCmd.payload.params.priority = 3;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
            hMessage.should.have.property('ref', createCmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            should.exist(config.db.cache.hChannels[actor]);
            config.db.cache.hChannels[actor].should.have.property('priority', 3);
            done();
        });
    })


    describe('#Update Channel', function(){
        //Channel that will be created and updated
        var existingCHID = '#' + config.db.createPk() + '@' + splitJID(config.validJID)[1];

        before(function(done){
            this.timeout(5000);
            config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
        })

        it('should return hResult ok if actor exists updating', function(done){
            this.timeout(5000);
            createCmd.payload.params.actor = existingCHID;
            createCmd.payload.params.subscribers = ['u2@another'];
            hCommandController.execCommand(createCmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
                hMessage.should.have.property('ref', createCmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                config.db.cache.hChannels[existingCHID].subscribers.should.be.eql(createCmd.payload.params.subscribers);
                done();
            });
        })

        it('should return hResult OK if a new subscriber is added', function(done){
            this.timeout(5000);
            createCmd.payload.params.actor = existingCHID;
            createCmd.payload.params.subscribers = [config.validJID, 'u2@another2'];
            hCommandController.execCommand(createCmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
                hMessage.should.have.property('ref', createCmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })

        it('should return hResult OK if an old subscriber is removed', function(done){
            this.timeout(5000);
            createCmd.payload.params.actor = existingCHID;
            createCmd.payload.params.subscribers = ['u2@another2'];
            hCommandController.execCommand(createCmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
                hMessage.should.have.property('ref', createCmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })

        it('should return hResult error if sender tries to update owner', function(done){
            this.timeout(5000);
            createCmd.payload.params.owner = 'a@jid.different';
            createCmd.payload.params.actor = existingCHID;
            hCommandController.execCommand(createCmd, function(hMessage){
                hMessage.payload.should.have.property('cmd', createCmd.payload.cmd);
                hMessage.should.have.property('ref', createCmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
                done();
            });
        })

    })
})