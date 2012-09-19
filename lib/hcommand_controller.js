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

/**
 * This Controller takes care of all hCommands. Loads the requested hCommand,
 * sets a timeout for it in case it hangs up and calls callback when finishes executing
 * (even if there was an error)
 *
 * The hCommands that can be processed should be in the folder specified
 * by the param modulePath in the constructor.
 */

var hResultStatus = require('./codes.js').hResultStatus;
var db = require('./mongo.js').db;

var fs = require('fs');
var path = require('path');
var log = require('winston');

/**
 * Starts an hCommandController
 * @param params - {
 *     modulePath : <String> (Path to the modules directory)
 *     timeout : <int> (time to wait before sending a timeout hResult)
 * }
 */
var Controller = function(params){
    this.params = params;

    //Dummy context
    this.context = {
        hClient: {
            filterMessage: function(hMessage){ return hMessage; },
            filters: {},
            filtersOrder: {},
            buildResult : function(actor, ref, status, result) {
                var hmessage = {};
                hmessage.msgid = "DummyMsgId";
                hmessage.actor = actor;
                hmessage.convid = hmessage.msgid;
                hmessage.ref = ref;

                hmessage.type = 'hResult';

                hmessage.priority = 0;

                hmessage.publisher = "DummyJid";
                hmessage.published = new Date();

                var hresult = {};

                hresult.status = status;
                hresult.result = result;

                hmessage.payload = hresult;

                return hmessage;
            }
        }
    };
};

/**
 * Tries to load a module, returns undefined if couldn't find.
 * @param module - name of the module to load
 */
Controller.prototype.loadModule = function(module){
    var modulePath = this.params.modulePath;

    //Try to load Module ignoring case
    var fileNames = fs.readdirSync(modulePath);
    var regex = new RegExp(module, 'i');
    for(var i = 0; i < fileNames.length; i++)
        if(regex.test(fileNames[i])){
            var module = require(path.resolve(path.join(modulePath, fileNames[i]))).Command;
            return new module();
        }


    return null;
};

/**
 * Returns a hmessage with result payload with all the needed attributes
 * @param hMesage - the hMessage with the hCommand payload
 * @param status - the Status of the hResult
 * @param resObject - the optional object sent as a response
 */
Controller.prototype.createResult = function(hMessage, status, resObject){
    return this.context.hClient.buildResult(hMessage.publisher, hMessage.msgid, status, resObject);
};

/**
 * Loads the hCommand module, sets the listener calls cb with the hResult.
 * @param hMessage - The received hMessage with a hCommand payload
 * @param cb - Callback receiving a hResult (optional)
 */
Controller.prototype.execCommand = function(hMessage, cb){
    var self = this;
    var timerObject = null; //setTimeout timer variable
    var commandTimeout = null; //Time in ms to wait to launch timeout
    var hMessageResult;

    if(!hMessage) return;

    cb = cb || function(hMessage){};
    var hCommand = hMessage.payload;

    //check hCommand
    if (!hCommand || typeof hCommand !== 'object') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid payload. Not an hCommand"));
        return;
    }

    if (!hCommand.cmd || typeof hCommand.cmd !== 'string') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Not a string"));
        return;
    }

    if (hCommand.params && typeof hCommand.params !== 'object') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Params is settled but not an object"));
        return;
    }
    var module = this.loadModule(hCommand.cmd + '.js');
    if(module){

        commandTimeout = module.timeout || this.params.timeout;

        var onResult = function(status, result){
            //If callback is called after the timer ignore it
            if(timerObject == null) return;

            clearTimeout(timerObject);

            hMessageResult = self.createResult(hMessage, status, result);

            //Save result
            if( hMessageResult.persistent === true ){
                hMessageResult._id = msgId;

                delete hMessageResult.persistent;
                delete hMessageResult.msgid;

                db.saveHMessage(hMessageResult);

                hMessageResult.persistent = true;
                hMessageResult.msgid = hMessageResult._id;
                delete hMessageResult._id;
            }

            log.debug('hCommand Controller sent hMessage with hResult', hMessageResult);
            cb(hMessageResult);
        };

        //Add a timeout for the execution
        timerObject = setTimeout(function(){
            //Set it to null to test if cb is executed after timeout
            timerObject = null;

            hMessageResult = self.createResult(hMessage, hResultStatus.EXEC_TIMEOUT);

            log.warn('hCommand Controller sent hMessage with exceed timeout error', hMessageResult);
            cb(hMessageResult);

        }, commandTimeout);

        //Run it!
        module.exec(hMessage, this.context, onResult);

    }else{
        //Module not found
        hMessageResult = self.createResult(hMessage, hResultStatus.NOT_AVAILABLE);

        //Save result
        if( hMessageResult.persistent === true ){
            hMessageResult._id = msgId;

            delete hMessageResult.persistent;
            delete hMessageResult.msgid;

            db.saveHMessage(hMessageResult);

            hMessageResult.persistent = true;
            hMessageResult.msgid = hMessageResult._id;
            delete hMessageResult._id;
        }

        log.warn('hCommand Controller sent hMessage with module not found error', hMessageResult);
        cb(hMessageResult);
    }
};

exports.Controller = Controller;