exports.errors = {
    NO_ERROR: 0,
    ALREADY_SUBSCRIBED: 1,
    GET_SUBS_FAILED: 2,
    FAILED_ATTACH: 3,
    CONNECTION_FAILED: 4,
    CONNECTION_TIMEOUT: 5
};

exports.statuses = {
    Connecting: 'connecting',
    Connected: 'connected',
    Attaching: 'attaching',
    Attached: 'attached',
    Disconnecting: 'disconnecting',
    Disconnected: 'disconnected',
    Error: 'error'
};