var socketdash = require('./socketdash')();

socketdash.io.on('connection', function(socket) {
    socket.on('message:send', function(data) {
        console.log('Received message...');
        socket.emit('message:received', true);
    });

    /*var msg = setInterval(function() {
        socket.emit('server' + Math.random(), {
            stuff: 'things',
            more: 'stuff'
        });
    }, 5000);*/

    socket.on('disconnect', function() {
        //console.log(socket.clientId + ' disconnected');
        //clearInterval(msg);
    });

    //socket.broadcast.to(socket.id).emit('coolFunction');
});
