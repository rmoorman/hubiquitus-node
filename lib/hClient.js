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
    cmdControllerConst = require('./hcommand_controller.js').Controller;

var statuses = require('./codes.js').statuses,
    errors = require('./codes.js').errors;

var util = require('util');

/**
 * hClient models the attributes, filters and XMPP Connection of each connected client.
 * @param cmdControllerOpts - Correctly formatted options for the command controller
 */
var hClient = function( cmdControllerOpts ){

    xmppConnectionConst.call(this); //an hClient is also a connection to XMPP
    this.cmdController = new cmdControllerConst(cmdControllerOpts);
    this.filters = {}; //Filters is an object addressed by its name
    this.filtersOrder = [];

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
 * Executes or sends a command, depending on the receiving entity
 * @param command - command to execute locally or send to correct entity
 * @param cb - If a command is executed locally, a callback with the hResult will be called.
 */
hClient.prototype.command = function(command, cb){
    if(command)
        if(command.entity == 'hnode@' + this.domain)
            this.cmdController.execCommand(command, this.jid, cb);
        else
            this.sendCommand(command, cb); //If not addressed locally, send using XMPP
};

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
    var order = this.filtersOrder;
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
        //TODO: Supposedly difficult...
        return true;
    }

    function checkRelevance(){
        //TODO implement relevance in hMessage
        return true;
    }


    for(var i = 0; i < order.length; i++){
        filter = this.filters[order[i]];

        //Check if filter for message in this channel
        if(filter.chid == hMessage.chid){
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