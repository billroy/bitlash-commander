//
// bitlash.js: bitlash interface library for node.js
//
//	Copyright 2012 Bill Roy (MIT License, see LICENSE file)
//
var SerialPort = require('serialport').SerialPort;
var shell = require("shelljs");
var fs = require('fs');
var url = require('url');
var request = require('request');

function Bitlash(options, readycallback) {
	if (readycallback) this.readycallback = readycallback;
	this.init(options || {});
	return this;
}

Bitlash.prototype = {

	debug: false,
	echo: false,
	ready: false,

	init: function(options) {

		for (var o in options) this[o] = options[o];

		////////////////////
		//
		// Which serial port?
		//
		var portlist, portname;
		
		if (options.port) portlist = [options.port];
		else if (process.platform === 'darwin') portlist = shell.ls("/dev/tty.usb*");
		else if (process.platform === 'linux') portlist = shell.ls("/dev/ttyUSB*");

		if (portlist.length == 0) {
			process.stdout.write('No ports found.\n');
			process.exit(-1);
		}
		else if (portlist.length > 1) {
			process.stdout.write('Trying first of multiple ports:\n' + portlist.join('\n'));
		}
		this.portname = portlist[0];
		this.open(options);
	},

	////////////////////
	//
	// Open serial port
	//
	open: function(options) {
		try {
			var port = new SerialPort(this.portname, {
				baudrate: options.baud || 57600,
				buffersize: options.buffersize || 20480
			});
		} catch(e) {
			process.stdout.write('Cannot open serial device.');
			process.exit(-2);
		}
		this.serialport = port;
		var self = this;
		this.serialport.on('data', function(data) { self.seriallistener.call(self, data); });

		////////////////////
		//
		// Keyboard / stdin listener
		//
		if (this.echo) {
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			process.stdin.setRawMode(true);			// pass ^C through to serial port
			process.stdin.on('data', function (data) {	// keyboard input goes to port
				if (data === '\x1d') process.exit(0);	// ^] to quit
				else if (port) self.serialport.write(data);
			});
		}
	},

	////////////////////
	//
	// Serial port listener
	//
	prompt: '\n> ',			// prompt string we wait for (default Bitlash prompt)
	lines: [],				// array of commands to send to target
	instream: '',			// input stream buffer


	seriallistener: function(data) {
		if (this.debug) console.log("Data: [" + data + "]");
		if (this.echo) process.stdout.write(data);
		this.instream = '' + this.instream + data.toString();

		// look for the prompt
		var match = this.instream.match(this.prompt);
		if (match) {
			var reply = this.instream.split('\n');
			if (!this.ready) {		// eat the first prompt match to get synchronized
				this.ready = true;
				if (reply.length) reply.pop();		// trim its trailing prompt
				reply = reply.join('\n');
				if (this.readycallback) this.readycallback(reply);
			}
			else if (this.callback) {		// fire the callback
				if (reply.length >= 2) {
					reply.shift()	// trim command
					reply.pop();	// and prompt
				}
				reply = reply.join('\n');

				var callback = this.callback;
				delete this.callback;
				callback(reply);
			}
			this.instream = '';

			if (0 && this.lines && this.lines.length) {
				var line = this.lines.shift();
				console.log('Line:', line);
				this.serialport.write(line + '\n');		// send the next command
			}
		}
	},

	exec: function(command, callback) {
		if (callback) this.callback = callback;
		this.serialport.write(command + '\n');
	},

	stop: function() {
		this.serialport.write('\x03');
	},

	////////////////////
	//
	// Send file or contents of URL
	//

	lines:[],
	bigreply: [],
	sendfileCallback: undefined,

	nextLine: function(reply) {
		this.bigreply.push(reply);
		if (this.lines.length) {
			var line = this.lines.shift();
			if (this.debug) console.log('Sending:', line);
			var self = this;
			this.exec(line, function(reply) {
				self.nextLine.call(self, reply);
			});
		}
		else {
			if (this.sendfileCallback) {
				var callback = this.sendfileCallback;
				delete this.sendfileCallback;
				callback(this.bigreply.join('\n'));
			}
			this.bigreply = [];
		}
	},

	sendFile: function (filename, callback) {
	
		this.sendfileCallback = callback;
		var self = this;

		if (filename.match(/^http|https\:\/\//)) {
			request(filename, function (error, response, body) {
				if (error || response.statusCode != 200 || !body) {
					console.log('Request error:', error);
					if (response) console.log(response.statusCode);
					if (body) console.log(body.length);
					return;
				}
				self.lines = body.split('\n');
console.log('url fetch:', self.lines);
				self.nextLine('');
			});
		}
		else {		// local file
			var filetext = fs.readFileSync(filename, 'utf8');		// specifying 'utf8' to get a string result
			this.lines = filetext.split('\n');
			this.nextLine('');
		}
	}
}

module.exports.Bitlash = Bitlash;
