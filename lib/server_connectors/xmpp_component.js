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
    this.jid = params.jid;
    this.status = status.DISCONNECTED;
};

util.inherits(Component, events);

/**
 * Connects to the XMPP Server and adds the listeners
 * for all the events
 */
Component.prototype.connect = function(){
    this.cmp = new xmpp.Component(this.params);
    this.listeners = [];
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

    //When a stanza is received treat it
    this.cmp.on('stanza', function(stanza){
        log.debug('Component Received Stanza:', stanza);
        hContent = stanza.getChild('body');
        if( stanza.is('message') &&
            stanza.attrs.type !== 'error' &&
            hContent){

            //hCommand
            if(hContent.attrs.type == 'hcommand'){
                try{
                    var objReceived = hContent.getText().replace(/&quot;/g,'"'); //Solves problem with Strophe
                    var hCommand = JSON.parse(objReceived);
                    self.emit('hCommand',
                        {hCommand: hCommand, from: stanza.attrs.from});
                }catch(err){
                    //Error parsing the hCommand. Ignore it
                    log.warn('Received an invalid hCommand from', stanza.attrs.from, err);
                }
            }
        }

        var newListeners = [];
        for(var i = 0; i < self.listeners.length; i++){
            var filters = self.listeners[i].filters;
            var valid = true;

            if(filters.id && stanza.attrs.id != filters.id) valid = false;
            if(filters.to && stanza.attrs.to != filters.to) valid = false;
            if(filters.from && stanza.attrs.from != filters.from) valid = false;
            if(filters.ns && stanza.getNS() != filters.ns) valid = false;

            //If valid, because only listening once, do not add it to new list
            if(valid)
                self.listeners[i].cb(stanza);
            else
                newListeners.push(self.listeners[i]);
        }
        self.listeners = newListeners;
    });

    //When a result is available add XMPP Headers and send it
    this.on('hResult', function(res){
        var msg = new xmpp.Element('message', {from: self.jid,
            to: res.args.to}).c('body', {type: 'hresult'}).t(JSON.stringify(res.hResult));
        log.debug('Component Sent Stanza:', msg);

        self.cmp.send(msg);
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

Component.prototype.send = function(msg){
    this.cmp.send(msg);
};

/**
 * Adds a one time listener for a specific stanza.
 * @param filters - An object with attributes that must match {
 * id, to, from, ns
 * }
 * @param cb - function to be called when stanza is found
 */
Component.prototype.addStanzaListener = function(filters, cb){
    this.listeners.push({filters: filters, cb: cb});
};

exports.Component = Component;