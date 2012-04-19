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
 *
 * @listened - hCommand: Receives an hCommand and starts the process of searching
 * for the module and execute it.
 * args: {from: <jid>, hCommand: <hCommand> }
 *
 * @emit - hResult: When an hCommand finishes execution
 * args: {to: <jid>, hResult: <hResult>, hCommand: <hCommand>}
 */

var status = require('./codes.js').hResultStatus;

var path = require('path');

//Events
var util = require('util');
var events = require('events').EventEmitter;

/**
 * Starts an hCommandController
 * @param params - {
 *     modulePath : <String> (Path to the modules directory)
 *     timeout : <int> (time to wait before sending a timeout hResult)
 * }
 */
var Controller = function(params){
    events.call(this);
    this.params = params;
    this.timers = {};
    this.addListeners();
};

util.inherits(Controller, events);

/**
 * Tries to load a module, returns undefined if couldn't find.
 * @param module - name of the module to load
 */
Controller.prototype.loadModule = function(module){
    var modInstance;

    //Try to load Module
    var modName = path.resolve(path.join(this.params.modulePath, module));
    if(path.existsSync(modName)){
        modInstance = require(modName).Command;
    }
    //Return module
    return modInstance;
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
        chid : hCommand.chid,
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
    this.on('hCommand', function(obj){
            var hCommand = obj.hCommand;
            log.info('hCommand Controller received hCommand:', hCommand);

            //Verify credentials (If internal use, there is not a obj.from)
            var expectedSender = new RegExp('\^' + hCommand.sender + '(\/.+)?\$');
            if( !obj.from || (hCommand.sender &&
                hCommand.sender.split('/').length < 2 &&
                obj.from.match(expectedSender))){
                var module = self.loadModule(hCommand.cmd + '.js');
                if(module){
                    module.once('result', function(res){
                        clearTimeout(self.timers[res.hCommand.reqid]);
                        delete self.timers[res.hCommand.reqid];
                        var hResult = self.createHResult(res.hCommand, res.status, res.result);
                        log.info('hCommand Controller sent hResult:', hResult);
                        self.emit('hResult', {to: obj.from, hCommand: res.hCommand, hResult : hResult});
                    });

                    self.timers[hCommand.reqid] = setTimeout(function(){
                        var hResult = self.createHResult(hCommand, status.EXEC_TIMEOUT);
                        log.info('hCommand Controller sent hResult:', hResult);
                        self.emit('hResult', {to: obj.from, hCommand: hCommand, hResult : hResult});
                        delete self.timers[hCommand.reqid];
                    }, self.params.timeout);

                    //Run it!
                    module.exec(hCommand);
                }else{
                    //Module not found
                    var hResult = self.createHResult(hCommand, status.NOT_AVAILABLE);
                    log.info('hCommand Controller sent hResult:', hResult);
                    self.emit('hResult', {to: obj.from, hCommand: hCommand, hResult : hResult});
                }
            } else{
                //Invalid Credentials
                var hResult = self.createHResult(hCommand, status.INVALID_ATTR, hCommand.sender +
                    " does not match " + obj.from);
                log.info('Client tried to execute hCommand with invalid credentials.', hResult);
                self.emit('hResult', {to: obj.from, hCommand: hCommand, hResult : hResult})
            }


        }
    );
};

exports.Controller = Controller;