var http = require('http');
var app = require('./app');

var port = process.env.port || 3000;

var server = http.createServer(app);

console.log(`listening on port ${port}`);

server.listen(port);