//
// bitlash.js: bitlash interface library for node.js
//
//	Copyright 2012-2013 Bill Roy (MIT License, see LICENSE file)
//
var SerialPort = require('serialport').SerialPort;
var shell = require("shelljs");
var fs = require('fs');
var url = require('url');
var request = require('request');

function Bitlash(options, readycallback) {

	this.prompt =  '^> ';		// prompt string we wait for (default Bitlash prompt)
	this.debug = false;
	this.echo = false;
	this.ready = false;
	this.busy = false;
	this.lines = [];		// array of commands to send to target
	this.instream = '';		// input stream buffer
	this.reply = [];		// pending reply
	this.commands = [];
	this.callbacks = [];
	if (readycallback) this.readycallback = readycallback;

	this.init(options || {});
	return this;
}

Bitlash.prototype = {

	init: function(options) {

		for (var o in options) this[o] = options[o];
		this.promptlength = this.prompt.length - 1;	  // -1 for newline eaten by split()

		////////////////////
		//
		//	Networked client?
		//
		if (this.ipclient) {
			this.ready = true;
			if (this.readycallback) this.readycallback('Bitlash IP client at: ' + this.ipclient);
			process.stdout.write('Remote Bitlash at host: ' + this.ipclient + '\n');
			return;
		}

		////////////////////
		//
		// Which serial port?
		//
		var portlist, portname;
		
		if (options.port) portlist = [options.port];
		else if (process.platform === 'darwin') portlist = shell.ls("/dev/tty.usb*");
		else if (process.platform === 'linux') portlist = shell.ls("/dev/ttyUSB*");

		if (portlist.length == 0) {
			process.stdout.write('No serial ports found.\n');
			//process.exit(-1);
		}
		else if (portlist.length > 1) {
			process.stdout.write('Trying first of multiple serial ports:\n' + portlist.join('\n'));
		}
		if (portlist.length > 0) {
			this.portname = portlist[0];
			this.open(options);
		}
	},

	////////////////////
	//
	// Open serial port
	//
	open: function(options) {
		console.log('Connecting to usb serial port:', this.portname);
		try {
			var port = new SerialPort(this.portname, {
				baudrate: options.baud || 57600,
				buffersize: options.buffersize || 20480
			});
		} catch(e) {
			process.stdout.write('Cannot open serial port.');
			process.exit(-2);
		}
		this.serialport = port;
		var self = this;
		this.serialport.on('data', function(data) { self.seriallistener.call(self, data); });

		////////////////////
		//
		// Keyboard / stdin listener
		//
		if (this.kbdin) {
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
	seriallistener: function(data) {
		//if (this.debug) console.log("Data: [" + data + "]");
		if (this.echo) process.stdout.write(data);
		this.instream = '' + this.instream + data.toString();

		for (;;) {		// peel off full lines of input containing JSON
			var m = this.instream.match(/\n/);
			if (!m) break;			// no more full lines
			var first_line = this.instream.slice(0, m.index + 1).trim();
			this.instream = this.instream.slice(m.index + 1);

			//if (this.debug) console.log('Line:', [first_line], [this.instream]);

			if (first_line.match(this.prompt)) {
				this.sendReply();
				first_line = first_line.slice(this.promptlength);
				this.instream = first_line + '\n' + this.instream;	// push back command text
				continue;
			}

			if (first_line.charAt(0) == '{') {			// detect JSON update sent by Bitlash
				var json_payload = JSON.parse(first_line);
				//console.log('JSON upstream:', json_payload);
				if (this.json_callback) this.json_callback(json_payload);
			}
			else this.reply.push(first_line);
		}

		// detect prompt indicating last command is complete
		if (this.instream.match(this.prompt)) {
			this.sendReply();
			this.instream = this.instream.slice(this.promptlength);
		}
	},

	sendReply: function() {
		console.log('Reply:', this.reply);
		if (!this.ready) {		// eat the first prompt match to get synchronized
			this.ready = true;
			if (this.readycallback) this.readycallback(this.reply.join('\n'));
			this.reply = [];
		}
		else if (this.callback) {		// fire the callback
			this.reply.shift()		// trim off the command
			var callback = this.callback;
			delete this.callback;
			console.log('Sending reply:', this.reply);
			callback(this.reply.join('\n'));
			this.reply = [];
		}	

		this.busy = false;
		if (this.commands.length > 0) {		// send queued command
console.log('Dequeue:', this.commands[0]);
			this.exec(this.commands.shift(), this.callbacks.shift());
		}
	},

	exec: function(command, callback) {
		// Network connected client
		if (this.ipclient != undefined) {
			//console.log('Request:', this.ipclient);
			request.post({
				method: 'POST',
				url: this.ipclient,
				body: command
			}, function (error, response, body) {
				//console.log('IP exec return:', command, error, response, body);
				if (error) console.log(error);
				else if (body) {
					console.log('Reply body:', body);
					callback(body);
				}
			});
			//console.log('Request sent.');
			return;
		}

		// USB Serial connected client
		if (this.busy) {	// we're busy; queue it
			console.log('Busy, queueing:', command);
			this.commands.push(command);
			this.callbacks.push(callback);
		}
		else {
			if (callback) this.callback = callback;
			this.busy = true;
			this.serialport.write(command + '\n');
		}
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
