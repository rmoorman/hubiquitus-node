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
var Controller = require('../lib/hcommand_controller.js').Controller;
var status = require('../lib/codes.js').hResultStatus;
var mongoose = require('mongoose');

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('hCommand', function(){

    var hCommandController;
    var cmd;
    var defaultParams;
    var existingID = 'Existing ID';
    var mongoURI = 'mongodb://localhost/test';

    describe('#hGetChannels', function(){
        before(function(){
            var params = {
                jid: 'hnode',
                password: 'password',
                host: 'localhost',
                'mongo.URI' : mongoURI,
                port: 5276,
                modulePath : 'lib/hcommands',
                timeout : 5000
            };

            hCommandController = new Controller(params);
        })

        beforeEach(function(){
            cmd= {
                reqid  : 'hCommandTest123',
                sender : 'fake jid',
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'hGetChannels'
            };
        })

        after(function(done){
            mongoose.connect(mongoURI);
            mongoose.connection.close(done);
        })

        it('should emit hResult when correct', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result');
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

    })
})