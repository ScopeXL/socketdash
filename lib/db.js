var moment = require('moment');
var _ = require('underscore');
var sqlite3 = require('sqlite3').verbose();
var promise = require('promise');
var db = new sqlite3.Database('./lib/db.sqlite3');

db.serialize(function() {
    // server emits table to store all events emitted to the server
    db.run('CREATE TABLE IF NOT EXISTS server_emits(timestamp INTEGER, client_id TEXT, event TEXT, data TEXT)');
    // client emits table to store all events emitted from the client
    db.run('CREATE TABLE IF NOT EXISTS client_emits(timestamp INTEGER, client_id TEXT, event TEXT, data TEXT)');
    // store the emits in a chart to visualize
    //db.run("CREATE TABLE IF NOT EXISTS chart_emits(timestamp INTEGER, client_emits INTEGER, server_emits INTEGER)");
});
//db.close();

// Various database helper functions
module.exports = function() {
    // Add a server emit to the database
    this.addServerEmit = function(timestamp, clientId, ev, data) {
        db.serialize(function() {
            var stmt = db.prepare('INSERT INTO server_emits VALUES (?, ?, ?, ?)');
            stmt.run(timestamp, clientId, ev, JSON.stringify(data));
            stmt.finalize();
        });
    };

    // Add a client emit to the database
    this.addClientEmit = function(timestamp, clientId, ev, data) {
        db.serialize(function() {
            var stmt = db.prepare('INSERT INTO client_emits VALUES (?, ?, ?, ?)');
            stmt.run(timestamp, clientId, ev, JSON.stringify(data));
            stmt.finalize();
        });
    };

    // get chart data for server emits
    this.getServerEmitsChartData = function(currentTimestamp) {
        var p = new promise(function(resolve, reject) {
            var serverResults = [];

            db.serialize(function() {
                var startTimestamp, stopTimestamp;
                var isFirst = true;
                var tmpCount = 0;
                // maximum amount of data to retrieve from the database
                var maxData = moment(currentTimestamp).subtract(1, 'day').unix();
                // number of times to iterate the timestamp array
                var maxTimestamps = (currentTimestamp.unix() - maxData) / 10;
                console.log(maxTimestamps);

                db.each('SELECT * FROM server_emits WHERE timestamp > ? ORDER BY timestamp DESC',
                    [maxData],
                    function(err, row) {
                        // first row, set the interval to 10 seconds
                        if (isFirst) {
                            startTimestamp = Math.round(currentTimestamp.unix() / 10) * 10,
                            stopTimestamp = startTimestamp - 10;
                            isFirst = false;
                        }

                        // if record falls between the start & stop timestamp add to group
                        if (row.timestamp > stopTimestamp) {
                            tmpCount++;
                        } else {
                            // add series to results
                            serverResults.push([startTimestamp * 1000, tmpCount]);
                            // set the start / stop timestamp to the next level down
                            startTimestamp = stopTimestamp;
                            stopTimestamp = startTimestamp - 10;
                            // reset the temporary count for the next series
                            tmpCount = 0;
                        }
                    }, function(err, numRows) {
                        serverResults.reverse();
                        resolve(serverResults);
                    }
                );
            });
        });

        return p;
    };

    // get chart data for server emits
    this.getClientEmitsChartData = function(currentTimestamp) {
        var p = new promise(function(resolve, reject) {
            var clientResults = [];

            db.serialize(function() {
                var startTimestamp, stopTimestamp;
                var isFirst = true;
                var tmpCount = 0;
                // maximum amount of data to retrieve from the database
                var maxData = moment(currentTimestamp).subtract(1, 'day').unix();
                // number of times to iterate the timestamp array
                var maxTimestamps = (currentTimestamp.unix() - maxData) / 10;

                db.each('SELECT * FROM client_emits WHERE timestamp > ? ORDER BY timestamp DESC',
                    [maxData],
                    function(err, row) {
                        // first row, set the interval to 10 seconds
                        if (isFirst) {
                            startTimestamp = Math.round(currentTimestamp.unix() / 10) * 10,
                            stopTimestamp = startTimestamp - 10;
                            isFirst = false;
                        }

                        // if record falls between the start & stop timestamp add to group
                        if (row.timestamp > stopTimestamp) {
                            tmpCount++;
                        } else {
                            // add series to results
                            clientResults.push([startTimestamp * 1000, tmpCount]);
                            // set the start / stop timestamp to the next level down
                            startTimestamp = stopTimestamp;
                            stopTimestamp = startTimestamp - 10;
                            // reset the temporary count for the next series
                            tmpCount = 0;
                        }
                    }, function(err, numRows) {
                        clientResults.reverse();
                        resolve(clientResults);
                    }
                );
            });
        });

        return p;
    };

    this.getServerEmitsForClientChartData = function(clientId) {
        var p = new promise(function(resolve, reject) {
            var results = [],
                selectStmt = null,
                selectParams = null;

            db.serialize(function() {
                // build the select statement based on if a client ID is provided
                if (_.isUndefined(clientId) || _.isNull(clientId)) {
                    // no client ID is provided, select all
                    selectStmt = 'SELECT * FROM server_emits ORDER BY timestamp DESC';

                    db.each(selectStmt, function(err, row) {
                        results.push([row.timestamp * 1000, 1]);
                    }, function(err, numRows) {
                        results.reverse();
                        resolve(results);
                    });
                } else {
                    // client ID is provided, select only matching records
                    selectStmt = 'SELECT * FROM server_emits WHERE client_id = ? ORDER BY timestamp DESC';
                    selectParams = [clientId];

                    db.each(selectStmt, selectParams, function(err, row) {
                        results.push([row.timestamp * 1000, 1]);
                    }, function(err, numRows) {
                        results.reverse();
                        resolve(results);
                    });
                }
            });
        });

        return p;
    };

    this.getClientEmitsForClientChartData = function(clientId) {
        var p = new promise(function(resolve, reject) {
            var results = [],
                selectStmt = null,
                selectParams = null;

            db.serialize(function() {
                // build the select statement based on if a client ID is provided
                if (_.isUndefined(clientId) || _.isNull(clientId)) {
                    // no client ID is provided, select all
                    selectStmt = 'SELECT * FROM client_emits ORDER BY timestamp DESC';

                    db.each(selectStmt, function(err, row) {
                        results.push([row.timestamp * 1000, 1]);
                    }, function(err, numRows) {
                        results.reverse();
                        resolve(results);
                    });
                } else {
                    // client ID is provided, select only matching records
                    selectStmt = 'SELECT * FROM client_emits WHERE client_id = ? ORDER BY timestamp DESC';
                    selectParams = [clientId];

                    db.each(selectStmt, selectParams, function(err, row) {
                        results.push([row.timestamp * 1000, 1]);
                    }, function(err, numRows) {
                        results.reverse();
                        resolve(results);
                    });
                }
            });
        });

        return p;
    };

    // get the server emit total
    this.getTotalServerEmits = function() {
        var p = new promise(function(resolve, reject) {
            db.serialize(function() {
                db.each('SELECT timestamp FROM server_emits', function(err, row) {

                }, function(err, numRows) {
                    resolve(numRows);
                });
            });
        });

        return p;
    };

    // get the client emit total
    this.getTotalClientEmits = function() {
        var p = new promise(function(resolve, reject) {
            db.serialize(function() {
                db.each('SELECT timestamp FROM client_emits', function(err, row) {

                }, function(err, numRows) {
                    resolve(numRows);
                });
            });
        });

        return p;
    };

    return this;
};
