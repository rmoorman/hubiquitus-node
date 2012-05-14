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
 *     mongo.URI : <String> (Path to MongoDB database)
 *     jid: <string>,
 *     password: <string>,
 *     host: <string>,
 *     port: <int>
 * }
 */
var Controller = function(params){
    events.call(this);
    this.params = params;

    //Connect to the database and load modules
    var database = require('./mongo.js').db;
    this.db = new database();
    this.db.on('error', function(err){
        log.error('Error in Database', err);
        process.exit(1);
    });
    this.context = this.db.connect(params['mongo.URI']);

    this.context.jid = params.jid;

    //Connect to the XMPP Component
    this.component = new cmp(params);
    this.component.on('error', function(err){
        log.error('Error in hNodeComponent', err);
        process.exit(1);
    });
    this.component.connect();

    this.addListeners();
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
        if(fileNames[i].match(regex))
            return require(path.resolve(path.join(modulePath, fileNames[i]))).Command;

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

    //For commands received directly, we launch the command and emit it to ourselves
    //The object received is in the form {hCommand : hCommand, args : <optional arguments {}>}
    this.on('hCommand', function(obj){
        //Protect ourselves
        if(!obj || !obj.hCommand) return;

        var hCommand = obj.hCommand;

        self.launchCommand(hCommand, self, obj.args);
    });
};

/**
 * Loads the hCommmand module, sets the listener and emits to the correct module the hResult.
 * @param hCommand - The received hCommand
 * @param resultListener - Module that listens to messages in the form
 * ('hResult', {args:{}, hCommand: hCommand, hResult: hResult})
 * @param arguments - Optional paramater to send when emitting the hResult.
 */
Controller.prototype.launchCommand = function(hCommand, resultListener, arguments){
    var self = this;
    var args = arguments;
    var timer;

    var module = self.loadModule(hCommand.cmd + '.js');
    if(module){
        //Cleans up listeners so that they can be gced.
        var cleanUp = function(){
            module.removeAllListeners('send');
            module.removeAllListeners('result');
            self.removeListener('stanza', stanzaCallback);
        };

        //Receive stanzas from server and send them to the command
        var stanzaCallback = function(stanza){
            module.emit('stanza', stanza);
        };
        self.component.on('stanza', stanzaCallback);

        //Send XMPP Stanzas
        module.on('send', function(msg){
            self.component.send(msg);
        });

        //Listen for the result
        module.once('result', function(res){
            clearTimeout(timer);

            var hResult = self.createHResult(res.hCommand, res.status, res.result);

            log.info('hCommand Controller sent hResult:', hResult);
            resultListener.emit('hResult', {args : args, hCommand: res.hCommand, hResult : hResult});
            cleanUp();
        });

        //Add a timeout for the execution
        timer = setTimeout(function(){
            var hResult = self.createHResult(hCommand, status.EXEC_TIMEOUT);

            log.info('hCommand Controller sent hResult:', hResult);
            resultListener.emit('hResult', {args : args, hCommand: hCommand, hResult : hResult});

            cleanUp();
        }, self.params.timeout);


        //Run it!
        module.exec(hCommand, this.context);

    }else{
        //Module not found
        var hResult = self.createHResult(hCommand, status.NOT_AVAILABLE);

        log.info('hCommand Controller sent hResult:', hResult);
        resultListener.emit('hResult', {args : args, hCommand: hCommand, hResult : hResult});
    }
};

exports.Controller = Controller;