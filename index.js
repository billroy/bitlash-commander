//
// index.js: Run the Bitlash Commander server
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

var opt = require('optimist');
var url = require('url');
var argv = opt.usage('Usage: $0 [flags]')
	.alias('p', 'port')
	.describe('p', 'port for the http server')
	.alias('s', 'serialport')
	.describe('s', 'port for usbserial arduino connection')
	.alias('r', 'redis')
	.describe('r', 'redis server url in redis-url format')
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

app.get('/data', function(req, res) {
	res.send(data_cache);
});

app.get('/d3/:id', function(req, res) {
	//console.log('D3Get:', req.params.id, data_cache);
	var output = []; 			// array of {time:23432, value:dsjklfjsd}
	if (data_cache[req.params.id]) {
		var data = data_cache[req.params.id];
		for (var i=0; i<data.length; i++) {
			var point = {time: data[i].time};
			point[req.params.id] = data[i].value;
			output.push(point);
		}
	}
	else if (req.params.id == '$random') {
		for (var i=0; i<100; i++) {
			var point = {time: i};
			point[req.params.id] = Math.floor(Math.random()*1000);
			output.push(point);
		}
	}
	//console.log('D3Out:', output);
	res.send(output);
});

server.listen(port);
console.log('Listening on port ', port);

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
//	Initialize the Redis Store for Socket.io, if needed
//
var redis_url = process.env.REDISTOGO_URL || argv.redis || undefined;
var redis, redis_pub, redis_sub, redis_client, RedisStore, RedisURL;
if (redis_url) {
	var parsed_url = url.parse(redis_url);
	console.log('Connecting to Redis at:', redis_url, parsed_url, parsed_url.auth.split(":")[1]);
	redis = require('redis');
	redis_pub = redis.createClient(parsed_url.port, parsed_url.hostname);
	redis_sub = redis.createClient(parsed_url.port, parsed_url.hostname);
	redis_client = redis.createClient(parsed_url.port, parsed_url.hostname);

	redis_pub.auth(parsed_url.auth.split(':')[1]);
	redis_sub.auth(parsed_url.auth.split(':')[1]);
	redis_client.auth(parsed_url.auth.split(':')[1]);

	RedisStore = require('socket.io/lib/stores/redis');
}

//////////
//
//	Initialize Socket.io
//
// for heroku,
// per https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
if (1 || heroku) {
	io.configure(function () { 
		io.set('transports', ['xhr-polling']); 
		io.set('polling duration', 10); 
		if (RedisStore) {
			console.log('Starting RedisStore');
			io.set('store', new RedisStore({redis: redis, redisPub: redis_pub, redisSub: redis_sub, redisClient: redis_client}));
		}
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

// for heroku,
// per https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
if (heroku) {
	io.configure(function () { 
		io.set("transports", ["xhr-polling"]); 
		io.set("polling duration", 10); 
	});
}
io.set('log level', 1);

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



