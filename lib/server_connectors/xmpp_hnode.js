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

var log = require('winston');

var xmpp = require('node-xmpp');

//Events
var util = require('util');
var events = require('events').EventEmitter;

var errors = require('../codes.js').errors;
var status = require('../codes.js').statuses;

var iqListeners = {};

var Connection = function(){
    events.call(this);
    this.status = status.DISCONNECTED;
};

util.inherits(Connection, events);

/**
 * Connects to the XMPP Server and adds the listeners
 * for all the events
 * @param opts an object:
 * {
 * jid: <string>,
 * password: <string>,
 * host: <string>,
 * port: <int> ,
 * commandOptions : {} Command Controller Options
 * }
 */
Connection.prototype.connect = function(opts){
    if(this.status == status.DISCONNECTED){
        this.opts = opts;

        this.jid = opts.jid;

        //This controller will be used for commands arriving from XMPP to treat other users
        this.opts.commandOptions.checkSender = false;
        this.opts.commandOptions.jid = opts.jid;

        this.xmppConnection = new xmpp.Client(this.opts);
        this.addConnectionListeners();
    }
};

/**
 * Disconnects from the XMPP Server and emits a message to let the user know
 */
Connection.prototype.disconnect = function(){
    var self = this;

    if(this.xmppConnection && this.status == status.CONNECTED){
        this.xmppConnection.once('close', function(){
            self.status = status.DISCONNECTED;

            //Remove listeners
            self.xmppConnection.removeAllListeners('stanza');
            self.xmppConnection.removeAllListeners('error');

            //Emit the disconnect status
            self.emit('disconnect');
        });

        this.xmppConnection.end();

    } else{
        this.emit('error', {
            code: errors.NOT_CONNECTED,
            msg: 'trying to disconnect, but not connected'
        });
    }
};

/**
 * Sets all the listeners for events from XMPP
 */
Connection.prototype.addConnectionListeners = function(){
    var self = this;

    //When connected emit a message
    this.xmppConnection.once('online', function(){
        self.status = status.CONNECTED;

        var cmdConstructor = require('../hcommand_controller.js').Controller;
        self.cmdController = new cmdConstructor(self.opts.commandOptions);

        self.emit('connect');
    });

    //When a stanza is received treat it
    this.xmppConnection.on('stanza', function(stanza){
        log.debug('Component Received Stanza', stanza);
        var hContent = stanza.getChild('hbody');

        if( stanza.is('message') &&
            stanza.attrs.type !== 'error' &&
            hContent){

            //hCommand
            if(/^hcommand$/i.test(hContent.attrs.type)){
                try{
                    var objReceived = hContent.getText().replace(/&quot;/g,'"'); //Solves problem with Strophe
                    var hCommand = JSON.parse(objReceived);

                    if(!hCommand) throw 'null object';

                    self.cmdController.execCommand(hCommand, function(hResult){
                        var msg = new xmpp.Element('message', {from: self.jid,
                            to: stanza.attrs.from})
                            .c('hbody', {type: 'hresult'}).t(JSON.stringify(hResult));

                        log.debug('Component Sent Stanza:', msg);

                        self.cmp.send(msg);
                    })

                }catch(err){
                    //Error parsing the hCommand. Ignore it
                    log.warn('Received an invalid hCommand from ' + stanza.attrs.from, err);
                }
            }
        }else if(stanza.is('iq') && stanza.attrs.id !== 'undefined' &&
            iqListeners[stanza.attrs.id]){

            var cb = iqListeners[stanza.attrs.id];
            delete iqListeners[stanza.attrs.id];
            cb(stanza);
        }

        //Let everyone listen to the raw stanza
        self.emit('stanza', stanza);
    });

    //Listen for errors and hNodify them
    this.xmppConnection.once('error', function(error){
        if(error == 'XMPP authentication failure')
            self.emit('error', {
                code: errors.AUTH_FAILED,
                msg: 'wrong user-password combination'
            });
        else if(error.code == 'ENOTFOUND')
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: 'invalid domain'
            });
        else
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: error
            })
    });
};

Connection.prototype.send = function(msg){
    this.xmppConnection.send(msg);
};

/**
 * Sends an IQ through this connection and calls cb when an answer is received
 * @param attrs - attributes of the iq {type: 'set' | 'get', to: <String>}
 * @param content - an XML Element to send as a child of the IQ
 * @param cb - Callback when the answer is received
 * @return ID of the message. Useful if the answer is no longer needed
 * (to use with Component.removeIQListener(msgID). If the component is not connected
 * or attributes is missing nothing will be returned.
 */
Connection.prototype.sendIQ = function(attrs, content, cb){
    var msgId;

    if( typeof attrs === 'undefined' || attrs == null ||
        this.status == status.DISCONNECTED)
        return msgId;

    msgId = UUID();

    var msg = new xmpp.Element('iq', {
        type: attrs.type,
        from: this.jid,
        to:  attrs.to,
        id: msgId
    });

    msg.cnode(content.tree());
    iqListeners[msgId] = cb;


    this.xmppConnection.send(msg);
    return msgId;
};

/**
 * Removes the callback to be executed from the IQ listener, if the id
 * does not exist nothing will happen.
 * @param id - ID received from the function sendIQ
 */
Connection.prototype.removeIQListener = function(id){ delete iqListeners[id] };

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.ServerConnection = new Connection();