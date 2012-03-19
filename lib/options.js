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

function parseOptions(args) {
    var _opts = {};

    //Normalize and fill _opts
    var tempArray;
    for( var i = 0; i < args.length -1; i +=2){
        args[i] = args[i].replace(/-*/,'').toLowerCase();
        var tempArray = args[i+1].toLowerCase().split(',');
        _opts[args[i]] = tempArray.length > 1 ? tempArray: tempArray[0];
    }

    //If the option expects an array of numbers, convert it to one
    var numArray = ['socket.io.ports', 'bosh.ports'];
    numArray.map(function(elem){
        if( _opts[elem] instanceof Array)
            _opts[elem] = _opts[elem].map(function(el){ return parseInt(el);} );
        else if (_opts[elem])
            _opts[elem] = [parseInt(_opts[elem])];
    });

    var options = {
        //Possible values are DEBUG, INFO, WARN or ERROR
        'global.loglevel': _opts['global.loglevel'] || 'WARN',

        //A different instance will be created for each port
        'socket.io.ports':_opts['socket.io.ports'] || [8080],

        //websocket Namespace for events received/sent
        'socket.io.namespace': _opts['socket.io.namespace'] || '',

        //Once the socket is closed, how long should we wait to close
        //XMPP Connection
        'socket.io.disctimeout': _opts['socket.io.disctimeout'] || 15000,

        // rid +- window to accept when attaching
        'socket.io.ridwindow': _opts['socket.io.ridwindow'] || 5,

        //Ports used by the bosh endpoint to relay requests
        //A different instance will be created for each port
        'bosh.ports': _opts['bosh.ports'] || [5280],

        //Workaround to a pidgin bug when using bosh. See node-xmpp-bosh doc
        'bosh.pidgin_compatible': _opts['pidgin_compatible'] || true
    };

    return options;
}

exports.parse_options = parseOptions;