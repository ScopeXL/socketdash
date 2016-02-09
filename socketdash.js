var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    _ = require('underscore'),
    moment = require('moment'),
    promise = require('promise'),
    routes = require('./lib/routes.js')(app),
    db = require('./lib/db.js')();

// hold events in here to allocate to each socket once connected
var socketEvents = [];
// dashboard client ID
var dashboardClient = '';
// client connection index
var clientIndex = 0;
// event ID
var eventId = 0;
// when the application was started
var started_at = moment();
// ignore dashboard events
var ignoreDashboard = true;
// amount of server emit events
var numServerEmits = 0;
// amount of client emit events
var numClientEmits = 0;
// filter data by client
var filterClient = null;

module.exports = function() {
    io.on('connection', function(socket) {
        // override socket.on to include dashboard properties
        var orig_socket_on = socket.on;
        socket.on = function(eventName, callback, ignore) {
            // only send events not emitted by the dashboard client
            if ((_.isUndefined(ignore)) || (_.isBoolean(ignore) && !ignore)) {
                io.to(dashboardClient).emit('server:on:event', {
                    socketId: socket.id,
                    name: eventName
                });
            }
            var result = orig_socket_on.apply(this, [eventName, callback]);
            return result;
        };

        // override socket.emit to include dashboard properties
        var orig_socket_emit = socket.emit;
        socket.emit = function(eventName, data, ignore) {
            // only send events not emitted by the dashboard client
            if ((_.isUndefined(ignore)) || (_.isBoolean(ignore) && !ignore)) {
                // save to db
                db.addServerEmit(moment().unix(), socket.clientId, eventName, data);
                // send to dashboard
                io.to(dashboardClient).emit('server:emit:event', {
                    socketId: socket.id,
                    event: eventName,
                    data: data,
                    eventId: newEventId()
                });
                // increase the emit count for server emits
                //io.to(dashboardClient).emit('server:emit:count', increaseEmit('server'));
            }
            var result = orig_socket_emit.apply(this, [eventName, data]);
            return result;
        };

        // set the client ID in a more readable format
        socket.clientId = addClientNick();
        // send the dashboard client our new user
        getClientData();

        // set dashboard client to emit events to
        socket.on('client:dashboard:set', function() {
            dashboardClient = socket.id;
            var currentTimestamp = moment();
            // get emit chart data
            promise.all([
                db.getTotalServerEmits(),
                db.getTotalClientEmits(),
                db.getServerEmitsChartData(currentTimestamp),
                db.getClientEmitsChartData(currentTimestamp),
                db.getServerEmitsForClientChartData(),
                db.getClientEmitsForClientChartData()
            ]).then(function(res) {
                io.to(dashboardClient).emit('client:dashboard:init', {
                    clientId: socket.clientId,
                    uptime: started_at,
                    serverChartData: res[2],
                    clientChartData: res[3],
                    clientServerEmits: res[4],
                    clientClientEmits: res[5],
                    totalServerEmits: res[0],
                    totalClientEmits: res[1]
                });
            });

            console.log('set dashboard client');
            getRoomData();
            getClientData();
        }, ignoreDashboard);

        // get the client chart data
        socket.on('client:chart:get', function() {
            getClientChart();
        }, ignoreDashboard);

        // only return data based on a particular client
        socket.on('client:data:filter', function(client) {
            if (_.isUndefined(client) || _.isNull(client)) {
                filterClient = null;
            } else {
                filterClient = client;
            }

            getClientChart();
        });

        // change a client id
        socket.on('client:id:update', function(newId) {
            socket.clientId = newId;

            io.to(dashboardClient).emit('client:id:update', {
                socketId: socket.id,
                newId: newId
            });
        }, ignoreDashboard);

        // when a client emits an event
        socket.on('client:emit', function(data) {
            // ignore client:on emit
            if (!_.isEqual(data.event, 'client:on')) {
                // save to db
                db.addClientEmit(moment().unix(), socket.clientId, data.event, data);

                io.to(dashboardClient).emit('client:emit:event', data);
                // increase the emit count for server emits
                //io.to(dashboardClient).emit('client:emit:count', increaseEmit('client'));
            }
        }, ignoreDashboard);

        // when a client registers an on event
        socket.on('client:on', function(data) {
            io.to(dashboardClient).emit('client:on:event', {
                socketId: socket.id,
                name: data.eventName
            });
        }, ignoreDashboard);

        // retrieve client data
        socket.on('client:data:get', function(socketId) {
            var data = {
                socketId: io.sockets.connected[socketId].id
            };
            io.to(dashboardClient).emit('client:data', data);
        }, ignoreDashboard);

        /*socket.on('chart:emits:plot', function(data) {
            // save to database
            db.addEmitChart(data.timestamp, data.clientEmits, data.serverEmits);
        });*/

        // remove a connected client on disconnect and alert the dashboard client
        socket.on('disconnect', function() {
            getRoomData();
            getClientData();
        }, ignoreDashboard);

        // join the main room
        socket.join('mainRoom');

        // get client chart
        function getClientChart() {
            promise.all([
                db.getServerEmitsForClientChartData(filterClient === null ? null : filterClient.clientId),
                db.getClientEmitsForClientChartData(filterClient === null ? null : filterClient.clientId)
            ]).then(function(res) {
                io.to(dashboardClient).emit('client:chart:update', {
                    serverData: res[0],
                    clientData: res[1]
                });
            });
        }

        // get rooms and connected clients
        function getRoomData() {
            var rooms = [];
            _.each(io.sockets.adapter.rooms, function(users, room) {
                // do not add duplicate rooms and ignore individual users
                if (!_.contains(rooms, room) && room.indexOf('/#') < 0) {
                    var roomUsers = [];
                    _.each(users.sockets, function(isInRoom, socketId) {
                        var user = io.sockets.connected[socketId];
                        roomUsers.push(socketId);
                    });

                    rooms.push({
                        room: room,
                        users: roomUsers
                    });
                }
            });

            io.to(dashboardClient).emit('rooms:data', rooms);
        }

        // get connected client data
        function getClientData() {
            var clients = {};
            _.each(io.sockets.connected, function(client) {
                clients[client.id] = {
                    socketId: client.id,
                    clientId: client.clientId
                };
            });

            io.to(dashboardClient).emit('clients:update', clients);
        }

        // override socket.join to return room data
        var orig_socket_join = socket.join;
        socket.join = function(roomName) {
            var result = orig_socket_join.apply(this, [roomName]);
            getRoomData();
            return result;
        };
    });

    this.io = io;

    return this;
}

function addClientNick() {
    clientIndex++;
    if (clientIndex < 10) {
        return 'Client-00' + clientIndex;
    } else if (clientIndex < 100) {
        return 'Client-0' + clientIndex;
    } else {
        return 'Client-' + clientIndex;
    }
}

// add event ID
function newEventId() {
    eventId++;
    return eventId;
}

// increment server/client emit counts
function increaseEmit(type) {
    switch (type) {
        case 'server':
            numServerEmits++;
            return numServerEmits;
        case 'client':
            numClientEmits++;
            return numClientEmits;
    }

    return null;
}

http.listen(3000, function(){
    console.log('listening on *:3000');
});
