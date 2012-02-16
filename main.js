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

var socketioConnector = require('./lib/socketio_connector.js');
var boshConnector    = require('node-xmpp-bosh');
var createOptions = require('./lib/options.js').socketio_Options;

/**
 * Starts the gateway instatiating its modules
 * @param options - see options.js to see possibilities
 */
function main(options){
    options = options || {};
    options= createOptions(options);



    socketioConnector.startSocketIOConnector(options);

    var boshServer = boshConnector.start_bosh({
        logging: options['global.loglevel'],
        port: options['bosh.port'],
        pidgin_compatible: options['bosh.pidgin_compatible']
    });
}

main();