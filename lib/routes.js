var path = require('path');
var dir = path.resolve(__dirname + '/../');

module.exports = function(app) {
    // Homepage
    app.get('/', function(req, res){
      res.sendFile('index.html', { root: dir });
    });
    // Test Client
    app.get('/test', function(req, res){
        res.sendFile('test-client.html', { root: dir });
    });

    // Client javascript
    app.get('/assets/js/:file', function(req, res) {
        var file = req.params.file;
        switch(file) {
            case 'angular':
                res.sendFile('node_modules/angular/angular.min.js', { root: dir });
                break;
            case 'angular.min.js.map':
                res.sendFile('node_modules/angular/angular.min.js.map', { root: dir });
                break;
            case 'jquery':
                res.sendFile('node_modules/jquery/dist/jquery.min.js', { root: dir });
                break;
            case 'bootstrap':
                res.sendFile('node_modules/bootstrap/dist/js/bootstrap.min.js', { root: dir });
                break;
            case 'underscore':
                res.sendFile('node_modules/underscore/underscore-min.js', { root: dir });
                break;
            case 'underscore-min.map':
                res.sendFile('node_modules/underscore/underscore-min.map', { root: dir });
                break;
            case 'moment':
                res.sendFile('node_modules/moment/min/moment.min.js', { root: dir });
                break;
            default:
                res.sendFile('js/' + file, { root: dir });
                break;
        }
    });

    // Client css
    app.get('/assets/css/:file', function(req, res) {
        var file = req.params.file;

        switch(file) {
            case 'bootstrap':
                res.sendFile('node_modules/bootstrap/dist/css/bootstrap.min.css', { root: dir });
                break;
            case 'bootstrap.min.css.map':
                res.sendFile('node_modules/bootstrap/dist/css/bootstrap.min.css.map', { root: dir });
                break;
            case 'font-awesome':
                res.sendFile('node_modules/font-awesome/css/font-awesome.min.css', { root: dir });
                break;
            default:
                res.sendFile('css/' + file, { root: dir });
                break;
        }
    });

    // Client fonts
    app.get('/assets/fonts/:file', function(req, res) {
        var file = req.params.file;

        if (file.indexOf('-webfont') >= 0) {
            res.sendFile('node_modules/font-awesome/fonts/' + file, { root: dir });
        }
    });

    return this;
};
