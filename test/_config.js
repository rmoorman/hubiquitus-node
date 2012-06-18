/*
 CONFIGURE ALL PARAMETERS FOR CONNECTION AND DATABASE HERE
 */

var validJID = 'u1@localhost';

var mongoURI = 'mongodb://localhost/test';

var cmdControllerParams = {
    modulePath : 'lib/hcommands',
    timeout : 5000
};

var xmppConnectionParams = {
    jid: 'hnode@localhost',
    password: 'hnode',
    commandOptions: cmdControllerParams
};


/*
 DO NOT TOUCH BELOW THIS LINE
 */

exports.validJID = validJID;

exports.cmdParams = cmdControllerParams;

var cmdController = require('../lib/hcommand_controller.js').Controller;
exports.cmdController = cmdController;

exports.db = require('../lib/mongo.js').db;

exports.mongoURI = mongoURI;

var xmppConnection = require('../lib/server_connectors/xmpp_hnode.js').ServerConnection;
exports.xmppConnection = xmppConnection;

exports.xmppParams = xmppConnectionParams;

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

exports.createChannel = function(chid, participants, owner, active, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        reqid  : 'hCommandTest123',
        sender : owner,
        sid : 'fake sid',
        sent : new Date(),
        cmd : 'hCreateUpdateChannel',
        params : {
            chid : chid,
            active : active,
            host : '' + new Date(),
            owner : owner,
            participants : participants
        }
    }, null, function(hResult){done();});
};

exports.subscribeToChannel = function(sender, chid, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        reqid  : 'hCommandTest123',
        sender : sender,
        sid : 'fake sid',
        sent : new Date(),
        cmd : 'hSubscribe',
        params : {chid: chid}
    }, null, function(hResult){
        done();
    });
};

exports.unsubscribeFromChannel = function(sender, chid, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        reqid  : 'hCommandTest123',
        sender : sender,
        sid : 'fake sid',
        sent : new Date(),
        cmd : 'hUnsubscribe',
        params : {chid: chid}
    }, null, function(hResult){
        done();
    });
};

exports.publishMessage = function(sender, chid, type, payload, transient, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        reqid  : 'hCommandTest123',
        sender : sender,
        sid : 'fake sid',
        sent : new Date(),
        cmd : 'hPublish',
        params : {
            chid: chid,
            publisher: sender,
            payload: payload,
            type: type,
            transient: transient
        }
    }, null, function(hResult){
        done();
    });
}

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { silent: true });
