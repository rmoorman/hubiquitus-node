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
var validator = require('../validators.js');

var Connection = function(){
    events.call(this);
    this.status = status.DISCONNECTED;
    this.iqListeners = {};
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
        this.domain = validator.splitJID(opts.jid)[1];

        //This controller will be used for commands arriving from XMPP to treat other users
        this.opts.commandOptions.checkSender = false;
        this.opts.commandOptions.jid = opts.jid;
        var cmdConstructor = require('../hcommand_controller.js').Controller;
        this.cmdController = new cmdConstructor(this.opts.commandOptions);

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

            log.warn('hNode XMPP connection closed');

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

        // Send presence to receive messages from clients
        // According to http://xmpp.org/rfcs/rfc3922.html
        this.send(new xmpp.Element('presence'));

        self.emit('connect');
    });

    //When a stanza is received treat it
    this.xmppConnection.on('stanza', this._onStanzas.bind(this));

    //Listen for errors and hNodify them
    this.xmppConnection.once('error', this._onError.bind(this));
};

Connection.prototype._onStanzas = function(stanza){
    log.debug('hServer Received Stanza', stanza);

    var hContent = stanza.getChild('hbody');
    var self = this;

    if( stanza.is('message') &&
        stanza.attrs.type !== 'error' &&
        hContent){

        //hCommand
        if(/^hcommand$/i.test(hContent.attrs.type)){
            try{
                var objReceived = hContent.getText().replace(/&quot;/g,'"'); //Solves problem with Strophe
                var hCommand = JSON.parse(objReceived);

                if(!hCommand) throw 'null object';

                this.cmdController.execCommand(hCommand, stanza.attrs.from, function(hResult){
                    var msg = new xmpp.Element('message', {from: this.jid,
                        to: stanza.attrs.from})
                        .c('hbody', {type: 'hresult'}).t(JSON.stringify(hResult));

                    self.send(msg);
                })

            }catch(err){
                //Error parsing the hCommand. Ignore it
                log.warn('Received an invalid hCommand from ' + stanza.attrs.from, err);
            }
        }
    }else if(stanza.is('iq') && stanza.attrs.id !== 'undefined' &&
        this.iqListeners[stanza.attrs.id]){

        var cb = this.iqListeners[stanza.attrs.id];
        delete this.iqListeners[stanza.attrs.id];
        cb(stanza);
    }

    //Let everyone listen to the raw stanza
    this.emit('stanza', stanza);
};

Connection.prototype._onError = function(error){
    if(error == 'XMPP authentication failure')
        this.emit('error', {
            code: errors.AUTH_FAILED,
            msg: 'wrong user-password combination'
        });
    else if(error.code == 'ENOTFOUND')
        this.emit('error', {
            code: errors.TECH_ERROR,
            msg: 'invalid domain'
        });
    else
        this.emit('error', {
            code: errors.TECH_ERROR,
            msg: error
        })
};

Connection.prototype.send = function(stanza){
    log.debug('hServer Sent Stanza', stanza);
    this.xmppConnection.send(stanza);
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
    this.iqListeners[msgId] = cb;


    this.xmppConnection.send(msg);
    return msgId;
};

/**
 * Removes the callback to be executed from the IQ listener, if the id
 * does not exist nothing will happen.
 * @param id - ID received from the function sendIQ
 */
Connection.prototype.removeIQListener = function(id){ delete this.iqListeners[id] };

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.ServerConnection = new Connection();