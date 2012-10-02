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

var log = require('winston');
//Events
var util = require('util');
var events = require('events').EventEmitter;

var validator = require('../validators.js'),
    errors = require('../codes.js').errors,
    status = require('../codes.js').statuses;

var codes = require('../codes.js');

var Connection = function(){
    events.call(this);
    this.status = status.DISCONNECTED;
    this.iqListeners = {};
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
    var hAdmin = require('../hAdmin.js').getHAdmin();
    if(this.status == status.DISCONNECTED){
        this.opts = opts;
        if(!validator.validateJID(opts.jid))
            return this.emit('error', {code: errors.JID_MALFORMAT, msg: 'the given JID is not well formatted'});
        if(hAdmin !== undefined){
            if(validator.getDomainJID(opts.jid) !== validator.getDomainJID(hAdmin.opts.jid))
                return this.emit('error', {code: errors.AUTH_FAILED, msg: 'you can\'t connect from this domain'});
        }
        this.jid = opts.jid;
        this.serverDomain = validator.splitJID(opts.jid)[1];  //Since node 0.8, domain is a keyword reserved for eventsEmitter


        try{
            this.xmppConnection = new xmpp.Client(this.opts);
        }
        catch(err){
            log.error('Error xmpp connection : '+err);
        }

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
 * Process a message sending it through XMPP to the correct entity
 * @param message - an hMessage to send to a distant entity
 */
Connection.prototype.sendMessage = function(message){
    try{
        var msg = new xmpp.Element('message', {to: message.actor})
            .c('hbody', {type: 'hmessage'})
            .t(JSON.stringify(message));

        this.xmppConnection.send(msg);

    }catch(err){
        log.warn('Error while trying to send message through xmpp : ' + err);
    }
};

/**
 * Publish a message to a channel
 * Message actor should be a channel jid
 * @param hMessage - message to publish
 * @param cb - callback when result is available
 */
Connection.prototype.publishMessage = function(hMessage, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var attrs = {
        type: 'set',
        to: 'pubsub.' + this.serverDomain
    };

    var content = new xmpp.Element('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.actor})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));
    this.sendIQ(attrs, content, function(stanza){
        log.debug('hMessage published correctly', hMessage);
        if(cb)
            cb(codes.hResultStatus.OK, hMessage);
    });

};

/**
 * This is a private method that treats IQs, hMessages (for listening to raw stanzas, code onStanza
 * @param stanza - The stanza to analyze
 * @private
 */
Connection.prototype._onStanzas = function(stanza){
    log.debug('Connection  ' + this.jid + ' Received stanza:', stanza);
    //console.log('Connection  ' + this.jid + ' Received stanza:', stanza);
    var cb,
        hMessage;

    if(stanza.is('message') && stanza.attrs.type !== 'error'){

        if(stanza.getChild('event')){
            try{
                //Possible real-time hMessage
                hMessage= stanza.getChild('event').getChild('items').getChild('item').getChild('entry').getText();
                hMessage = JSON.parse(hMessage);
                //We don't need to protect from publish, because only another hnode should be able to publish to a node hnode is registered with
                this.emit('rawHMessage', hMessage);
            } catch(err){} //Do nothing, ignore


        }else if(stanza.getChild('hbody')){
            var body = stanza.getChild('hbody');
            var from = stanza.attrs.from;
            log.debug("From : " + from);
            try{
                if(/^hmessage$/i.test(body.attrs.type)){
                    hMessage = JSON.parse(body.getText());
                    if(!hMessage) throw 'null object';
                    if(!validator.compareJIDs(hMessage.publisher, from)) throw 'Error, publisher differs from xmpp sender';
                    this.emit('rawHMessage', hMessage);
                }
            } catch(err){log.debug(err)} //Do nothing, ignore
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



