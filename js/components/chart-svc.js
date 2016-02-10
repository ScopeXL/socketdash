app.service('ChartSvc', function() {

    // Build the column chart
    this.buildColumnChart = function(seriesData) {
        var chartOptions = {
            chart: {
                alignTicks: false
            },
            xAxis: {
                allowDecimals: false,
                labels: {
                    rotation: -45
                },
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S.%L',
                    second: '%l:%M:%S%P',
                    minute: '%l:%M%P',
                    hour: '%l:%M%P',
                    day: '%e. %b',
                    week: '%e. %b',
                    month: '%b \'%y',
                    year: '%Y'
                },
                minRange: 3600000,
                range: 3600000
            },
            yAxis: {
                allowDecimals: false,
                offset: 15
            },
            rangeSelector: {
                enabled: false,
                selected: 1
            },
            navigator: {
                enabled: true
            },
            scrollbar: {
                enabled: false
            },
            series: [
                {
                    type: 'column',
                    name: 'Server Emits',
                    data: seriesData.clientServerEmits,
                    dataGrouping: {
                        units: [[
                            'hour', // unit name
                            [1] // allowed multiples
                        ], [
                            'month',
                            [1, 2, 3, 4, 6]
                        ]]
                    }
                },
                {
                    type: 'column',
                    name: 'Client Emits',
                    data: seriesData.clientClientEmits,
                    dataGrouping: {
                        units: [[
                            'hour', // unit name
                            [1] // allowed multiples
                        ], [
                            'month',
                            [1, 2, 3, 4, 6]
                        ]]
                    }
                }
            ]
        };

        $('#user-chart').highcharts('StockChart', chartOptions);
        return $('#user-chart').highcharts();
    }

    // build the emit timeline chart
    this.buildEmitTimeline = function(seriesData) {
        // Create the chart
        var chartOptions = {
            chart: {
                alignTicks: true
            },
            xAxis: {
                allowDecimals: false,
                min: 0,
                labels: {
                    rotation: -45
                },
                alternateGridColor: '#eee',
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S.%L',
                    second: '%l:%M:%S%P',
                    minute: '%l:%M%P',
                    hour: '%l:%M%P',
                    day: '%e. %b',
                    week: '%e. %b',
                    month: '%b \'%y',
                    year: '%Y'
                }
            },
            yAxis: {
                allowDecimals: false,
                offset: 15
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
            plotOptions: {
                line: {
                    states: {
                        hover: {
                            lineWidthPlus: 0
                        }
                    }
                }
            },
            exporting: {
                enabled: false
            },
            scrollbar: {
                enabled: false
            },
            series: [
                {
                    name: 'Server',
                    data: seriesData.serverChartData
                },
                {
                    name: 'Client',
                    data: seriesData.clientChartData
                },
            ]
        };

        $('#emit-timeline-chart').highcharts('StockChart', chartOptions);
        return $('#emit-timeline-chart').highcharts();
    };

    return this;
});
