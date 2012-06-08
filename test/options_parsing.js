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

require('should');
var fs = require('fs');


describe('Options Parsing', function(){

    beforeEach(function(){
        process.argv = ['node', 'hnode.js'];
    })

    it('should get default options if nothing specified', function(done){
        var options = require('../lib/options.js').options;
        options.should.be.a('object');
        options.should.have.property('global.loglevel', 'WARN');
        options.should.have.property('socket.io.ports').with.lengthOf(1);
        options.should.have.property('socket.io.namespace', '');
        options.should.have.property('socket.io.disctimeout', 15000);
        options.should.have.property('socket.io.ridwindow', 5);
        options.should.have.property('bosh.ports').with.lengthOf(1);
        options.should.have.property('bosh.pidgin_compatible', true);
        done();
    })

    it('should change an option when a new one is specified', function(done){
        var i = 2;
        process.argv[i++] = '--global.loglevel';
        process.argv[i++] = 'INFO';

        var options = require('../lib/options.js').createOptions();
        options.should.be.a('object');
        options.should.have.property('global.loglevel', 'INFO');
        done();
    })

    it('should load options from file', function(done){
        process.argv[2] = '--config';
        process.argv[3] = '/tmp/slod.config';

        var fd = fs.openSync('/tmp/slod.config', 'w');
        fs.writeSync(fd, 'socket.io.ports = 3214,1241');

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports').with.lengthOf(2);
        options.should.have.property('socket.io.ports').and.eql([3214,1241]);
        done();
    })

    it('should convert overrided option to int when needed', function(done){
        var i = 2;
        process.argv[i++] = '--socket.io.disctimeout';
        process.argv[i++] = '1111';

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.disctimeout').and.be.a('number');
        done();
    })

    it('should convert overrided option to array when needed', function(done){
        var i = 2;
        process.argv[i++] = '--socket.io.ports';
        process.argv[i++] = '1111,2222';

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports').with.lengthOf(2);
        done();
    })

    it('should convert overrided option to int arrays when needed', function(done){
        var i = 2;
        process.argv[i++] = '--socket.io.ports';
        process.argv[i++] = '1111,2222';

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports');
        options['socket.io.ports'].map(function(el){
            el.should.be.a('number');
        });
        done();
    })
})
