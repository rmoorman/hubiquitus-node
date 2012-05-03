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
var Mongo = require('../lib/mongo.js');

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('Mongo', function(){

    var uri = 'mongodb://localhost/test';

    beforeEach(function(done){
        done();
    })

    describe('#dbInit', function(){

        it('should return object with list of models names', function(done){
            var obj = Mongo.dbInit(uri);
            should.exist(obj);
            obj.should.have.property('models');
            done();
        })

        it('should return object with attrs equal to models names', function(done){
            var obj = Mongo.dbInit(uri);
            for(var i = 0; i < obj.models.length; i++)
                obj.should.have.property(obj.models[i]);
            done();
        })

        it('should return object with hChannel attr', function(done){
            var obj = Mongo.dbInit(uri);
            obj.should.have.property('hChannel');
            done();
        })

        it('should return object with model list including hChannel', function(done){
            var obj = Mongo.dbInit(uri);
            obj.models.should.include('hChannel');
            done();
        })
    })
})