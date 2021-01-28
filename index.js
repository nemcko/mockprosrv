const { exit } = require('process');

var express = require('express')
    , app = express()
    , http = require('http')
    , url = require('url')
    , path = require('path')
    , fs = require('fs')
    , methodOverride = require('method-override')
    , bodyParser = require('body-parser')
    , cors = require('cors')
    , lib = require('./lib')
    , UrlPattern = require('url-pattern')
    ;


app.use(bodyParser.urlencoded({ 'extended': 'false' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(methodOverride('X-HTTP-Method'));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(methodOverride('X-Method-Override'));
app.use(function (req, res, next) {
    if (typeof (req.headers['content-type']) === 'undefined') {
        req.headers['content-type'] = "application/json; charset=UTF-8";
    }
    next();
});

module.exports.runMockSrv = function (rootdir, confpath) {
    var config = require(confpath).config
        , api = require(confpath).apipath
        ;

    var originsWhitelist = [
        config.clientUrl,
        config.serverUrl,
        'http://localhost:' + config.devPort,
        'http://localhost:4200',
        'http://' + config.serverHost + ':' + config.serverPort
    ];
    var corsOptions = {
        origin: function (origin, callback) {
            var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
            isWhitelisted = true;
            callback(null, isWhitelisted);
        },
        credentials: true
    }
    app.use(cors(corsOptions));

    config['rootdir'] = rootdir;

    var filePath = path.join(config.rootdir, config.ctrlDir);
    fs.readdirSync(filePath).forEach(function (file) {
        require(filePath + '/' + file)(app, lib, config, api);
    });

    console.log(
        "\n" + 
        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n" +
        " Develop Server listening on port " + config.devPort + "\n" +
        " Mock Server listening on port " + config.mockPort + "\n" +
        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
    );
    console.log('cors:', [
        config.clientUrl
    ]);


    var parsedServerUrl = url.parse(config.serverUrl);

    function getGate(url) {
        var gateOpen = null;
        Object.keys(config.mockGate).forEach(function (key) {
            var pattern = new UrlPattern(key);
            if (pattern.match(url)) {
                gateOpen = config.mockGate[key];
            }
            delete pattern;
        });
        return gateOpen;
    }

    function onRequest(client_req, client_res) {
        var options = {
            hostname: 'localhost',
            port: config.mockPort,
            path: client_req.url.replace(/^\/mocksrv/, ""),
            method: client_req.method,
            headers: client_req.headers
        };

        if (getGate(options.path) === true) {
            options.hostname = parsedServerUrl.hostname;
            options.port = "80";
            options.headers.Authorization = 'Basic ' + Buffer.from(config.serverUser + ':' + config.serverPwd).toString('base64');
            options.headers["Host"] = config.serverHost;
            options.headers["sec-fetch-mode"] = "no-cors";
            // options.headers["Content-Type"] = "application/json; encoding=UTF-8";
            options.headers["Access-Control-Allow-Origin"] = "*";
            options.headers["Access-Control-Allow-Methods"] = "*";
            options.headers["Access-Control-Allow-Credentials"] = "*";
            options.headers["Access-Control-Allow-Headers"] = "*";
            options.headers["Accept"] = "*/*";
            options.headers["Referer-Policy"] = "no-referrer";
            options.headers.referer = options.headers.origin =
                options.headers.host = config.serverUrl;
        }

        var proxy = http.request(options, function (res) {
            if (client_req.method === 'OPTIONS') {
                client_res.writeHead(200, res.headers);
            } else {
                client_res.writeHead(res.statusCode, res.headers)
            }
            res.pipe(client_res, {
                end: true
            });
        });

        client_req.pipe(proxy, {
            end: true
        });

    }

    http.createServer(onRequest).listen(config.devPort);
    app.listen(config.mockPort);
}
