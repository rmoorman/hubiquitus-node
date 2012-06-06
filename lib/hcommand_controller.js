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
 * sets a timeout for it in case it hangs up and emits
 * an event when the hCommand finishes (even if there was an error).
 *
 * The hCommands that can be processed should be in the folder specified
 * by the param modulePath in the constructor.
 */

var status = require('./codes.js').hResultStatus;
var cmp = require('./server_connectors/xmpp_component.js').Component;
var xmpp = require('node-xmpp');
var db = require('./mongo.js');

var iqListeners = {};

var fs = require('fs');
var path = require('path');

//Events
var util = require('util');
var events = require('events').EventEmitter;

/**
 * Starts an hCommandController
 * @param params - {
 *     modulePath : <String> (Path to the modules directory)
 *     timeout : <int> (time to wait before sending a timeout hResult)
 *     jid: <string>,
 *     password: <string>,
 *     host: <string>,
 *     port: <int>
 * }
 */
var Controller = function(params){
    events.call(this);
    var self = this;
    this.params = params;

    this.context = {
        jid: params.jid,

        sendIQ: function(attrs, content, cb){
            if( typeof attrs === 'undefined' || attrs == null)
                return;

            var msgId = UUID();

            var msg = new xmpp.Element('iq', {
                type: attrs.type,
                from: params.jid,
                to:  attrs.to,
                id: msgId
            });

            msg.cnode(content.tree());
            iqListeners[msgId] = cb;

            self.component.send(msg);
        }
    };

    //Connect to the XMPP Component
    this.component = new cmp(params);
    this.component.on('error', function(err){
        log.error('Error in hNodeComponent', err);
        process.exit(1);
    });
    this.component.connect();

    //Add Listeners
    self.addListeners();
};

util.inherits(Controller, events);

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
    var hResult = {
        cmd : hCommand.cmd,
        reqid : hCommand.reqid,
        status : status,
        result : resObject
    };
    log.debug('hCommand Controller created hResult:', hResult);
    return hResult;
};

Controller.prototype.addListeners = function(){
    var self = this;
    //search for the cmd, execute it and wait for result
    this.component.on('hCommand', function(obj){
            //Protect ourselves
            if(!obj || !obj.hCommand) return;

            var hCommand = obj.hCommand;
            log.info('hCommand Controller received hCommand:', hCommand);

            //Verify credentials
            var expectedSender = new RegExp('\^' + hCommand.sender + '(\/.+)?\$');

            if( obj.from && hCommand.sender &&
                hCommand.sender.split('/').length < 2 &&
                obj.from.match(expectedSender)){

                //If validated, can execute
                self.launchCommand(hCommand, self.component, {to: obj.from});

            } else{
                //Invalid Credentials
                var hResult = self.createHResult(hCommand, status.INVALID_ATTR, "the hcommand sender " +
                    hCommand.sender + " does not match the xmpp from attribute " + obj.from);

                log.info('Client tried to execute hCommand with invalid credentials.', hResult);
                self.component.emit('hResult', {args: {to : obj.from}, hCommand: hCommand, hResult : hResult})
            }


        }
    );

    //Listen for matches to iqs and call the running command
    this.component.on('stanza', function(stanza){
        if(stanza.is('iq') && stanza.attrs.id !== 'undefined' &&
            iqListeners[stanza.attrs.id]){

            var cb = iqListeners[stanza.attrs.id];
            delete iqListeners[stanza.attrs.id];
            cb(stanza);
        }
    });

    //For commands received directly, we launch the command and emit it to ourselves
    //The object received is in the form {hCommand : hCommand, args : <optional arguments {}>}
    this.on('hCommand', function(obj){
        //Protect ourselves
        if(!obj || !obj.hCommand) return;

        var hCommand = obj.hCommand;

        var resultListener = obj.args && obj.args.resultListener ? obj.args.resultListener : self;

        self.launchCommand(hCommand, resultListener, obj.args);
    });
};

/**
 * Loads the hCommmand module, sets the listener and emits to the correct module the hResult.
 * @param hCommand - The received hCommand
 * @param resultListener - Module that listens to messages in the form
 * ('hResult', {args:{}, hCommand: hCommand, hResult: hResult})
 * @param arguments - Optional parameter to send when emitting the hResult.
 */
Controller.prototype.launchCommand = function(hCommand, resultListener, arguments){
    var self = this;
    var args = arguments;
    var mongoReqID = null; // ReqID if needed to save in mongo
    var timerObject = null; //setTimeout timer variable
    var commandTimeout = null; //Time in ms to wait to launch timeout

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

    var module = self.loadModule(hCommand.cmd + '.js');
    if(module){

        commandTimeout = module.timeout || self.params.timeout;

        var onResult = function(status, result){
            //If callback is called after the timer ignore it
            if(timerObject == null) return;

            clearTimeout(timerObject);

            var hResult = self.createHResult(hCommand, status, result);

            //Save to Mongo
            if(hCommand.transient === false)
                saveHResult(hResult, mongoReqID);

            log.info('hCommand Controller sent hResult:', hResult);
            resultListener.emit('hResult', {args : args, hCommand: hCommand, hResult : hResult});
        };

        //Add a timeout for the execution
        timerObject = setTimeout(function(){
            //Set it to null to test if cb is executed after timeout
            timerObject = null;

            var hResult = self.createHResult(hCommand, status.EXEC_TIMEOUT);

            log.info('hCommand Controller sent hResult:', hResult);
            resultListener.emit('hResult', {args : args, hCommand: hCommand, hResult : hResult});

        }, commandTimeout);

        //Run it!
        module.exec(hCommand, this.context, onResult);

    }else{
        //Module not found
        var hResult = self.createHResult(hCommand, status.NOT_AVAILABLE);

        //Save to Mongo
        if(hCommand.transient === false)
            saveHResult(hResult, mongoReqID);

        log.info('hCommand Controller sent hResult:', hResult);
        resultListener.emit('hResult', {args : args, hCommand: hCommand, hResult : hResult});
    }
};

//Taken from https://gist.github.com/982883
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

exports.Controller = Controller;