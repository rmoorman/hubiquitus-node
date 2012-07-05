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
 * @param hCommand - hCommand received with cmd = 'hListFilters'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: an Array of hFilterTemplate
 */
hListFilters.prototype.exec = function(hCommand, context, cb){
    var result = [],
        filters = context.hClient.filters,
        ordered = context.hClient.filtersOrder,
        chid, i;

    if(hCommand.params && hCommand.params.chid){
        chid = hCommand.params.chid;

        //For legacy purposes, if chid does not contain # or @domain, include them
        chid = validator.normalizeChannel(chid, validator.getDomainJID(hCommand.sender));

        if(context.hClient.filters[chid]){
            for(i = 0; i < ordered[chid].length; i++)
                result.push(filters[chid][ordered[chid][i]]);
        }

    }else{
        for(chid in filters)
            if(filters.hasOwnProperty(chid))
                for(i = 0; i < ordered[chid].length; i++)
                    result.push(filters[chid][ordered[chid][i]]);
    }


    cb(status.OK, result);
};

exports.Command = hListFilters;