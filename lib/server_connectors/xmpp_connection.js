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

var validator = require('../validators.js'),
    errors = require('../codes.js').errors,
    status = require('../codes.js').statuses;



var Connection = function(){
    events.call(this);
    this.status = status.DISCONNECTED;
    this.iqListeners = {};
    this.cmdListeners = {};
};

util.inherits(Connection, events);

/**
 * Connects to the XMPP Server and adds the listeners.
 * The listeners defined are onStanza, onError and onOnline,
 * If those methods are defined, they will be executed
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
Connection.prototype.xmppConnect = function(opts){
    if(this.status == status.DISCONNECTED){
        this.opts = opts;

        if(!validator.validateJID(opts.jid))
            return this.emit('error', {code: errors.JID_MALFORMAT, msg: 'the given JID is not well formatted'});

        this.jid = opts.jid;
        this.xmppdomain = validator.splitJID(opts.jid)[1];

        this.xmppConnection = new xmpp.Client(this.opts);

        //Set correct JID
        var self = this;
        this.xmppConnection.once('online', function(){
            self.jid += '/' + this.jid.resource;
            self.status = status.CONNECTED;

            self.emit('online');
        });

        this.xmppConnection.once('error', this._onError.bind(this));
        this.xmppConnection.on('stanza', this._onStanzas.bind(this));
    }
};

/**
 * Disconnects from the XMPP Server and emits a message to let the user know
 */
Connection.prototype.xmppDisconnect = function(){
    var self = this;

    if(this.xmppConnection && this.status == status.CONNECTED){
        this.xmppConnection.once('close', function(){
            self.status = status.DISCONNECTED;

            //Remove listeners
            this.removeAllListeners();

            log.debug('XMPP Connection ' + self.jid + ' closed');

            //Emit the disconnect status
            self.emit('disconnect');
        });

        this.xmppConnection.end();

    }else
        this.emit('disconnect'); //Not connected, just tell them so!
};

/**
 * Sends an XMPP stanza through the current connection - No verification will be done
 * @param stanza - The stanza to be sent
 */
Connection.prototype.send = function(stanza){
    if(this.status == status.CONNECTED)
        this.xmppConnection.send(stanza);
};

/**
 * Sends an IQ through this connection and calls cb when an answer is received
 * @param attrs - attributes of the iq {type: 'set' | 'get', to: <String>}
 * @param content - an XML Element to send as a child of the IQ
 * @param cb - Callback when the answer is received
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
};

/**
 * Process a command sending it through XMPP to the correct entity
 * @param command - an hCommand to send to a distant entity
 * @param cb - Function to call when the hResult is received
 */
Connection.prototype.sendCommand = function(command, cb){
    try{
        //Create a reqid to identify later if not provided
        command.reqid = command.reqid || UUID();

        var msg = new xmpp.Element('message', {to: command.entity})
            .c('hbody', {type: 'hcommand'})
            .t(JSON.stringify(command));

        //Add to list of open commands
        this.cmdListeners[command.reqid] = cb;

        this.xmppConnection.send(msg);

    }catch(err){}
};

/**
 * This is a private method that treats IQs, hMessages, hResults (for listening to raw stanzas, code onStanza
 * @param stanza - The stanza to analyze
 * @private
 */
Connection.prototype._onStanzas = function(stanza){
    log.debug('Connection  ' + this.jid + ' Received stanza:', stanza);
    var cb,
        hMessage;

    if(stanza.is('message') && stanza.attrs.type !== 'error'){

        if(stanza.getChild('event')){
            try{
                //Possible real-time hMessage
                hMessage= stanza.getChild('event').getChild('items').getChild('item').getChild('entry').getText();
                hMessage = JSON.parse(hMessage);
                this.emit('rawHMessage', hMessage);
            } catch(err){} //Do nothing, ignore


        }else if(stanza.getChild('hbody')){
            var body = stanza.getChild('hbody');
            try{
                if( /^hresult$/i.test(body.attrs.type) ){

                    var hResult = JSON.parse(body.getText());

                    //If we receive an hResult, call correct callback
                    if(this.cmdListeners[hResult.reqid]){
                        cb = this.cmdListeners[hResult.reqid];
                        delete this.cmdListeners[hResult.reqid];
                        cb(hResult);
                    }

                } else if(/^hcommand$/i.test(body.attrs.type)){

                    var objReceived = body.getText().replace(/&quot;/g,'"'); //Solves problem with Strophe
                    var hCommand = JSON.parse(objReceived);

                    if(!hCommand) throw 'null object';

                    this.emit('hCommand', hCommand, stanza.attrs.from);

                } else if(/^hmessage$/i.test(body.attrs.type)){

                    hMessage = JSON.parse(body.getText());

                    if(!hMessage) throw 'null object';

                    this.emit('rawHMessage', hMessage);
                }
            } catch(err){} //Do nothing, ignore
        }


    }else if(stanza.is('iq')){

        if(stanza.attrs.id !== 'undefined' && this.iqListeners[stanza.attrs.id]){

            cb = this.iqListeners[stanza.attrs.id];
            delete this.iqListeners[stanza.attrs.id];
            cb(stanza);

        } else if(stanza.attrs.type === 'get'){

            //Get requests are not implemented. We sent them back as errors to the server.
            var msg = new xmpp.Element('iq', {type: 'error',
                from: stanza.attrs.to,
                to: stanza.attrs.from,
                id: stanza.attrs.id});
            msg.c(stanza.children[0].getName(), {xmlns: stanza.children[0].getNS()});
            msg.c('error', { type: 'cancel'})
                .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'});

            self.client.send(msg);

        }
    }
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

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.Connection = Connection;
exports.Element = xmpp.Element;



