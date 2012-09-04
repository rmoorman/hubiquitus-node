/*
 CONFIGURE ALL PARAMETERS FOR CONNECTION AND DATABASE HERE
 */
var should = require('should');
var status = require('../lib/codes.js').hResultStatus;

var validJID = 'u1@localhost';

var hClientConst = require('../lib/hClient.js').hClient;

//Array of logins (with params if you want) to connect to XMPP
exports.logins = [
    {
        jid: 'u1@localhost',
        password: 'u1'
    },
    {
        jid: 'u1@localhost/testRessource',
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

exports.genericCmdMsg = {
    msgid : 'hCommandTest123',
    convid : 'hCommandTest123',
    actor : 'session',
    type : 'hCommand',
    priority : 0,
    publisher : exports.validJID,
    published : new Date(),
    payload : {
        cmd : 'INCOMPLETE CMD',
        params : {}
    }
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

exports.createChannel = function(actor, participants, owner, active, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        msgid : 'hCommandTest123',
        convid : 'hCommandTest123',
        actor : 'session',
        type : 'hCommand',
        priority : 0,
        publisher : exports.validJID,
        published : new Date(),
        payload : {
            cmd : 'hCreateUpdateChannel',
            params : {
                actor : actor,
                active : active,
                owner : owner,
                participants : participants
            }
        }
    }, function(hMessage){
        hMessage.payload.should.have.property('status', status.OK);
        done();
    });
};

exports.subscribeToChannel = function(publisher, actor, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        msgid : 'hCommandTest123',
        convid : 'hCommandTest123',
        actor : 'session',
        type : 'hCommand',
        priority : 0,
        publisher : publisher,
        published : new Date(),
        payload : {
            cmd : 'hSubscribe',
            params : {
                actor : actor
            }
        }
    }, function(hMessage){
        hMessage.payload.should.have.property('status', status.OK);
        done();
    });
};

exports.unsubscribeFromChannel = function(publisher, actor, done){
    var hCommandController = new cmdController(cmdControllerParams);
    hCommandController.execCommand({
        msgid : 'hCommandTest123',
        convid : 'hCommandTest123',
        actor : 'session',
        type : 'hCommand',
        priority : 0,
        publisher : publisher,
        published : new Date(),
        payload : {
            cmd : 'hUnsubscribe',
            params : {
                actor : actor
            }
        }
    }, function(hMessage){
        hMessage.payload.should.have.property('status', status.OK);
        done();
    });
};

exports.publishMessageWithResult = function(publisher, actor, type, payload, published, transient, opts, done){
    if(typeof opts === 'function'){ done = opts; opts = {}; }

    var params = {
        msgid : exports.db.createPk(),
        actor: actor,
        publisher: publisher,
        published: published,
        payload: payload,
        type: type,
        transient: transient
    };

    for(var attr in opts)
        if(opts.hasOwnProperty(attr))
            params[attr] = opts[attr];

    var hClient = new hClientConst(cmdControllerParams);
    hClient.jid = "u1@localhost";

    hClient.processMsgInternal(params, function(hMessage){
        hMessage.should.have.property('type', 'hResult');
        hMessage.payload.should.have.property('status', status.OK);
        done(hMessage);
    });

};

exports.publishMessage = function(publisher, actor, type, payload, published, transient, opts, done){
    if(typeof opts === 'function'){ done = opts; opts = {}; }
    exports.publishMessageWithResult(publisher, actor, type, payload, published, transient, opts, function(hMessage) {
        done();
    });
};


var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { silent: true });
