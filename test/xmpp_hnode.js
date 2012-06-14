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
var errors = require('../lib/codes.js').errors;
var status = require('../lib/codes.js').statuses;

describe('XMPP Component', function(){

    var params;
    var component = config.xmppConnection;

    describe('#connect()', function(){
        beforeEach(function(){
            params = JSON.parse(JSON.stringify(config.xmppParams));
        })

        afterEach(function(done){
            if(component.status == status.CONNECTED){
                component.once('disconnect', done);
                component.disconnect();
            }else
                done();
        })

        it('should emit an event when connected', function(done){
            component.once('connect', done);
            component.connect(params);
        })

        it('should emit an error when wrong authentication', function(done){
            params.password= 'another password';
            component.once('error', function(error){
                should.exist(error);
                error.should.have.property('code', errors.AUTH_FAILED);
                done() });
            component.connect(params);
        })

    })

    describe('#disconnect()', function(){
        beforeEach(function(){
            params = JSON.parse(JSON.stringify(config.xmppParams));
        })

        afterEach(function(done){
            if(component.status == status.CONNECTED){
                component.once('disconnect', done);
                component.disconnect();
            }else
                done();
        })

        it('should emit an event when disconnected', function(done){
            component.once('connect', function(){
                component.once('disconnect', done);
                component.disconnect();
            });
            component.connect(params);
        })

        it('should emit an error when not connected', function(done){
            component.once('error', function(error){
                should.exist(error);
                error.should.have.property('code', errors.NOT_CONNECTED);
                done() });
            component.disconnect();
        })

    })

    describe('#sendIQ()', function(){

        before(function(done){
            params = JSON.parse(JSON.stringify(config.xmppParams));
            component.once('connect', done);
            component.connect(params);
        })

        after(function(done){
            component.once('disconnect', done);
            component.disconnect();
        })

        it('should call cb that sent an iq', function(done){
            var content = new (require('node-xmpp').Element)('message', {});
            component.sendIQ({},content, function(stanza){
                done();
            });
        })

        it('should allow to send iq without cb', function(){
            var content = new (require('node-xmpp').Element)('message', {});
            component.sendIQ({},content);
        })

    })
})