var app = angular.module('socketDash', []);

app.controller('DashboardCtrl', ['$scope',
    function($scope) {
        // show random number to indicate new connection
        console.log(Math.random());
        // connect to the socket
        var socket = io();
        /*var socket = io('http://localhost:3000', {
            reconnection: false
        });*/
        // ignore dashboard events
        var ignoreDashboard = true;
        // server start time (sent when the dashboard connects)
        var serverStartedAt;
        // emit event array
        $scope.serverEmitEvents = [];
        $scope.clientEmitEvents = [];
        // on event array
        $scope.clientOnEvents = [];
        $scope.serverOnEvents = [];
        // connected client count
        $scope.connectedClientCount = 0;
        // clients
        $scope.clients = {};

        socket.emit('client:dashboard:set', null, ignoreDashboard);

        setInterval(function() {
            $scope.serverUptime = moment(serverStartedAt).fromNow(true);
        }, 1000);

        // Fetch event data
        $scope.setActiveEvent = function(ev) {
            console.log(ev);
            $scope.activeClient = ev.socketId;
            $scope.activeEventId = ev.eventId;
            $scope.activeDetails = ev;
        };

        // Fetch client data
        $scope.getClient = function(socketId) {
            if (!_.isEqual($scope.activeClient, socketId)) {
                socket.emit('client:data:get', socketId, ignoreDashboard);
                $scope.activeClient = socketId;
            } else {
                $scope.activeClient = null;
            }
        };

        // log details in the console window
        $scope.logDetails = function() {
            console.log('Details', $scope.activeDetails);
            console.log(socket);
        };

        // log clients in the console window
        $scope.logClients = function() {
            console.log('Clients', $scope.clients);
        };

        // set client emit count
        socket.on('client:emit:count', function(count) {
            $scope.numClientEmits = count;
        });

        // return detailed client data
        socket.on('client:data', function(data) {
            $scope.activeDetails = data;
            $scope.$apply();
        }, ignoreDashboard);

        // server alerts us of the dashboards client id
        socket.on('client:dashboard:init', function(data) {
            serverStartedAt = data.uptime;
            $scope.clientId = data.clientId;
            $scope.$apply();
        }, ignoreDashboard);

        // client has a new id
        socket.on('client:id:update', function(data) {
            // update clients NEED SOCKET ID SET ON SCOPE
            _.each($scope.clients, function(client, index) {
                if (_.isEqual(client.socketId, data.socketId)) {
                    client.clientId = data.newId;
                }
            });

            // update rooms

            $scope.$apply();
        }, ignoreDashboard);

        // update the connected clients list
        socket.on('clients:update', function(clients) {
            $scope.clients = clients;
            $scope.numClients = _.size(clients);
            $scope.$apply();
        }, ignoreDashboard);

        // server tells us of the server rooms
        socket.on('rooms:data', function(rooms) {
            $scope.rooms = rooms;
            $scope.$apply();
        }, ignoreDashboard);

        // when a connection is made
        socket.on('connect', function() {
            $scope.socketId = socket.id;
            $scope.clientId = socket.clientId;
            $scope.$apply();
        }, ignoreDashboard);

        // reload the page on reconnection
        socket.on('reconnect', function() {
            console.log('RECONNECTED');
            location.reload();
        }, ignoreDashboard);

        // update connected client count
        socket.on('client:count', function(num) {
            $scope.connectedClientCount = num;
            $scope.$apply();
        }, ignoreDashboard);

        // set client emit count
        socket.on('server:emit:count', function(count) {
            $scope.numServerEmits = count;
        });

        socket.on('server:emit:event', function(data) {
            updatePanel('serverEmitEvent', data, {
                maxItems: 50,
                allowDuplicates: true
            });
        }, ignoreDashboard);

        socket.on('client:emit:event', function(data) {
            updatePanel('clientEmitEvent', data, {
                maxItems: 50,
                allowDuplicates: true
            });
        }, ignoreDashboard);

        socket.on('server:on:event', function(data) {
            updatePanel('serverOnEvent', data);
        }, ignoreDashboard);

        socket.on('client:on:event', function(data) {
            updatePanel('clientOnEvent', data);
        }, ignoreDashboard);

        /* Update a Panel
         * @param string panelType
         * @param object data
         * @param object opts
 *          - int maxItems
            - bool allowDuplicates
         *
         * @return null
         */
        function updatePanel(panelType, data, opts) {
            var panelArr, panelElem;
            if (_.isUndefined(opts)) {
                opts = {};
            }
            if (_.isUndefined(opts.maxItems) || !_.isNumber(opts.maxItems)) {
                opts.maxItems = 0;
            }

            switch(panelType) {
                case 'serverEmitEvent':
                    panelArr = $scope.serverEmitEvents;
                    panelElem = '#server-emit-events-panel';
                    break;
                case 'clientEmitEvent':
                    panelArr = $scope.clientEmitEvents;
                    panelElem = '#client-emit-events-panel';
                    break;
                case 'serverOnEvent':
                    panelArr = $scope.serverOnEvents;
                    panelElem = '#server-on-events-panel';
                    break;
                case 'clientOnEvent':
                    panelArr = $scope.clientOnEvents;
                    panelElem = '#client-on-events-panel';
                    break;
            }

            data.timestamp = moment().format('hh:mm:ss a');

            if (opts.allowDuplicates) {
                // duplicate items are allowed, simply push to the array
                panelArr.push(data);
            } else {
                // duplicates are not allowed, check for the same item
                var exists = _.where(panelArr, { name: data.name });
                if (exists.length <= 0) {
                    panelArr.push(data);
                }
            }

            if (opts.maxItems > 0) {
                if (panelArr.length > opts.maxItems) {
                    panelArr.splice(0, 1);
                }
            }
            $scope.$apply();

            // scroll to bottom
            //$(panelElem).scrollTop($(panelElem)[0].scrollHeight);
        }
    }
]);
