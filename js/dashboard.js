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
        // temporary client/server emit counts used for charting data
        var tmpClientEmits = 0;
        var tmpServerEmits = 0;
        // chart for emit events
        var chart;
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

        setInterval(function() {
            var x = moment().unix(); // current time
            chart.series[0].addPoint([x * 1000, tmpClientEmits], true, true);
            chart.series[1].addPoint([x * 1000, tmpServerEmits], true, true);

            // save the plotted point to be used later
            /*socket.emit('chart:emits:plot', {
                timestamp: x,
                clientEmits: tmpClientEmits,
                serverEmits: tmpServerEmits
            });*/

            // reset the temporary emit counters
            tmpClientEmits = 0;
            tmpServerEmits = 0;
        }, 10000);

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

            console.log(data.clientServerEmits);
            $('#user-chart').highcharts('StockChart', {
                chart: {
                    alignTicks: false
                },

                rangeSelector: {
                    selected: 1
                },

                title: {
                    text: 'AAPL Stock Volume'
                },

                series: [{
                    type: 'column',
                    name: 'AAPL Stock Volume',
                    data: data.clientServerEmits,
                    dataGrouping: {
                        units: [[
                            'hour', // unit name
                            [1] // allowed multiples
                        ], [
                            'month',
                            [1, 2, 3, 4, 6]
                        ]]
                    }
                }]
            });

            // Create the chart
            var chartOptions = {
                chart: {
                    alignTicks: true
                },
                xAxis: {
                    labels: {
                        rotation: -45
                    },
                    alternateGridColor: '#eee',
                    dateTimeLabelFormats: {
                        millisecond: '%H:%M:%S.%L',
                    	second: '%H:%M:%S',
                    	minute: '%l:%M%P',
                    	hour: '%I:%M%P',
                    	day: '%e. %b',
                    	week: '%e. %b',
                    	month: '%b \'%y',
                    	year: '%Y'
                    }
                },
                rangeSelector: {
                    buttons: [{
                        count: 1,
                        type: 'minute',
                        text: '1M'
                    }, {
                        count: 5,
                        type: 'minute',
                        text: '5M'
                    }, {
                        count: 10,
                        type: 'minute',
                        text: '10M'
                    }, {
                        count: 15,
                        type: 'minute',
                        text: '15M'
                    }, {
                        count: 30,
                        type: 'minute',
                        text: '30M'
                    }, {
                        count: 1,
                        type: 'hour',
                        text: '1H'
                    }, {
                        type: 'all',
                        text: 'All'
                    }],
                    inputEnabled: false,
                    selected: 3
                },

                exporting: {
                    enabled: false
                },

                scrollbar: {
                    enabled: false
                },

                series: [
                    {
                        name: 'Client',
                        data: data.clientChartData
                    },
                    {
                        name: 'Server',
                        data: data.serverChartData
                    },
                ]
            };

            $('#chart').highcharts('StockChart', chartOptions);
            chart = $('#chart').highcharts();
        }, ignoreDashboard);

        // client has a new id
        socket.on('client:id:update', function(data) {
            // update clients NEED SOCKET ID SET ON SCOPE
            _.each($scope.clients, function(client, index) {
                if (_.isEqual(client.socketId, data.socketId)) {
                    client.clientId = data.newId;
                }
            });

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
            // increase temporary emit count for charting
            tmpServerEmits++;

            updatePanel('serverEmitEvent', data, {
                maxItems: 50,
                allowDuplicates: true
            });
        }, ignoreDashboard);

        socket.on('client:emit:event', function(data) {
            // increase temporary emit count for charting
            tmpClientEmits++;

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

            switch (panelType) {
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

        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
    }
]);
