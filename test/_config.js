/*
 CONFIGURE ALL PARAMETERS FOR CONNECTION AND DATABASE HERE
 */
var should = require('should');
var status = require('../lib/codes.js').hResultStatus;

var validJID = 'u1@localhost';

//Array of logins (with params if you want) to connect to XMPP
exports.logins = [
    {
        jid: 'u1@localhost',
        password: 'u1'
    }
];

var mongoURI = 'mongodb://localhost/test';

var cmdControllerParams = {
    modulePath : 'lib/hcommands',
    timeout : 5000
};

var xmppConnectionParams = {
    jid: 'hnode@localhost',
    password: 'hnode'
};


/*
 DO NOT TOUCH BELOW THIS LINE
 */

exports.validators = require('../lib/validators.js');

exports.validJID = validJID;

exports.validDomain = exports.validators.getDomainJID(validJID);

exports.getNewCHID = function(){ return '#' + exports.db.createPk() + '@' + exports.validDomain; };

exports.cmdParams = cmdControllerParams;

var cmdController = require('../lib/hcommand_controller.js').Controller;
exports.cmdController = cmdController;

exports.db = require('../lib/mongo.js').db;

exports.mongoURI = mongoURI;

var xmppConnection = require('../lib/hAdmin.js').getHAdmin(cmdControllerParams);
exports.xmppConnection = xmppConnection;

exports.xmppParams = xmppConnectionParams;

exports.genericCmd = {
    reqid  : 'hCommandTest123',
    sender : exports.validJID,
    sid : 'fake sid',
    sent : new Date(),
    cmd : 'INCOMPLETE CMD',
    params : {}
};

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
    }, null, function(hResult){
        hResult.should.have.property('status', status.OK);
        done();
    });
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
        hResult.should.have.property('status', status.OK);
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
        hResult.should.have.property('status', status.OK);
        done();
    });
};

exports.publishMessage = function(sender, chid, type, payload, published, transient, opts, done){
    if(typeof opts === 'function'){ done = opts; opts = {}; }

    var params = {
        chid: chid,
        publisher: sender,
        published: published,
        payload: payload,
        type: type,
        transient: transient
    };

    for(var attr in opts)
        if(opts.hasOwnProperty(attr))
            params[attr] = opts[attr];

    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        reqid  : 'hCommandTest123',
        sender : sender,
        sid : 'fake sid',
        sent : new Date(),
        cmd : 'hPublish',
        params : params
    }, null, function(hResult){
        hResult.should.have.property('status', status.OK);
        done();
    });

};

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { silent: true });
