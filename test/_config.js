/*
 CONFIGURE ALL PARAMETERS FOR CONNECTION AND DATABASE HERE
 */

var validJID = 'u1@localhost';

var mongoURI = 'mongodb://localhost/test';

var xmppConnectionParams = {
    jid: 'hnode.localhost',
    password: 'password',
    host: 'localhost',
    port: 5276
};

var cmdControllerParams = {
    modulePath : 'lib/hcommands',
    timeout : 5000,
    jid : validJID,
    checkSender: false
};


/*
 DO NOT TOUCH BELOW THIS LINE
 */

exports.validJID = validJID;

exports.cmdParams = cmdControllerParams;

exports.cmdController = require('../lib/hcommand_controller.js').Controller;

exports.db = require('../lib/mongo.js').db;

exports.mongoURI = mongoURI;

var xmppConnection = require('../lib/server_connectors/xmpp_component.js').componentConnection;
exports.xmppConnection = xmppConnection;

exports.xmppParams = xmppConnectionParams

exports.beforeFN = function(done){
    var db = require('../lib/mongo.js').db;
    db.once('connect', function(){
        xmppConnection.once('connect', done);
        xmppConnection.connect(xmppConnectionParams);
    });
    db.connect(mongoURI);
};

exports.afterFN = function(done){
    var db = require('../lib/mongo.js').db;
    db.once('disconnect', function(){
        xmppConnection.once('disconnect', done);
        xmppConnection.disconnect();
    });
    db.disconnect();
};

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { silent: true });
