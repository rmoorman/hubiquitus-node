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

var xmppConnectionConst = require('./server_connectors/xmpp_connection.js').Connection,
    cmdControllerConst = require('./hcommand_controller.js').Controller;

var statuses = require('./codes.js').statuses,
    errors = require('./codes.js').errors;

var validator = require('./validators.js');

var hAdmin = require('./hAdmin.js').getHAdmin();

var util = require('util');

var db = require('./mongo.js').db;

/**
 * hClient models the attributes, filters and XMPP Connection of each connected client.
 * @param cmdControllerOpts - Correctly formatted options for the command controller
 */
var hClient = function( cmdControllerOpts ){

    xmppConnectionConst.call(this); //an hClient is also a connection to XMPP
    this.cmdController = new cmdControllerConst(cmdControllerOpts);
    this.filters = {}; //Filters is an object addressed by its name
    this.filtersOrder = {};

    //Set the hClient in the context
    this.cmdController.context.hClient = this;
};

//Make hClient inherit the XMPP Connection
util.inherits(hClient, xmppConnectionConst);

/**
 * Action when connected
 */
hClient.prototype.onOnline = function(){
    var xmppElement = require('./server_connectors/xmpp_connection.js').Element;

    //Send Presence according to http://xmpp.org/rfcs/rfc3922.html
    this.send(new xmppElement('presence'));

    this.emit('hStatus', {status: statuses.CONNECTED, errorCode: errors.NO_ERROR});
    this.emit('connect');
};

/**
 * Listener for errors, it only resends the error as an hStatus with the correct status
 * @param err - Error received from the XMPP Client
 */
hClient.prototype.onError = function(err){
    this.emit('hStatus', {
        status: statuses.DISCONNECTED,
        errorCode: err.code,
        errorMsg: err.msg
    });
};

/**
 * Execute, publish or send a command, depending on the receiving entity
 *
 * @param message - message to send, publish, or with a command to run
 */
hClient.prototype.processMsg = function(hMessage) {
    //validate the message and then process it
    var self = this;

    //if jid is session, then replace it by the server jid
    if(hMessage && hMessage.actor === 'session')
        hMessage.actor = hAdmin.xmppOptions.jid;


    //For legacy purposes, if actor is a channel and does not contain # or @domain, include them
    if(hMessage && validator.isChannel(hMessage.actor)) {
        var domain = validator.getDomainJID(this.xmppOptions.jid);
        hMessage.actor = validator.normalizeChannel(hMessage.actor, validator.getDomainJID(domain));
    }

    validator.validateHMessage(hMessage, function(err, result){
        //before everything make the msgid uniq
        hMessage.msgid = self.makeMsgId(hMessage.msgid);

        if(err)
            return self.emit("hMessage", self.buildResult(hMessage.msgid, undefined, err, result));


        //Test publisher connected user (ignore the resource from both of them)
        if( !validator.compareJIDs(self.xmppOptions.jid, hMessage.publisher) )
            return self.emit("hMessage", self.buildResult(hMessage.msgid, undefined, statuses.NOT_AUTHORIZED, 'publisher does not match sender'));

        //Because actor can be another user, initialize to empty obj to use same completer methods
        var channel = db.cache.hChannels[hMessage.actor] || {};

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


        //If not transient store it (If it does not exist it is transient)
        if( hMessage.transient === false ){
            hMessage._id = msgId;

            delete hMessage.transient;
            delete hMessage.msgid;

            db.saveHMessage(hMessage);

            hMessage.transient = false;
            hMessage.msgid = hMessage._id;
            delete hMessage._id;
        }
        //dispatch it, depending on actor
        if( validator.isChannel(hMessage.actor) ) //publish it if it's a channel
            self.publishMessage(hMessage, function(status, result) {
                self.emit("hMessage", self.buildResult(hMessage.msgid, "hpublish", status, result))
            });
        else if( validator.compareJIDs(hMessage.actor, hAdmin.xmppOptions.jid) ) //process the message if it's a command to the server
            if(hMessage.type.toLowerCase() === "hcommand")
                self.cmdController.execCommand(hMessage, function(result) {
                    self.emit("hMessage", result)
                 });
            else
                return self.emit("hMessage", self.buildResult(hMessage.msgid, undefined, statuses.NOT_AUTHORIZED, 'server only accepts hCommand payload'));
        else
            self.sendMessage(hMessage);
    });

}

/**
 * Create a unique message id from a client message id
 * Message id should follow the from clientMsgId#serverUniqueMsgId
 * If client message id contains #, it's removed
 *
 * @param clientMsgId
 */
hClient.prototype.makeMsgId = function(clientMsgId) {
    var msgId = ""
    try {
        msgId = clientMsgId.replace("#", "")
    } catch(err) { }

    msgId += "#" + db.createPk();

    return msgId;
}

hClient.prototype.buildResult = function(ref, cmd, status, result) {
    var hmessage = {};
    hmessage.msgid = this.makeMsgId();
    hmessage.actor = this.xmppOptions.jid;
    hmessage.convid = hmessage.msgid;
    hmessage.ref = ref;

    hmessage.type = 'hResult';

    hmessage.priority = 0;

    hmessage.publisher = hAdmin.xmppOptions.jid;
    hmessage.published = new Date();

    var hresult = {};
    hresult.cmd = cmd;
    hresult.status = status;
    hresult.result = result;

    hmessage.payload = hresult;

    return hmessage;
}

/**
 * Connects the user to the XMPP Server
 * @param connectionOpts - Options for the XMPP Client (publisher will be set as jid)
 */
hClient.prototype.connect = function( connectionOpts ){
    connectionOpts.jid = connectionOpts.jid || connectionOpts.publisher;

    this.xmppOptions = connectionOpts;
    var self = this;

    this.once('online', this.onOnline.bind(this));
    this.on('error', this.onError.bind(this));
    this.on('rawHMessage', function(hMessage){
        var filteredMessage = self.filterMessage(hMessage);
        if(filteredMessage)
            self.emit('hMessage', filteredMessage);
    });

    this.xmppConnect(this.xmppOptions);
};

hClient.prototype.disconnect = function(){
    this.removeAllListeners('error');
    this.removeAllListeners('rawHMessage');
    this.xmppDisconnect();
};

/**
 * Filters a message. This is useful for commands that need to filter the message before
 * sending it back and for filtering realtime messages
 * @param hMessage - The message to filter
 * @return null if the message does not pass the filters, the hMessage received if it passes
 */
hClient.prototype.filterMessage = function(hMessage){
    var order = this.filtersOrder[hMessage.chid];
    var filters = this.filters[hMessage.chid];
    var filter;

    function introspect(toCheck, checker){
        if(typeof toCheck !== typeof checker)
            return false; //Different types

        if(typeof checker === 'object'){

            if(checker === null)
                return toCheck === checker;

            if(checker instanceof Array){
                for(var i = 0; i < toCheck.length; i++){
                    if(!introspect(toCheck[i], checker[i]))
                        return false;
                }
                return true;

            } else{
                //It's an object!
                for(var attr in checker){
                    if(checker.hasOwnProperty(attr) && !introspect(toCheck[attr], checker[attr]))
                        return false;
                }
                return true;
            }

        } else
            return toCheck === checker; //Primitive types, just compare
    }

    function checkRadius(){
        //Adapted from http://www.movable-type.co.uk/scripts/latlong.html

        if( !filter.radius ) //Radius not set, ignore test
            return true;

        //lat or lng do not exist in msg
        if( !hMessage.location || typeof hMessage.location.lat != 'number' || typeof hMessage.location.lng != 'number')
            return false;

        function toRad(num){ return num * Math.PI / 180; }

        var R = 6371; //Earth radius in KM
        var latChecker = toRad(filter.template.location.lat), lngChecker= toRad(filter.template.location.lng);
        var latToCheck = toRad(hMessage.location.lat), lngToCheck = toRad(hMessage.location.lng);
        var dLat = latChecker - latToCheck;
        var dLon = lngChecker - lngToCheck;

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(latChecker) * Math.cos(latToCheck) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;

        return Math.abs(d*1000) <= filter.radius;
    }

    function checkRelevance(){

        return !filter.relevant || hMessage.relevance >= new Date();
    }

    if(order){
        for(var i = 0; i < order.length; i++){
            filter = filters[order[i]];

            //Check if filter for message in this channel
            if(!checkRadius() || !checkRelevance())
                return null; //Simply stop filtering and say we didn't pass the filters

            else if(filter.template){

                //Remove lat and lng to be able to compare other values using exact match
                if(filter.template.location){
                    var lat = filter.template.location.lat;
                    var lng = filter.template.location.lng;
                    delete filter.template.location.lat;
                    delete filter.template.location.lng;
                }

                var introspectResult = introspect(hMessage, filter.template);

                //Restore lat and lng to original values
                if(filter.template.location){
                    filter.template.location.lat = lat;
                    filter.template.location.lng = lng;
                }

                if(!introspectResult)
                    return null; //Introspection failed for the attribute
            }
        }
    }

    return hMessage;
};

exports.hClient = hClient;