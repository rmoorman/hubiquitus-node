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
var xmppComponent = require('../lib/server_connectors/xmpp_component').Component;
var errors = require('../lib/codes.js').errors;



describe('XMPP Component', function(){

    var params;
    var component;

    beforeEach(function(done){
        params ={
            jid: 'hnode',
            password: 'password',
            host: 'localhost',
            port: 5276
        };
        done();

    })

    describe('#connect()', function(){
        it('should emit an event when connected', function(done){
            component = new xmppComponent(params);
            component.on('connected', done);
            component.connect();
        })

        it('should emit an error when wrong host', function(done){
            params.host= 'inexistent host';
            component = new xmppComponent(params);
            component.on('error', function(error){
                should.exist(error);
                error.should.have.property('code', errors.TECH_ERROR);
                done() });
            component.connect();
        })

        it('should emit an error when wrong authentication', function(done){
            params.password= 'another password';
            component = new xmppComponent(params);
            component.on('error', function(error){
                should.exist(error);
                error.should.have.property('code', errors.AUTH_FAILED);
                done() });
            component.connect();
        })

    })

    describe('#disconnect()', function(){
        it('should emit an event when disconnected', function(done){
            component = new xmppComponent(params);
            component.on('connected', function(){
                component.on('disconnected', done);
                component.disconnect();
            });
            component.connect();
        })

        it('should emit an error when not connected', function(done){
            component = new xmppComponent(params);
            component.on('error', function(error){
                should.exist(error);
                error.should.have.property('code', errors.NOT_CONNECTED);
                done() });
            component.disconnect();
        })

    })
})