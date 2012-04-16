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

var xmpp = require('node-xmpp');
//Events
var util = require('util');
var events = require('events').EventEmitter;

var errors = require('../codes.js').errors;
var status = require('../codes.js').statuses;

/**
 * Constructor for a xmpp connector
 * @param params an object:
 * {
 * jid: <string>,
 * password: <string>,
 * host: <string>,
 * port: <int>
 * }
 */
var Component = function(params){
    events.call(this);
    this.params = params;
    this.status = status.DISCONNECTED;
};

util.inherits(Component, events);

/**
 * Connects to the XMPP Server and adds the listeners
 * for all the events
 */
Component.prototype.connect = function(){
    this.cmp = new xmpp.Component(this.params);
    this.addConnectionListeners();
};

/**
 * Disconnects from the XMPP Server and emits a message to let the user know
 */
Component.prototype.disconnect = function(){
    var self = this;
    if(this.cmp && this.status == status.CONNECTED){
        this.cmp.on('close', function(){ self.emit('disconnected') });
        this.cmp.end();
    }else {
        this.emit('error', {
            code: errors.NOT_CONNECTED,
            msg: 'trying to disconnect, but not connected'
        });
    }
};

/**
 * Sets all the listeners to treat events that come
 * from the node-xmpp Component
 */
Component.prototype.addConnectionListeners = function(){
    var self = this;

    //When connected emit a message
    this.cmp.on('online', function(){
        self.status = status.CONNECTED;
        self.emit('connected');
    });

    //Listen for errors and hNodify them
    this.cmp.on('error', function(error){
        if(error.code == 'ENOTFOUND')
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: 'invalid domain'
            });
        else if(error.getChild && error.getChild('not-authorized'))
            self.emit('error', {
                code: errors.AUTH_FAILED,
                msg: 'can not connect with given secret'
            });
        else
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: 'unknown error'
            })
    });
};

exports.Component = Component;