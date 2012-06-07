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

var log = require('winston');

var Parser = function(){
};

/**
 * Parses a stanza that has publications from the XMPP Server
 * and returns an object {node: <String>, entries: <message>[]}
 * @param stanza - Message from the server
 */
Parser.prototype.parseMessageStanza = function(stanza) {

    var item;

    if (stanza.is('message') &&
        stanza.attrs.type !== 'error' &&
        stanza.getChild('event')){

        item = stanza.getChild('event').getChild('items').getChild('item');

        if(item){
            var hMessage =  item.getChild('entry').getText();
            try{
                hMessage = JSON.parse(hMessage);
            }catch(err){ hMessage = null; }
        }

        return hMessage;
    }
};

/**
 * Parses an XMPP hResult stanza sent by the server
 * @param stanza
 */
Parser.prototype.parseHResult = function(stanza) {
    if (stanza.is('message') &&
        stanza.attrs.type !== 'error'){
        var body = stanza.getChild('hbody');

        if(body && body.attrs.type === 'hresult'){
            try{
                var hResult = JSON.parse(body.getText());
                return hResult;
            }catch(err){
                log.error('Server sent stanza with type hResult but with invalid content');
            }
        }
    }
};

var parser = new Parser();

exports.parser = parser;