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
var hResultStatus = require('../codes.js').hResultStatus;

var validator = require('../validators.js');
var db = require('../mongo.js').db;

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
        this.adminChannel = 'hAdminChannel';

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

        //Set resource to our JID
        self.jid += '/' + this.jid.resource;

        // Send presence to receive messages from clients
        // According to http://xmpp.org/rfcs/rfc3922.html
        this.send(new xmpp.Element('presence'));

        //When the channel is initialized, we can say we are finished with connection and initialization
        self._initAdminChannel(function(){
            self.emit('connect');
        });

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
        stanza.attrs.type !== 'error'){

        //hCommand
        if(hContent && /^hcommand$/i.test(hContent.attrs.type)){
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

        //hMessage (hMessages from administration channel need special treatment)
        if(stanza.getChild('event')){
            try{
                //Possible real-time hMessage
                var hMessage= stanza.getChild('event').getChild('items').getChild('item').getChild('entry').getText();
                hMessage = JSON.parse(hMessage);

                if(hMessage.chid == this.adminChannel)
                    this._onAdminChannelMessage(hMessage);

            } catch(err){} //Do nothing, ignore
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

Connection.prototype._onAdminChannelMessage = function(hMessage){
    log.debug('Received Message in Admin Channel', hMessage);

    //Update cache because another instance created a channel
    if(hMessage.type == 'hChannel' && validator.compareJIDs(hMessage.publisher, this.jid, 'r')){
        log.debug('Updating Cache', hMessage.payload);
        db.cache.hChannels[hMessage.payload._id] = hMessage.payload;
        console.error(db.cache);
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

/**
 * Publishes a hChannel object to the administration channel. Useful for updating hChannels cache
 * @param hChannel - hChannel to publish
 * @param cb - Optional callback that receives the hResult of the publication
 */
Connection.prototype.publishHChannel = function(hChannel, cb){
    var publishCmd = {
        sender: this.jid,
        cmd: 'hPublish',
        params:{
            chid: this.adminChannel,
            publisher: this.jid, //Publish with full JID to differentiate between different instances
            type: 'hChannel',
            payload: hChannel
        }
    };

    this.cmdController.execCommand(publishCmd, this.jid, cb);
};

/**
 * Used to initialize (if needed) the administration channel.
 * @param cb - Callback when initialization is finished
 * @private
 */
Connection.prototype._initAdminChannel = function(cb){
    //Tests if the admin channel exists and in case it doesn't it creates it
    //and adds itself to the participants list
    var self = this;

    var getChannelsCmd = {
        sender: validator.getBareJID(this.jid),
        cmd: 'hGetChannels'
    };

    var createAdminCmd = {
        sender: validator.getBareJID(this.jid),
        cmd: 'hCreateUpdateChannel',
        params:{
            chid: this.adminChannel,
            host: this.domain,
            owner: validator.getBareJID(this.jid),
            participants: [validator.getBareJID(this.jid)],
            active: true
        }
    };

    var subscribeCmd = {
        sender: this.jid,
        cmd: 'hSubscribe',
        params:{
            chid: this.adminChannel
        }
    };

    //Can't create it always, cause if there are other participants we would erase them
    this.cmdController.execCommand(getChannelsCmd, this.jid, function(hResult){
        //This is the only time where we can verify if it worked, if it didn't just don't launch. For the other commands.
        //If they don't work, hNode will never work again...

        if(hResult.status == hResultStatus.OK){

            //Test if channel exists
            for(var i = 0; i < hResult.result.length; i++)
                if(hResult.result[i].chid == self.adminChannel)
                    return cb();

            //If it does not, create it and subscribe
            self.cmdController.execCommand(createAdminCmd, self.jid, function(hResult){

                //When subscribed, and thus our epic story is finished...
                self.cmdController.execCommand(subscribeCmd, self.jid, function(hResult){
                    return cb();
                })

            })
        }
    })
};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.ServerConnection = new Connection();