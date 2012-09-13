/** Edit to specifie parameters **/

var hnodeJid = 'hnode@localhost'
var hnodePass = 'hnode';

var user1Jid = 'u1@localhost';
var user1Pass = 'u1';

var user2Jid = 'u2@localhost';
var user2Pass = 'u2';

var mongoURI = 'mongodb://localhost/test';

var commandsPath = 'lib/hcommands'
var commandsTimeout = 5000;

/** Don't edit below **/

/** available vars **/
//Available external classes
exports.validators = undefined;
exports.codes = undefined;
exports.db = undefined;
exports.cmdController = undefined;
exports.hClient = undefined;
exports.hAdminConst = undefined;

//Available vars
exports.users = undefined;
exports.hnode = undefined;
exports.cmdParams = undefined;
exports.xmppParams = undefined;
exports.mongoURI = undefined;

//Available functions
exports.makeChanName = undefined;
exports.makeHMessage = undefined;
exports.makeHCommand = undefined;
exports.makeHResult = undefined;
exports.checkResultMsg = undefined;
exports.checkOkResultMsg = undefined;
exports.createChannel = undefined;
exports.subscribeToChannel = undefined;
exports.unsubscribeFromChannel = undefined;
exports.publishMsg = undefined;
exports.beforeFN = undefined;
exports.afterFN = undefined;




/*
 DO NOT TOUCH BELOW THIS LINE
 */


var should = require('should');
var codes = require('../lib/codes.js');

var validators = require('../lib/validators.js');
var hClientConst = require('../lib/hClient.js').hClient;
var cmdController = require('../lib/hcommand_controller.js').Controller;
var hAdminConst = require('../lib/hAdmin.js');
var winston = require('winston');

var db = require('../lib/mongo.js').db;



exports.validators = validators;
exports.codes = codes;
exports.db = db;
exports.cmdController = cmdController;
exports.hClient = hClientConst;


exports.users = {
    simpleUser: {jid: user1Jid, password: user1Pass},
    resourceUser: {jid: user1Jid + '/resource', password: user1Pass}
};

exports.hnode = {
    jid: hnodeJid,
    password: hnodePass,
    hDomain: validators.getDomainJID(hnodeJid)
};

exports.cmdParams = {
    modulePath: commandsPath,
    timeout: commandsTimeout
};

exports.xmppParams = {
    jid: hnodeJid,
    password: hnodePass
};

exports.mongoURI = mongoURI;


exports.hAdminConst = hAdminConst.getHAdmin(exports.cmdParams);

exports.makeChanName = function(){ return '#' + exports.db.createPk() + '@' + exports.hnode.hDomain; };

exports.makeHMessage = function(actor, publisher, type, payload) {
    var hMessage = {
        msgid : exports.db.createPk(),
        convid : this.msgid,
        actor : actor,
        type : type,
        priority : 0,
        publisher : publisher,
        published : new Date(),
        payload : payload
    }

    return hMessage;
};

exports.makeHCommand = function(actor, publisher, cmd, params) {
    var hCommand = exports.makeHMessage(actor, publisher, 'hCommand', {cmd: cmd, params: params});
    return hCommand;
}

exports.makeHResult = function(actor, publisher, ref, status, result) {
    var hResult = exports.makeHMessage(actor, publisher, 'hResult', {status: status, result: result});
    hResult.ref = ref;
    return hResult;
}

exports.checkResultMsg = function(resultMsg, msg) {
    resultMsg.should.have.property('ref', msg.ref);
    resultMsg.should.have.property('type', 'hResult');
}

exports.checkOkResultMsg = function(resultMsg, msg) {
    exports.checkResultMsg(resultMsg, msg);
    resultMsg.should.have.property('payload');
    resultMsg.payload.should.have.property('status', exports.codes.hResultStatus.OK);
}

exports.createChannel = function(actor, subscribers, owner, active, done) {
    var hCommandController = new exports.cmdController(exports.cmdParams);

    var params = {
        actor : actor,
        active : active,
        owner : owner,
        subscribers : subscribers
    }
    var command = exports.makeHCommand(exports.hnode.jid, owner, 'hCreateUpdateChannel', params);

    hCommandController.execCommand(command, function(hMessage) {
        exports.checkOkResultMsg(hMessage, command);
        done();
    });
};

exports.subscribeToChannel = function(publisher, actor, done) {
    var hCommandController = new exports.cmdController(exports.cmdParams);

    var command = exports.makeHCommand(exports.hnode.jid, publisher, 'hSubscribe', {actor: actor});

    hCommandController.execCommand(command, function(hMessage){
        exports.checkOkResultMsg(hMessage, command);
        done();
    });
};

exports.unsubscribeFromChannel = function(publisher, actor, done) {
    var hCommandController = new exports.cmdController(exports.cmdParams);

    var command = exports.makeHCommand(exports.hnode.jid, publisher, 'hUnsubscribe', {actor: actor});

    hCommandController.execCommand(command, function(resultMsg){
        exports.checkOkResultMsg(resultMsg, command);
        done();
    });
};

exports.publishMsg = function(userJid, msg, cb) {
    var hClient = new exports.hClient(exports.cmdParams);
    hClient.jid = userJid;

    hClient.processMsgInternal(msg, function(resultMsg){
        exports.checkOkResultMsg(resultMsg, msg);
        cb(resultMsg);
    });
};

exports.beforeFN = function(done){
    exports.db.once('connect', function(){
        exports.hAdminConst.once('connect', done);
        exports.hAdminConst.connect(exports.xmppParams);
    });
    exports.db.connect(exports.mongoURI);
};

exports.afterFN = function(done){
    exports.db.once('disconnect', function(){
        exports.hAdminConst.once('disconnect', done);
        exports.hAdminConst.disconnect();
    });
    exports.db.disconnect();
};









var validJID = 'u1@localhost';

//Array of logins (with params if you want) to connect to XMPP
exports.logins = [
    {
        jid: user1Jid,
        password: user1Pass
    },
    {
        jid: user1Jid + '/testRessource',
        password: user1Pass
    }
];



var cmdControllerParams = {
    modulePath : commandsPath,
    timeout : commandsTimeout
};

var xmppConnectionParams = {
    jid: hnodeJid,
    password: hnodePass
};


exports.validJID = validJID;

exports.validDomain = exports.validators.getDomainJID(validJID);

exports.getNewCHID = function(){ return '#' + exports.db.createPk() + '@' + exports.validDomain; };

var xmppConnection = exports.hAdminConst;
exports.xmppConnection = xmppConnection;

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

exports.publishMessageWithResult = function(publisher, actor, type, payload, published, persistent, opts, done){
    if(typeof opts === 'function'){ done = opts; opts = {}; }

    var msg = exports.makeHMessage(actor, publisher, type, payload);
    msg.published = published;
    msg.persistent = persistent;

    for(var attr in opts)
        if(opts.hasOwnProperty(attr))
            msg[attr] = opts[attr];

    exports.publishMsg(user1Jid ,msg, done);
};

exports.publishMessage = function(publisher, actor, type, payload, published, persistent, opts, done){
    if(typeof opts === 'function'){ done = opts; opts = {}; }
    exports.publishMessageWithResult(publisher, actor, type, payload, published, persistent, opts, function(hMessage) {
        done();
    });
};

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { silent: true });
