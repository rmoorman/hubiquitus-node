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

//Events
var util = require('util');
var events = require('events').EventEmitter;

var xmpp = require('node-xmpp');
var errors = require('../codes.js').errors;
var statuses = require('../codes.js').statuses;


/**
 * @param params
 * { (String) publisher: bare JID (format: "user@domain")
 *   (String) password: User's XMPP password
 *   (Optional) (String) serverHost: XMPP host
 *   (Optional) (String) serverPort : XMPP port to connect to  }
 */
var XMPPConnector = function(params){
    events.call(this);
    this.parameters = params;
    this.parameters.jid = params.publisher;
    this.parameters.host = params.serverHost;
    this.parameters.port = params.serverPort;

    this.openCommands = {};
};

util.inherits(XMPPConnector, events);

/**
 * Connects to the xmpp server and starts listening for subscribed events
 */
XMPPConnector.prototype.connect = function(){
    var self = this;

    this.client = new xmpp.Client(this.parameters);

    log.debug('Connecting client ' + this.parameters.jid + ' to XMPP Server');

    this.client.once('error', function(msg){
        if( msg == 'XMPP authentication failure' )
            self.emit('hStatus', {status: statuses.DISCONNECTED, errorCode: errors.AUTH_FAILED});
    });

    this.client.once('online',
        function() {
            //Recover our complete JID as given by the server
            self.parameters.jid = this.jid.user + '@' + this.jid.domain + '/' + this.jid.resource;
            self.parameters.domain = this.jid.domain;

            //Send Presence according to http://xmpp.org/rfcs/rfc3922.html
            this.send(new xmpp.Element('presence'));

            self.emit('hStatus', {status: statuses.CONNECTED, errorCode: errors.NO_ERROR});
            self.emit('connection', {publisher: self.parameters.jid, domain: self.parameters.domain});
        });

    //Once new messages arrive, parse them and emit them
    this.client.on('stanza', this.onStanzas.bind(this));
};

/**
 * Disconnects the current client from the XMPP Server
 */
XMPPConnector.prototype.disconnect = function(){
    //Check if we haven't already disconnected
    if(this.client.socket){
        this.client.removeAllListeners('stanza');
        this.client.end();
    }

    log.debug('Disconnected client ' + this.parameters.jid + ' from XMPP Server');
};

/**
 * Process a command sending it to the XMPP Server
 * @param command - a command to send to a distant entity
 * @param cb - Function to call when the hResult is received
 */
XMPPConnector.prototype.xmppCommand = function(command, cb){
    try{
        //Create a reqid to identify later if not provided
        command.reqid = command.reqid || UUID();

        var msg = new xmpp.Element('message', {to: command.entity})
            .c('hbody', {type: 'hcommand'})
            .t(JSON.stringify(command));

        //Add to list of open commands
        this.openCommands[command.reqid] = cb;

        this.client.send(msg);
        log.debug('Client ' + this.parameters.jid + ' Sent stanza:', msg);
    }catch(err){
        log.debug('Client ' + this.parameters.jid + ' tried to send invalid command', err);
    }
};


/**
 * Function executed each time a XMPP stanza is received, parses hResults, hMessages and IQs
 * @param stanza - received stanza
 */
XMPPConnector.prototype.onStanzas = function(stanza){
    log.debug('Client ' + this.parameters.jid + ' Received stanza:', stanza);

    if(stanza.is('message') && stanza.attrs.type !== 'error'){

        if(stanza.getChild('event')){
            try{
                //Possible real-time hMessage
                var hMessage= stanza.getChild('event').getChild('items').getChild('item').getChild('entry').getText();
                hMessage = JSON.parse(hMessage);
                this.emit('hMessage', hMessage);
            } catch(err){} //Do nothing, ignore


        }else if(stanza.getChild('hbody')){
            var body = stanza.getChild('hbody');
            try{
                if( body.attrs.type === 'hresult' ){
                    var hResult = JSON.parse(body.getText());

                    //If we receive an hResult, call correct callback
                    if(this.openCommands[hResult.reqid]){
                        var cb = this.openCommands[hResult.reqid];
                        delete this.openCommands[hResult.reqid];
                        cb(hResult);
                    }

                }
            } catch(err){} //Do nothing, ignore
        }


    }else if(stanza.is('iq') && stanza.attrs.type === 'get'){
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
};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.XMPPConnector = XMPPConnector;