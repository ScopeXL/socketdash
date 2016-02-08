var orig_io = io,
    eventId = 0;

io = function(url, opts) {
    var result = orig_io.apply(this, [url, opts]);
    var orig_emit = result.emit;
    result.emit = function(eventName, data, ignore) {
        var result2 = orig_emit.apply(this, [eventName, data]);
        // remove the infinite loop
        if (eventName === 'client:emit') {
            return;
        } else {
            if ((_.isUndefined(ignore)) || (_.isBoolean(ignore) && !ignore)) {
                // Do not relay socket.io's native ping/pong events
                if (_.isEqual(eventName, 'ping') || _.isEqual(eventName, 'pong')) {
                    return;
                }
                // only send events not emitted by the dashboard client
                result2.emit('client:emit', {
                    //eventName: eventName,
                    //data: data
                    socketId: '/#' + result2.id,
                    event: eventName,
                    data: data,
                    eventId: newEventId()
                });
                return result2;
            }
            return;
        }
    };

    var orig_on = result.on;
    result.on = function(eventName, callback, ignore) {
        var result2 = orig_on.apply(this, [eventName, callback]);
        if ((_.isUndefined(ignore)) || (_.isBoolean(ignore) && !ignore)) {
            result2.emit('client:on', {
                eventName: eventName,
                callback: callback
            });
        }
    };

    // set the clientId of the socket if the user specified it during connection
    if (!_.isUndefined(opts) && !_.isUndefined(opts.nickname)) {
        console.log(opts.nickname);
        result.emit('client:id:update', opts.nickname);
    }

    return result;

}

// add event ID
function newEventId() {
    eventId++;
    return 'c' + eventId;
}
