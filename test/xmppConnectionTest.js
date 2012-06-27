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

describe('XMPP Connection', function(){

    var ConnectionConst= require('../lib/server_connectors/xmpp_connection.js').Connection;
    var connection = new ConnectionConst();
    var xmlElement = require('../lib/server_connectors/xmpp_connection.js').Element;


    before(config.beforeFN)

    after(config.afterFN)

    describe('#xmppConnect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection = new ConnectionConst();
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should emit an event when online', function(done){
            connection.once('online', done);
            connection.xmppConnect(xmppOptions);
        })

        it('should emit an error when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            connection.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(codes.errors.AUTH_FAILED);
                error.msg.should.be.a('string');
                done() });
            connection.xmppConnect(xmppOptions);
        })

        it('should emit an error when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            connection.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(codes.errors.JID_MALFORMAT);
                error.msg.should.be.a('string');
                done() });
            connection.xmppConnect(xmppOptions);
        })

    })

    describe('#xmppDisconnect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection = new ConnectionConst();
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should emit disconnect if disconnect when connected', function(done){
            connection.once('online', function(){
                connection.once('disconnect', done);
                connection.xmppDisconnect();
            });
            connection.xmppConnect(xmppOptions);
        })

        it('should emit disconnect even if already disconnected', function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })
    })

    describe('#send()', function(){
        var xmppOptions;

        beforeEach(function(done){
            connection = new ConnectionConst();
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection.once('online', done);
            connection.xmppConnect(xmppOptions);
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should not throw error if trying to send without being connected', function(done){
            connection.once('disconnect', function(){
                connection.send(new xmlElement('presence'));
                done();
            });
            connection.xmppDisconnect();
        })

        it('should receive message sent to ourselves if connected', function(done){
            connection.xmppConnection.on('stanza', function(stanza){
                if(stanza.attrs.from == connection.jid)
                    done();
            })
            connection.send(new xmlElement('presence'));
        })
    })

})