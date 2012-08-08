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

var status = require('../codes.js').hResultStatus;
var validator = require('../validators.js');

var hListFilters = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hListFilters' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hListFilters'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: an Array of hFilterTemplate
 */
hListFilters.prototype.exec = function(hMessage, context, cb){
    var result = [],
        filters = context.hClient.filters,
        ordered = context.hClient.filtersOrder,
        actor, i;

    var hCommand = hMessage.payload;
    if(hCommand.params && hCommand.params.actor){
        actor = hCommand.params.actor;

        //For legacy purposes, if chid does not contain # or @domain, include them
        actor = validator.normalizeChannel(actor, validator.getDomainJID(hMessage.publisher));

        if(context.hClient.filters[actor]){
            for(i = 0; i < ordered[actor].length; i++)
                result.push(filters[actor][ordered[actor][i]]);
        }

    }else{
        for(actor in filters)
            if(filters.hasOwnProperty(actor))
                for(i = 0; i < ordered[actor].length; i++)
                    result.push(filters[actor][ordered[actor][i]]);
    }


    cb(status.OK, result);
};

exports.Command = hListFilters;