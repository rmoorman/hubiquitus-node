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

var xmppConnectionConst = require('./server_connectors/xmpp_connection.js').Connection,
    cmdControllerConst = require('./hcommand_controller.js').Controller,
    db = require('./mongo.js').db,
    validator = require('./validators.js');

var codes = require('./codes.js');

var statuses = require('./codes.js').statuses,
    errors = require('./codes.js').errors;

var log = require('winston');


var util = require('util');


/**
 * hAdmin models the attributes, filters and XMPP Connection of each the single connection used for administration
 * purposes.
 * @param cmdControllerOpts - Correctly formatted options for the command controller (They will be used to execute
 * commands as the admin)
 */
var hAdmin = function( cmdControllerOpts ){
    this.adminChannel = 'hAdminChannel';

    xmppConnectionConst.call(this); //an hClient is also a connection to XMPP
    this.cmdController = new cmdControllerConst(cmdControllerOpts);

    //Set the hAdmin in the context
    this.cmdController.context.hClient = this;
};

//Make hAdmin inherit the XMPP Connection
util.inherits(hAdmin, xmppConnectionConst);

/**
 * Connects the client to the XMPP Server
 * @param connectionOpts - Options for the XMPP Client
 */
hAdmin.prototype.connect = function( connectionOpts ){
    if(this.status == codes.statuses.DISCONNECTED){
        this.xmppOptions = connectionOpts;

        this.once('online', this.onOnline.bind(this));
        this.on('rawHMessage', this.onAdminMessage.bind(this));
        this.on('hMessage', this.sendMessage.bind(this));

        this.xmppConnect(this.xmppOptions);
    }
};

hAdmin.prototype.disconnect = function(){
    this.removeAllListeners('rawHMessage');
    this.removeAllListeners('hMessage');
    this.xmppDisconnect();
};

/**
 * Action when connected
 */
hAdmin.prototype.onOnline = function(){
    var xmppElement = require('./server_connectors/xmpp_connection.js').Element;
    var self = this;

    //Send Presence according to http://xmpp.org/rfcs/rfc3922.html
    this.send(new xmppElement('presence'));

    //When the channel is initialized, we can say we are finished with connection and initialization
    this._initAdminChannel(function(){
        self.emit('connect');
    });

};

/**
 * When a message is received addressed to us, treat it
 * @param hMessage
 */
hAdmin.prototype.onAdminMessage = function(hMessage){
    log.debug("onAdmin : " + JSON.stringify(hMessage));
    //Fire deal with admin messages
    //Update cache because another instance created a channel
    log.debug("Publisher : " + hMessage.publisher + "   local jid : " + this.jid);
    if(hMessage.type == 'hChannel' && validator.compareJIDs(hMessage.publisher, this.jid, 'r')){
        db.cache.hChannels[hMessage.payload._id] = hMessage.payload;
        return;
    }

    //If it's not an admin message, deal with it normally
    this.processMsg(hMessage);
};

/**
 * WARN : if updated here should also be update in hAdmin
 * Execute, publish or send a command, depending on the receiving entity
 *
 * @param message - message to send, publish, or with a command to run
 */
hAdmin.prototype.processMsg = function(hMessage) {
    var self = this;
    this.processMsgInternal(hMessage, function(hMessageResult) {
        self.emit("hMessage", hMessageResult);
    });
};

/**
 * WARN : if updated here should also be update in hClient
 * Internal : Execute, publish or send a command, depending on the receiving entity
 *
 * @param message - message to send, publish, or with a command to run
 */
hAdmin.prototype.processMsgInternal = function(hMessage, cb) {
    //validate the message and then process it
    var self = this;

    //if jid is session, then replace it by the server jid
    if(hMessage && hMessage.actor === 'session')
        hMessage.actor = this.jid;

    //Test if hMessage.actor is a correct jid
    if(!validator.validateJID(hMessage.actor))
        return cb(self.buildResult(hMessage.publisher, hMessage.msgid, 'send', codes.hResultStatus.MISSING_ATTR, 'actor is not a validate JID'));

    validator.validateHMessage(hMessage, function(err, result){
        //before everything make the msgid uniq
        hMessage.msgid = self.makeMsgId(hMessage.msgid);

        if(err)
            return cb(self.buildResult(hMessage.publisher, hMessage.msgid, 'send', err, result));


        //Checks are made before in xmpp_connection
        //Test publisher connected user (ignore the resource from both of them)
        //if( !validator.compareJIDs(self.xmppOptions.jid, hMessage.publisher) )
        //    return self.emit("hMessage", self.buildResult(hMessage.msgid, undefined, statuses.NOT_AUTHORIZED, 'publisher does not match sender'));

        //Because actor can be another user, initialize to empty obj to use same completer methods
        var channel = {};
        if(db.cache.hChannels[hMessage.actor])
            channel = db.cache.hChannels[hMessage.actor];

        //Location order: hMessage, channel (as defined in ref.)
        hMessage.location = hMessage.location || channel.location;

        //Priority order: hMessage, channel, 1 (as defined in ref.)
        hMessage.priority = hMessage.priority || channel.priority || 1;

        //If hAlert force at least minimum priority
        if( /hAlert/i.test(hMessage.type) && hMessage.priority < 2 )
            hMessage.priority = 2;


        //Complete missing values (msgid added later)
        hMessage.convid = !hMessage.convid || hMessage.convid == hMessage.msgid ? hMessage.msgid : hMessage.convid;
        hMessage.published = hMessage.published || new Date();

        //Treat relevance
        var relevance = hMessage.relevance;
        if( hMessage.headers && hMessage.headers.RELEVANCE_OFFSET ){

            var offset = hMessage.published.getTime() + hMessage.headers.RELEVANCE_OFFSET;
            relevance = relevance ? Math.max(offset, hMessage.relevance.getTime()) : offset;

        }
        if(relevance)
            hMessage.relevance = new Date(relevance);


        //Empty location and headers should not be sent/saved.
        validator.cleanEmptyAttrs(hMessage, ['headers', 'location']);


        //If persistent store it (If it does not exist it is not persistent)
        if( hMessage.persistent === true ){
            hMessage._id = msgId;

            delete hMessage.persistent;
            delete hMessage.msgid;

            db.saveHMessage(hMessage);

            hMessage.persistent = true;
            hMessage.msgid = hMessage._id;
            delete hMessage._id;
        }
        //dispatch it, depending on actor
        if( validator.isChannel(hMessage.actor) ){
            if(type === "hcommand"){
                if(hMessage.type.toLowerCase() === "hcommand")
                    self.cmdController.execCommand(hMessage, function(result) {
                        log.debug("Command result : " + JSON.stringify(result));
                        cb(result)
                    });
                else
                    return cb(self.buildResult(hMessage.publisher, hMessage.msgid, undefined, codes.hResultStatus.NOT_AUTHORIZED, 'server only accepts hCommand payload'));
            }
            else{
                self.publishMessage(hMessage, function(status, result) {
                    cb(self.buildResult(hMessage.publisher, hMessage.msgid, "send", status, result))
                });
            }
        }
        else if( validator.compareJIDs(hMessage.actor, self.jid) ) //process the message if it's a command to the server
            if(hMessage.type.toLowerCase() === "hcommand")
                self.cmdController.execCommand(hMessage, function(result) {
                    log.debug("Command result : " + JSON.stringify(result));
                    cb(result)
                });
            else
                return cb(self.buildResult(hMessage.publisher, hMessage.msgid, undefined, codes.hResultStatus.NOT_AUTHORIZED, 'server only accepts hCommand payload'));
        else
            self.sendMessage(hMessage);
    });

};

/**
 * WARN : if updated here should also be update in hClient
 * Create a unique message id from a client message id
 * Message id should follow the from clientMsgId#serverUniqueMsgId
 * If client message id contains #, it's removed
 *
 * @param clientMsgId
 */
hAdmin.prototype.makeMsgId = function(clientMsgId) {
    var msgId = ""
    try {
        msgId = clientMsgId.replace("#", "")
    } catch(err) { }

    msgId += "#" + db.createPk();

    return msgId;
};

/**
 * WARN : if updated here should also be update in hClient
 */
hAdmin.prototype.buildResult = function(actor, ref, cmd, status, result) {
    var hmessage = {};
    hmessage.msgid = this.makeMsgId();
    hmessage.actor = actor;
    hmessage.convid = hmessage.msgid;
    hmessage.ref = ref;

    hmessage.type = 'hResult';

    hmessage.priority = 0;

    hmessage.publisher = this.jid;
    hmessage.published = new Date();

    var hresult = {};
    hresult.cmd = cmd;
    hresult.status = status;
    hresult.result = result;

    hmessage.payload = hresult;

    return hmessage;
};

hAdmin.prototype.buildCommand = function(cmd, params) {
    var hmessage = {};
    hmessage.msgid = this.makeMsgId();
    hmessage.actor = validator.getBareJID(this.jid);
    hmessage.convid = hmessage.msgid;

    hmessage.type = 'hCommand';

    hmessage.priority = 0;

    hmessage.publisher = this.jid;
    hmessage.published = new Date();

    var hcommand = {};
    hcommand.cmd = cmd;
    hcommand.params = params;

    hmessage.payload = hcommand;

    return hmessage;
};

hAdmin.prototype.buildMessage = function(actor, type, payload) {
    var hmessage = {};
    hmessage.msgid = this.makeMsgId();
    hmessage.actor = validator.getBareJID(actor);
    hmessage.convid = hmessage.msgid;

    hmessage.type = type;

    hmessage.priority = 0;

    hmessage.publisher = this.jid;
    hmessage.published = new Date();

    hmessage.payload = payload;

    return hmessage;
};

/**
 * Used to initialize (if needed) the administration channel.
 * @param cb - Callback when initialization is finished
 * @private
 */
hAdmin.prototype._initAdminChannel = function(cb){
    //Tests if the admin channel exists and in case it doesn't it creates it
    //and adds itself to the subscribers list
    var self = this;

    var getChannelsCmd = this.buildCommand('hGetChannels');

    var createAdminCmd = this.buildCommand('hCreateUpdateChannel',{
            actor: this.adminChannel,
            owner: validator.getBareJID(this.jid),
            subscribers: [validator.getBareJID(this.jid)],
            active: true
    });

    var subscribeCmd = this.buildCommand('hSubscribe');
    subscribeCmd.actor = this.adminChannel;

    //Can't create it always, cause if there are other subscribers we would erase them
    this.cmdController.execCommand(getChannelsCmd, function(hMessage){
        //This is the only time where we can verify if it worked, if it didn't just don't launch. For the other commands.
        //If they don't work, hNode will never work again...
        var hResult = hMessage.payload;
        if(hResult.status == codes.hResultStatus.OK){

            //Test if channel exists
            for(var i = 0; i < hResult.result.length; i++)
                if(hResult.result[i].actor == self.adminChannel)
                    return cb();

            //If it does not, create it and subscribe
            self.cmdController.execCommand(createAdminCmd, function(hMessage){

                //When subscribed, and thus our epic story is finished...
                self.cmdController.execCommand(subscribeCmd, function(hMessage){
                    return cb();
                });

            });
        }
    })
};

/**
 * Publishes a hChannel object to the administration channel. Useful for updating hChannels cache
 * @param hChannel - hChannel to publish
 * @param cb - Optional callback that receives the hResult of the publication
 */
hAdmin.prototype.publishHChannel = function(hChannel, cb){
    var actor = validator.normalizeChannel(this.adminChannel, validator.getDomainJID(this.jid));
    var publishMsg = this.buildMessage(actor, 'hChannel', hChannel);
    var self = this;
    if(this.status == codes.statuses.CONNECTED)
        this.publishMessage(publishMsg, function(status, result) {
            if(cb)
                cb(self.buildResult(publishMsg.publisher, publishMsg.msgid, 'hpublish', status, result));
        });
    else if(cb)
        cb(self.buildResult(publishMsg.publisher, publishMsg.msgid, 'hpublish', codes.hResultStatus.NOT_CONNECTED, 'the user is not connected'));
};


var hAdminSingleton;
exports.getHAdmin = function(cmdControllerOpts){
    if(!hAdminSingleton)  {
        hAdminSingleton = new hAdmin(cmdControllerOpts);
    }

    return hAdminSingleton;
};
