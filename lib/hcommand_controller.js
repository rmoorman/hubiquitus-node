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
            filtersOrder: {}
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
 * Returns an hResult object with all the needed attributes
 * @param hCommand - the hCommand of the hResult
 * @param status - the Status of the hResult
 * @param resObject - the optional object sent as a response
 */
Controller.prototype.createHResult = function(hCommand, status, resObject){
    return {
        /* EBR à supprimer begin */
        cmd : hCommand.cmd,
        reqid : hCommand.reqid,
        /* EBR à supprimer end */
        status : status,
        result : resObject
    };
};

/**
 * Loads the hCommand module, sets the listener calls cb with the hResult.
 * @param hCommand - The received hCommand
 * @param sender - The sender of the hCommand. Not to be confused with hCommand.sender
 * This will be used to check against hCommand.sender if correct credentials. If not specified
 * the sender will not be checked
 * @param cb - Callback receiving a hResult (optional)
 */
Controller.prototype.execCommand = function(hCommand, sender, cb){
    var self = this;
    var timerObject = null; //setTimeout timer variable
    var commandTimeout = null; //Time in ms to wait to launch timeout
    var hResult;

    if(!hCommand) return;

    cb = cb || function(hResult){};

    function saveCommand(){
        var reqid = hCommand.reqid;

        //Remove useless fields
        delete hResult.reqid;
        delete hCommand.reqid;
        delete hCommand.transient;

        //Save to mongo
        hCommand._id = hResult._id = db.createPk();
        db.saveHCommand(hCommand);
        db.saveHResult(hResult);

        //Put back useless fields in hResult to send to client
        delete hResult._id;
        hResult.reqid = reqid;
    }

    //Test sender if needed
    if( sender &&
        (!hCommand.sender || hCommand.sender.replace(/\/.*/,'') != sender.replace(/\/.*/, ''))){
        hResult = self.createHResult(hCommand, status.NOT_AUTHORIZED, 'sender does not match user');

        //Save to Mongo
        if(hCommand.transient === false)
            saveCommand();

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

            hResult = self.createHResult(hCommand, status, result);

            //Save to Mongo
            if(hCommand.transient === false)
                saveCommand();

            log.info('hCommand Controller sent hResult', hResult);
            cb(hResult);
        };

        //Add a timeout for the execution
        timerObject = setTimeout(function(){
            //Set it to null to test if cb is executed after timeout
            timerObject = null;

            hResult = self.createHResult(hCommand, status.EXEC_TIMEOUT);

            log.info('hCommand Controller sent hResult', hResult);
            cb(hResult);

        }, commandTimeout);

        //Run it!
        try {
            module.exec(hCommand, this.context, onResult);
        } catch(err) {
            hResult = self.createHResult(hCommand, status.TECH_ERROR);
        }

    }else{
        //Module not found
        hResult = self.createHResult(hCommand, status.NOT_AVAILABLE);

        //Save to Mongo
        if(hCommand.transient === false)
            saveCommand();

        log.info('hCommand Controller sent hResult', hResult);
        cb(hResult);
    }
};

exports.Controller = Controller;