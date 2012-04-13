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
 * This simple worker implementation will wait for a message from its parent
 * with the module that should execute and its args. The module must have
 * a exports.run = function(args).
 * Expected message:
 * {
 * module : string
 * args : string[]
 * }
 */
process.on('message', function(msg) {
    if(msg && msg.module){
        var module = require(msg.module);
        if(typeof module.run === 'function'){
            //For logging
            var path = require('path');
            var filename = "[" + path.basename(path.normalize(msg.module)) + "]";
            global.log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

            module.run(msg.args);
        }
    }
});