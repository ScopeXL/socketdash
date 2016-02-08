var moment = require('moment');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./lib/db.sqlite3');

db.serialize(function() {
    // server emits table to store all events emitted to the server
    db.run("CREATE TABLE IF NOT EXISTS server_emits(timestamp INTEGER, client_id TEXT, event TEXT, data TEXT)");
    // client emits table to store all events emitted from the client
    db.run("CREATE TABLE IF NOT EXISTS client_emits(timestamp INTEGER, client_id TEXT, event TEXT, data TEXT)");
    // store the emits in a chart to visualize
    //db.run("CREATE TABLE IF NOT EXISTS chart_emits(timestamp INTEGER, client_emits INTEGER, server_emits INTEGER)");
});
//db.close();

// Various database helper functions
module.exports = function() {

    // Add a server emit to the database
    this.addServerEmit = function(timestamp, clientId, ev, data) {
        db.serialize(function() {
            var stmt = db.prepare("INSERT INTO server_emits VALUES (?, ?, ?, ?)");
            stmt.run(timestamp, clientId, ev, JSON.stringify(data));
            stmt.finalize();
        });
    };

    // Add a client emit to the database
    this.addClientEmit = function(timestamp, clientId, ev, data) {
        db.serialize(function() {
            var stmt = db.prepare("INSERT INTO client_emits VALUES (?, ?, ?, ?)");
            stmt.run(timestamp, clientId, ev, JSON.stringify(data));
            stmt.finalize();
        });
    };

    /*this.addEmitChart = function(timestamp, clientEmits, serverEmits) {
        db.serialize(function() {
            var stmt = db.prepare("INSERT INTO chart_emits VALUES (?, ?, ?)");
            stmt.run(timestamp, clientEmits, serverEmits);

            stmt.finalize();
        });
    };*/

    this.getEmitChart = function(callback) {
        //var points = [];
        var serverResults = [],
            clientResults = [];

        db.serialize(function() {
            /*db.each("SELECT * FROM chart_emits ORDER BY timestamp DESC LIMIT 500", function(err, row) {
                points.push(row);
            }, function(err, numRows) {
                points.reverse();
                callback(points);
            });*/
            /*db.each("SELECT * FROM server_emits ORDER BY timestamp DESC LIMIT 500", function(err, row) {
                results.push(row);
            }, function(err, numRows) {
                results.reverse();
                callback(results);
            });*/

            var startTimestamp, stopTimestamp;
            var isFirst = true;
            var tmpCount = 0;
            // current timestamp
            var currentTimestamp = moment().unix();
            // maximum amount of data to retrieve from the database
            var maxData = moment().subtract(1, 'day').unix();
            // number of times to iterate the timestamp array
            var maxTimestamps = (currentTimestamp - maxData) / 10;

            /*for (var i = maxTimestamps; i > 0; i--) {
                console.log(tmpTimestamp);
                tmpTimestamp -= 10;
            }*/

            db.each("SELECT * FROM server_emits WHERE timestamp > " + maxData + " ORDER BY timestamp DESC", function(err, row) {
                // first row, set the interval to 10 seconds
                if (isFirst) {
                    startTimestamp = Math.round(currentTimestamp / 10) * 10,
                    stopTimestamp = startTimestamp - 10;
                    isFirst = false;
                }

                // if record falls between the start & stop timestamp add to group
                if (row.timestamp > stopTimestamp) {
                    tmpCount++;
                    /*console.log('Start: ' + startTimestamp + ' | Stop: ' + stopTimestamp);
                    console.log('Falls in Series: ' + row.timestamp);
                    console.log('--------------------');*/
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
                var tmpTimestamp = currentTimestamp;

                startTimestamp = null, stopTimestamp = null;
                isFirst = true;
                tmpCount = 0;
                db.each("SELECT * FROM client_emits WHERE timestamp > " + maxData + " ORDER BY timestamp DESC", function(err, row) {
                    // first row, set the interval to 10 seconds
                    if (isFirst) {
                        startTimestamp = Math.round(currentTimestamp / 10) * 10,
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
                    serverResults.reverse();
                    clientResults.reverse();
                    callback(serverResults, clientResults);
                });

                //results.reverse();
                //callback(results);
            });
        });
    };

    this.getServerEmitsForClient = function(callback) {
        var results = [];
        db.serialize(function() {
            db.each("SELECT * FROM server_emits WHERE client_id = 'blergh' ORDER BY timestamp DESC", function(err, row) {
                results.push([row.timestamp * 1000, 1]);
            }, function(err, numRows) {
                results.reverse();
                callback(results);
            });
        });
    };

    return this;
};
