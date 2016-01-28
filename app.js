var socketdash = require('./socketdash')();

socketdash.io.on('connection', function(socket) {
    // sent from the dashboard client. Should NOT be logged
    socket.on('dashboardClientSend', function() {
        console.log('sent from dashboard client');
    });
    socket.on('dashboardClientSend2', function() {
        console.log('sent from dashboard client');
    });
    socket.on('kabla', function() {
        socket.emit('kabla:return', {
            send: 'backabla'
        });
    });

    var msg = setInterval(function() {
        socket.emit('server' + Math.random(), {
            stuff: 'things',
            more: 'stuff'
        });
    }, 5000);

    socket.on('disconnect', function() {
        console.log(socket.clientId + ' disconnected');
        clearInterval(msg);
    });

    socket.broadcast.to(socket.id).emit('coolFunction');
});
