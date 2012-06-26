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
    validator = require('./validators.js');

var statuses = require('./codes.js').statuses,
    errors = require('./codes.js').errors;

var util = require('util');

/**
 * hClient models the attributes, filters and XMPP Connection of each connected client.
 * @param connectionOpts - Options for the XMPP Client (publisher will be set as jid)
 * @param cmdControllerOpts - Correctly formatted options for the command controller
 */
var hClient = function( connectionOpts, cmdControllerOpts ){

    this.jid = connectionOpts.publisher;
    this.domain = validator.splitJID(this.jid)[1];

    this.xmppOptions = connectionOpts;
    this.xmppOptions.jid = connectionOpts.publisher;

    xmppConnectionConst.call(this, connectionOpts); //an hClient is also a connection to XMPP
    this.cmdController = new cmdControllerConst(cmdControllerOpts);
};

//Make hClient inherit the command controller and the xmpp client
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

hClient.prototype.connect = function(){
    this.once('online', this.onOnline.bind(this));
    this.on('error', this.onError.bind(this));

    this.xmppConnect(this.xmppOptions);
};

exports.hClient = hClient;