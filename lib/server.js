/*
 * Primary file for the API
 *
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');

var config = require('./config');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

// var _data = require('./lib/data');

// TESTING
// helpers.sendTwilioSms('4158375309', 'Hello from Belarus!', function(err){
//     console.log('Twilio error: ', err);
// })

// TESTING
// TODO: delete this
// _data.create('test', 'newFile', {'foo' : 'bar'}, function(err) {
//     console.log('data.create error: ', err);
// });
// _data.read('test', 'newFile1', function(err, data) {
//     console.log('data.read error: ', err, ' and this was the data: ', data);
// });
// _data.update('test', 'newFile', {'fizz' : 'buzz'}, function(err) {
//     console.log('data.update error: ', err);
// });
// _data.delete('test', 'newFile', function(err) {
//     console.log('data.delete error: ', err);
// });

var server = {};

// Instantiating the HTTP server
server.httpServer = http.createServer(function(req, res) {
    server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
    server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = function(req, res) {
    // Get the URL and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });
    req.on('end', function() {
        buffer += decoder.end();

        // Choose the handler this request should go to
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method' : method,
            'headers': headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, function(statusCode, payload) {
            // Use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, or default to empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log('Request received on path: '
                + trimmedPath
                + ' with this method: '
                + method
                + ' and with these query string parameters ', 
                queryStringObject);

            // console.log('Request received with these headers: ', headers);
            // console.log('payload: ', payload);
            // console.log('Returning this response: ', statusCode, payloadString);
        });        
    });
};

// Define a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};

server.init = function() {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function() {
        console.log('The HTTP server is listening on port ' + config.httpPort);
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function() {
        console.log('The HTTPS server is listening on port ' + config.httpsPort);
    });
}

module.exports = server;