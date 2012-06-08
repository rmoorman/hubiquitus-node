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

var status = require('./codes.js').hResultStatus;
var db = require('./mongo.js');

var fs = require('fs');
var path = require('path');
var log = require('winston');

/**
 * Starts an hCommandController
 * @param params - {
 *     modulePath : <String> (Path to the modules directory)
 *     timeout : <int> (time to wait before sending a timeout hResult)
 *     jid : <String> JID of the user that is using the hCommandController (can have resource)
 *     checkSender: <Boolean> (Optional, default: true) if set to false the sender will not be verified
 * }
 */
var Controller = function(params){
    params.checkSender = params.checkSender !== false;

    this.params = params;

    this.context = {
        jid: params.jid,
        domain: params.jid.replace(/\w+@/,'').replace(/\/.*/,'')
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
 * Returns an hResult object with all the needed attributes
 * @param hCommand - the hCommand of the hResult
 * @param status - the Status of the hResult
 * @param resObject - the optional object sent as a response
 */
Controller.prototype.createHResult = function(hCommand, status, resObject){
    return {
        cmd : hCommand.cmd,
        reqid : hCommand.reqid,
        status : status,
        result : resObject
    };
};

/**
 * Loads the hCommand module, sets the listener calls cb with the hResult.
 * @param hCommand - The received hCommand
 * @param cb - Callback receiving a hResult (optional)
 */
Controller.prototype.execCommand = function(hCommand, cb){
    var self = this;
    var mongoReqID = null; // ReqID if needed to save in mongo
    var timerObject = null; //setTimeout timer variable
    var commandTimeout = null; //Time in ms to wait to launch timeout
    var hResult;

    cb = cb || function(hResult){};

    if(!hCommand) return;

    //Save to Mongo
    if(hCommand.transient === false){
        mongoReqID = UUID();

        var commandInstance = new db.models.hCommand();

        //Copy properties of the received object
        for (var key in hCommand)
            if (hCommand.hasOwnProperty(key))
                commandInstance[key] = hCommand[key];

        commandInstance.reqid = mongoReqID; //There may be collisions with the one created by the user
        commandInstance.save(function(err){
            if(err)
                log.error('Error saving command', err)
        });
    }

    //Because the result can be called from different places, make it a function
    function saveHResult(hResult, reqID){
        var hResultInstance = new db.models.hResult();

        //Copy properties of the received object
        for (var key in hResult)
            if (hResult.hasOwnProperty(key))
                hResultInstance[key] = hResult[key];

        hResultInstance.reqid = reqID; //Set it to the one from the hCommand saved
        hResultInstance.save(function(err){
            if(err)
                log.error('Error saving result', err)
        });

    }

    //Test the sender if needed
    if( this.params.checkSender &&
        (!hCommand.sender || hCommand.sender.replace(/\/.*/,'') != this.context.jid.replace(/\/.*/, ''))){
        hResult = self.createHResult(hCommand, status.NOT_AUTHORIZED, 'sender does not match user');

        //Save to Mongo
        if(hCommand.transient === false)
            saveHResult(hResult, mongoReqID);

        log.info('hCommand Controller sent hResult', hResult);
        cb(hResult);
        return;
    }

    var module = this.loadModule(hCommand.cmd + '.js');
    if(module){

        commandTimeout = module.timeout || this.params.timeout;

        var onResult = function(status, result){
            //If callback is called after the timer ignore it
            if(timerObject == null) return;

            clearTimeout(timerObject);

            var hResult = self.createHResult(hCommand, status, result);

            //Save to Mongo
            if(hCommand.transient === false)
                saveHResult(hResult, mongoReqID);

            log.info('hCommand Controller sent hResult', hResult);
            cb(hResult);
        };

        //Add a timeout for the execution
        timerObject = setTimeout(function(){
            //Set it to null to test if cb is executed after timeout
            timerObject = null;

            var hResult = self.createHResult(hCommand, status.EXEC_TIMEOUT);

            log.info('hCommand Controller sent hResult', hResult);
            cb(hResult);

        }, commandTimeout);

        //Run it!
        module.exec(hCommand, this.context, onResult);

    }else{
        //Module not found
        hResult = self.createHResult(hCommand, status.NOT_AVAILABLE);

        //Save to Mongo
        if(hCommand.transient === false)
            saveHResult(hResult, mongoReqID);

        log.info('hCommand Controller sent hResult', hResult);
        cb(hResult);
    }
};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.Controller = Controller;