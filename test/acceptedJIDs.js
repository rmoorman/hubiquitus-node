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

describe('jid Tests', function(){
    var checkJID = require('../lib/validators.js').validateJID;
    var splitJID = require('../lib/validators.js').splitJID;

    it('should accept jid a@b', function(){
        checkJID('a@b').should.be.true;
    })

    it('should accept jid a-b.*+#c_d@a-b.c_d', function(){
        checkJID('a-b.*+#c_d_d@a-b.c_d').should.be.true;
    })

    it('should accept jid a-b.*+#c_d@a-b.c_d/a-b.c_d', function(){
        checkJID('a-b.*+#c_d@a-b.c_d/a-b.c_d').should.be.true;
    })

    it('should accept jid with accents in username', function(){
        checkJID('a-béàíóú.*+#c_d@a-b.c_d/a-b.c_d').should.be.true;
    })

    it('should not accept jid with two slashes in resource', function(){
        checkJID('a@b/a/a').should.be.false;
    })

    it('should not accept jid without domain', function(){
        checkJID('a').should.be.false;
    })

    it('should not accept jid without username', function(){
        checkJID('@a').should.be.false;
    })

    it('should not accept jid only with resource', function(){
        checkJID('/a').should.be.false;
    })

    it('should split in three parts a jid in the form a@b/c', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+',
            resource = '+-zzxc-.,*+';

        var jid = splitJID(user + '@' + domain + '/' + resource);
        jid.should.have.length(3);
        jid[0].should.be.eql(user);
        jid[1].should.be.eql(domain);
        jid[2].should.be.eql(resource);
    })

    it('should split a jid in the form a@b', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+';

        var jid = splitJID(user + '@' + domain);
        jid.should.have.length(3);
        jid[0].should.be.eql(user);
        jid[1].should.be.eql(domain);
    })
})

