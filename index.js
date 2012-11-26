//
// index.js: run the arduino commander server
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

var opt = require('optimist');
var argv = opt.usage('Usage: $0 [flags]')
	.alias('p', 'port')
	.describe('p', 'port for the http server')
	.argv;

if (argv.help) {
	opt.showHelp();
	process.exit();
} 

var port;
var heroku;
if (argv.port) port = argv.port;
else if (process && process.env && process.env.PORT) {
	heroku = true;
	port = process.env.PORT;
}
else port = 3000;

var express = require('express');
var app = module.exports = express.createServer().listen(port);
var io = require('socket.io').listen(app);

app.configure(function () {
	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/public/index.html');
});


//////////
//
//	Initialize Bitlash
//
var bitlash_ready = false;

var Bitlash = require('./lib/bitlash.js');
var bitlash = new Bitlash.Bitlash({debug:true,echo:true}, function (readytext) {
	console.log('Ready:', readytext);
	bitlash_ready = true;
});


//////////
//
//	Initialize Socket.io
//
// for heroku,
// per https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
if (1 || heroku) {
	io.configure(function () { 
		io.set("transports", ["xhr-polling"]); 
		io.set("polling duration", 10); 
	});
}
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
	console.log('Client connected via', socket.transport);
	socket.on('exec', function (data) {
		console.log('Exec:', data, typeof data, bitlash_ready);
		if (bitlash_ready) {
			bitlash.exec(data.cmd + '\n', function(reply) {
				console.log('bitlash reply:', reply);
				io.sockets.emit('reply', reply);
			});
		}
		else io.sockets.emit('reply','ERROR');		// emit error here
	});
	socket.on('ping', function(data) {
		socket.emit('pong', data);
	});
});



