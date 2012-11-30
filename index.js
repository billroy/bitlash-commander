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
var app = express();
var http = require('http')
var server = http.createServer(app)
var io = require('socket.io').listen(server);

app.configure(function () {
	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

app.get('/datacache', function(req, res) {
	res.send(data_cache);
});

app.get('/data/:id', function(req, res) {
	res.send(data_cache[req.params.id]);
});

app.get('/charts', function(req, res) {
	var charts = {};
	for (var id in data_cache) {
		var times = [];
		var values = [];
		var data = data_cache[id];
		if (data.length < 3) continue;
		for (var i=0; i<data.length; i++) {
			times.push(data[i].time);
			values.push(data[i].value);		
		}
		charts[id] = {times: times, values:values};
	}
	res.send(charts);
});
server.listen(port);

//////////
//
//	Initialize Bitlash
//
var Bitlash = require('./lib/bitlash.js');
var bitlash = new Bitlash.Bitlash({
		debug: true, 
		echo: true,
		port: argv.serialport,
		json_callback: broadcastJSONUpdate
	}, function (readytext) {
		console.log('Ready:', readytext);
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
var data_cache = {};		// caches updates per id by time

function addCache(id, value) {
	if (!data_cache[id]) data_cache[id] = [];	// array of objects: {id:<id>, t:<time>, value:<value>}
	data_cache[id].push({
		time: new Date().getTime(),
		value: value
	});
}

io.sockets.on('connection', function (socket) {
	console.log('Client connected via', socket.transport);
	socket.on('exec', function (data) {
		console.log('Exec:', data, typeof data, bitlash.ready);
		if (bitlash.ready) {
			bitlash.exec(data.cmd + '\n', function(reply) {
				reply = reply.trim();
				addCache(data.id, reply);
				console.log('sending reply:', reply);
				//io.sockets.emit('reply', reply);
				data.value = reply;
				//delete data.cmd;
				io.sockets.emit('update', data);
			});
		}
		else io.sockets.emit('reply','ERROR');		// emit error here
	});
	socket.on('update', function(data) {
console.log('Update:', data);
		//addCache(data.id, data.value);
		socket.broadcast.emit('update', data);	// everyone but requester
	});
	socket.on('sync', function(data) {
		var response = [];
		for (var id in data_cache) {
			var datalist = data_cache[id];
			if (datalist.length) response.push({id:id, value:datalist[datalist.length-1].value});
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



