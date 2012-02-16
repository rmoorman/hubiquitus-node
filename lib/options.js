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

function socketio_Options(opts) {
    var _opts = opts;

    var options = {
        //Possible values are DEBUG, INFO, WARN or ERROR
        'global.loglevel': _opts['global.loglevel'] || 'WARN',

        //websocket port used between the client and the gateway
        'socket.io.port':_opts['socket.io.port'] || 8080,

        //websocket Namespace for events received/sent
        'socket.io.namespace': _opts['socket.io.namespace'] || '',

        //Port used by the bosh endpoint to relay requests
        'bosh.port': _opts['bosh.port'] || 5280,

        //Workaround to a pidgin bug using bosh. See node-xmpp-bosh doc
        'bosh.pidgin_compatible': _opts['pidgin_compatible'] || true
    };

    return options;
}

exports.socketio_Options = socketio_Options;