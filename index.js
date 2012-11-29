//
// index.js: run the arduino commander server
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

var opt = require('optimist');
var argv = opt.usage('Usage: $0 [flags]')
	.alias('p', 'port')
	.describe('p', 'port for the http server')
	.alias('s', 'serialport')
	.describe('s', 'port for usbserial arduino connection')
	.argv;

if (argv.help) {
	opt.showHelp();
	process.exit();
} 

var port = argv.port || 3000;

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
var bitlash = new Bitlash.Bitlash({
		debug: true, 
		echo: true,
		port: argv.serialport,
		json_callback: broadcastJSONUpdate
	}, function (readytext) {
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

// BUG: leaks control id's across rooms
// BUG: confuses control ID's across rooms
var reply_cache = {};		// caches latest update per id

io.sockets.on('connection', function (socket) {
	console.log('Client connected via', socket.transport);
	socket.on('exec', function (data) {
		console.log('Exec:', data, typeof data, bitlash_ready);
		if (bitlash_ready) {
			bitlash.exec(data.cmd + '\n', function(reply) {
				reply_cache[data.id] = reply.trim();
console.log('Cache:', reply_cache);
				console.log('bitlash reply:', reply);
				io.sockets.emit('reply', reply);
			});
		}
		else io.sockets.emit('reply','ERROR');		// emit error here
	});
	socket.on('update', function(data) {
		socket.broadcast.emit('update', data);
	});
	socket.on('sync', function(data) {
		var response = [];
		for (var id in reply_cache) {
			response.push({id:id, value:reply_cache[id]});
		}
console.log('Sync:', response);
		// only to requester
		socket.emit('update', response);
	});
	socket.on('ping', function(data) {
		socket.emit('pong', data);
	});
});

function broadcastJSONUpdate(data) {
	io.sockets.emit('update', data);
}



