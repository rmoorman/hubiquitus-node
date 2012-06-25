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

var xmppClientConst = require('./server_connectors/xmpp_client.js').XMPPConnector,
    cmdControllerConst = require('./hcommand_controller.js').Controller,
    validator = require('./validators.js');

var util = require('util');

/**
 * hClient models the attributes, filters and XMPP Connection of each connected client.
 * @param connectionOpts - Correctly formatted options for xmpp_client
 * @param cmdControllerOpts - Correctly formatted options for the command controller
 */
var hClient = function( connectionOpts, cmdControllerOpts ){

    this.publisher = connectionOpts.publisher;
    this.domain = validator.splitJID(this.publisher)[1];

    xmppClientConst.call(this, connectionOpts); //an hClient is also a connection to XMPP
    this.cmdController = new cmdControllerConst(cmdControllerOpts);
};


//Make hClient inherit the command controller and the xmpp client
util.inherits(hClient, xmppClientConst);

/**
 * Executes or sends a command, depending on the receiving entity
 * @param command - command to execute locally or send to correct entity
 * @param cb - If a command is executed locally, a callback with the hResult will be called.
 */
hClient.prototype.command = function(command, cb){
    if(command)
        if(command.entity == 'hnode@' + this.domain)
            this.cmdController.execCommand(command, this.publisher, cb);
        else
            this.xmppCommand(command, cb); //If not addressed locally, send using XMPP
};

exports.hClient = hClient;