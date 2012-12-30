#! /usr/bin/env node
//////////
//
//	index.js: Run the Bitlash Commander server
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//
//
var opt = require('optimist');
var url = require('url');
var argv = opt.usage('Usage: $0 [flags]')
	.alias('p', 'port')
	.describe('p', 'TCP port for the http server (3000)')
	.alias('s', 'serialport')
	.describe('s', 'port for usbserial arduino connection')
	.alias('b', 'baud')
	.describe('b', 'baud rate for usbserial arduino connection (57600)')
	.alias('c', 'cache')
	.describe('c', 'load cached values on restart')
	.alias('r', 'redis')
	.describe('r', 'redis server url in redis-url format')
	.alias('x', 'rexec')
	.describe('x', 'set true to accept remote bitlash commands on socket.io')
	.boolean('l')
	.alias('l', 'login')
	.describe('l', 'require a valid login to use the server')
	.alias('u', 'update')
	.describe('u', 'allow HTTP updates via POST /update/:id/:value')
	.argv;

if (argv.help) {
	opt.showHelp();
	process.exit();
} 


//////////
//
//	Determine web port
//
var port;
var heroku;
if (argv.port) port = argv.port;
else if (process && process.env && process.env.PORT) {
	heroku = true;
	port = process.env.PORT;
}
else port = 3000;


//////////
//
//	Access Control: Username / Password Table
//
//	These credentials are only checked if the server is started with the -l flag.
//
//	Please change the defaults below so you don't become a security statistic.
//
var users = [
	['bug', '1234'],			// [username, password]
	['nemo', '12343']
];

function authorize(username, password) {
	console.log('Auth:', username, password);
	if (!argv.login) return true;
	for (var u=0; u < users.length; u++) {
		if ((username == users[u][0]) && (password == users[u][1])) return true;
	}
	return false;
}
if (argv.login) {
	console.log('Server will check user credentials.');
}


//////////
//
//	Configure HTTP server
//
var express = require('express');
var app = express();
var http = require('http');
var https = require('https');
var fs = require('fs');
var server;

if (0) {
	var ssl_key = fs.readFileSync('server.key').toString();
	var ssl_cert = fs.readFileSync('server.crt').toString();  
	server = https.createServer({key:ssl_key, cert:ssl_cert}, app);
}
else {
	server = http.createServer(app);
}

var io = require('socket.io').listen(server);

if (argv.login) app.configure(function () {
	app.use(express.basicAuth(authorize));
});

app.configure(function () {
	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));
});

var panelpath = 'panel/';
var htmlpath  = 'public/*.html';
var fs = require('fs');
var shell = require('shelljs');
//var indextemplate = fs.readFileSync('public/indextemplate.html', 'utf8');
var indextemplate;

app.get('/', function(req, res) {
	indextemplate = fs.readFileSync('public/indextemplate.html', 'utf8');
	var guipanels = shell.ls(panelpath);
	var rawpanels = shell.ls(htmlpath);
	var custompanels = [];
	for (var i=0; i < rawpanels.length; i++) {
		var p = rawpanels[i].split('/')[1];
		p = p.replace(/.html$/, '');
		if (p == 'template') continue;
		if (p == 'indextemplate') continue;
		custompanels.push(p);		
	}

	//console.log('panels:', guipanels, custompanels);

	var html = indextemplate.replace(/{{guipanels}}/, JSON.stringify(guipanels));
	html = html.replace(/{{custompanels}}/, JSON.stringify(custompanels));

	res.send(html);
});

var paneltemplate = fs.readFileSync('public/template.html', 'utf8');

app.get('/panel/:id', function(req, res) {
	var panelid = req.params.id;
	var html = paneltemplate.replace(/{{panelid}}/g, panelid.toString());
	res.send(html);
});


function handleUpdate(req, res) {
	var id = req.params.id;
	var value = req.params.value;
	addCache(id, value);
	data = {id:id, value:value};
	console.log('Update:', id, value, data);
	io.sockets.emit('update', data);	// or broadcastJSONUpdate
	res.send(value);
}

if (argv.update) {
	var mountpoint = '/update/:id/:value';
	app.post(mountpoint, handleUpdate);
	app.get(mountpoint, handleUpdate);
}

app.get('/d3/:id', function(req, res) {		// serve D3 chart series for given control :id
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
console.log('Listening on port:', port);


//////////
//
//	Initialize Bitlash
//
var Bitlash = require('./lib/bitlash.js');
var bitlash_options = {
		debug: true, 
		echo: true,
		port: argv.serialport,
		json_callback: broadcastJSONUpdate
}
if (argv.baud) bitlash_options.baud = argv.baud;
var bitlash = new Bitlash.Bitlash(bitlash_options, function (readytext) {
	console.log('Bitlash ready:', readytext);
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

var data_cache = {};		// caches updates per id by time
var log_file = "log/datalog.txt";

function addCache(id, value) {
	if (!data_cache[id]) data_cache[id] = [];	// array of objects: {id:<id>, t:<time>, value:<value>}
	var time = new Date().getTime();
	data_cache[id].push({
		time: time,
		value: value
	});

	if (argv.cache) {
		// Log the record to the JSON-like stream
		var data_record = JSON.stringify({id:id, time:time, value:value}) + '\n';
		fs.appendFile(log_file, data_record, function (err) {
			if (err) console.log('LOG FILE WRITE ERROR:', data_record);
			else {;}
		});
	}
}

function loadCache() {

	// from http://stackoverflow.com/questions/6831918/node-js-read-a-text-file-into-an-array-each-line-an-item-in-the-array
	require('readline').createInterface({
		input: fs.createReadStream(log_file),
		terminal: false
	}).on('line', function(line){
		var entry = JSON.parse(line);
		//console.log('Line:', line, entry);

		// cache only the latest value per entry
		data_cache[entry.id] = [{time:entry.time, value:entry.value}];

		// restore all values to the cache
		//data_cache[entry.id].push({time:entry.time, value:entry.value});

	})
	.on('close', function() {
		console.log('Loaded cache:', data_cache);
	});
}
if (argv.cache) loadCache();


// for heroku,
// per https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
if (heroku) {
	io.configure(function () { 
		io.set("transports", ["xhr-polling"]); 
		io.set("polling duration", 10); 
	});
}
io.set('log level', 1);


//////////
//
//	Send command to Bitlash
//
function executeBitlash(data) {
	console.log('Exec:', data, typeof data, bitlash.ready);
	if (bitlash.ready) {
		bitlash.exec(data.cmd + '\n', function(reply) {
			reply = reply.trim();
			if (reply && reply.length>0) {
				addCache(data.id, reply);
				console.log('sending update:', reply);
				data.value = reply;
				io.sockets.emit('update', data);
			}
		});
	}
	else if (heroku) {
		console.log('Rexec:', data);
		io.sockets.emit('rexec', data);
	}
	else console.log('Bitlash not ready, dropping:', data);
}


//////////
//
//	Set up Socket.io message handlers
//

io.sockets.on('connection', function (socket) {
	console.log('Client connected via', socket.transport);
	socket.on('message', function(data) {
		console.log('Message:', data);
	});
	socket.on('exec', executeBitlash);
	socket.on('rexec', function(data) {
		console.log('rexec:', data);
		executeBitlash(data)
	});
	socket.on('update', function(data) {
		console.log('Update????:', data);
		socket.broadcast.emit('update', data);	// everyone but requester
	});
	socket.on('sync', function(data) {
		var response = [];
		for (var id in data_cache) {
			var datalist = data_cache[id];
			if (datalist.length) response.push({id:id, value:datalist[datalist.length-1].value});
		}
		//console.log('Sync:', response);
		// only to requester
		socket.emit('update', response);
	});
	socket.on('save', function(data) {
		console.log('Save:', data);
		fs.writeFile(panelpath + data[0].id, JSON.stringify(data, null, '\t'));
	});
	socket.on('open', function(data) {
		var controltext;
		try {
			controltext = fs.readFileSync(panelpath + data);
			var controls = JSON.parse(controltext);
			controls[0].id = data;		// set the panel id to the filename
			socket.emit('add', controls);
		}
		catch(e) {
			console.log('Panel not found:', data);
		}
	});
	socket.on('ping', function(data) {
		socket.emit('pong', data);
	});
});

function broadcastJSONUpdate(data) {
	io.sockets.emit('update', data);
}


//////////
//
//	Set up Socket.io client for rexec command
//
//	Required because at present socket.io does not provide server-to-server messaging.
//	Activate with the -x flag.
//
if (argv.rexec) {
	console.log('Starting socket.io client...');
	var ioclient = require('socket.io/node_modules/socket.io-client');

	var clientsocket = new ioclient.connect('http://localhost:' + port);		//Socket('localhost', port);

	clientsocket.on('connect', function () {
		console.log('Socket.io client connected.');
	});

	// A remote Commander, perhaps on the web, without an arduino,
	// can control an arduino on a local Commander, provided they
	// are both connected (-r) to the same socket.io/redis store
	// Here we catch the rexec request and execute it on Bitlash;
	// the reply is distributed over socket.io in the normal way
	//  as an update message.
	//
	clientsocket.on('rexec', function (data) {
		console.log('Incoming Rexec: ', data);
		executeBitlash(data)
	});
}
