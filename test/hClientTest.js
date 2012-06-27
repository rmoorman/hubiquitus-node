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
var codes = require('../lib/codes.js');

describe('hClient XMPP Connection', function(){

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    describe('#connect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
        })

        afterEach(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        it('should emit an event when connected', function(done){
            hClient.once('connect', done);
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.AUTH_FAILED);
                done() });
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.JID_MALFORMAT);
                done();
            });
            hClient.connect(xmppOptions);
        })

    })

})