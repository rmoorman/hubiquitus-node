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
        this.on('hCommand', this.onHCommand.bind(this));

        this.xmppConnect(this.xmppOptions);
    }
};

hAdmin.prototype.disconnect = function(){
    this.removeAllListeners('rawHMessage');
    this.removeAllListeners('hCommand');
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
    //Update cache because another instance created a channel
    if(hMessage.type == 'hChannel' && !validator.compareJIDs(hMessage.publisher, this.jid, 'r')){
        db.cache.hChannels[hMessage.payload._id] = hMessage.payload;
    }
};

/**
 * When an hCommand is received through the XMPP network, treat it and send it back to the sender
 * @param hCommand - hCommand received
 * @param sender - XMPP sender full JID of the hCommand
 */
hAdmin.prototype.onHCommand = function(hCommand, sender){
    var xmppElement = require('./server_connectors/xmpp_connection.js').Element;
    var self = this;

    this.cmdController.execCommand(hCommand, sender, function(hResult){
        var msg = new xmppElement('message', {from: this.jid,
            to: sender})
            .c('hbody', {type: 'hresult'}).t(JSON.stringify(hResult));

        self.send(msg);
    });
};

/**
 * Used to initialize (if needed) the administration channel.
 * @param cb - Callback when initialization is finished
 * @private
 */
hAdmin.prototype._initAdminChannel = function(cb){
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

        if(hResult.status == codes.hResultStatus.OK){

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

/**
 * Publishes a hChannel object to the administration channel. Useful for updating hChannels cache
 * @param hChannel - hChannel to publish
 * @param cb - Optional callback that receives the hResult of the publication
 */
hAdmin.prototype.publishHChannel = function(hChannel, cb){
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

    if(this.status == codes.statuses.CONNECTED)
        this.cmdController.execCommand(publishCmd, this.jid, cb);
    else if(cb)
        cb(this.cmdController.createHResult(publishCmd, codes.hResultStatus.NOT_CONNECTED, 'the user is not connected'));
};


var hAdminSingleton;
exports.getHAdmin = function(cmdControllerOpts){
    if(!hAdminSingleton)
        hAdminSingleton = new hAdmin(cmdControllerOpts);

    return hAdminSingleton;
};
