//
// svg-controls.js: SVG control library for Bitlash Commander
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

var reply_handler;


//////////
//
//	ControlPanel object
//
function ControlPanel(options) {
	return this.init(options || {});
}

ControlPanel.prototype = {

	init: function(options) {
		this.w = options.w || $(window).width();
		this.h = options.h || $(window).height();
		this.x = options.x || ($(window).width() - this.w)/2;
		this.y = options.y || ($(window).height() - this.h)/2;
		this.color = options.color || 'greenyellow';
		this.fill = options.fill || 'black';
		this.stroke = options.stroke || this.color;
		this.face_corner = options.face_corner || 20;
		this.button_corner = options.button_corner || 10;
		this.control_stroke = options.control_stroke || 3;
		this.title = options.title || 'Bitlash Commander';
		
		this.paper = Raphael(0, 0, $(window).width(), $(window).height());

		this.face = this.paper.rect(this.x, this.y, this.w, this.h, this.face_corner)
			.attr({stroke: this.stroke, fill: this.fill, 'stroke-width': 2 * this.control_stroke});
		
		this.logo = this.paper.text(this.x + (this.w/2), this.y + 50, this.title)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': 36});

		this.controls = {};
		this.next_id = 0;
		this.initSocketIO();
		this.sync();
		return this;
	},

	initSocketIO: function() {
		this.socket = io.connect();
		console.log('Socket connected', this.socket);

		var self = this;
		this.socket.on('reply', function (data) {
			//console.log('Bitlash reply:', data);
			if (reply_handler) {
				var temp_reply_handler = reply_handler;
				reply_handler = undefined;
				temp_reply_handler(data);
			}
		});
		this.socket.on('update', function(data) {
			//console.log('Update:', data.id, data.value,);
			if (typeof data[0] == 'undefined') data = [data];
			for (var i=0; i < data.length; i++) {
				if (self.controls[data[i].id]) self.controls[data[i].id].setValue(data[i].value);
			}
		});
		this.socket.on('pong', function(data) {
			var rtt = new Date().getTime() - data.timestamp;
			window.status = 'RTT: ' + rtt + 'ms';
		});
		this.socket.on('disconnect', function (data) {
			//connection_indicator.attr({stroke: 'darkgreen', fill: 'darkgreen'});		
			window.setTimeout(initSocketIO, 200);
		});

		if (0) window.setInterval(function() {
			self.socket.emit('ping', {'timestamp': new Date().getTime()});
		}, 10000);
	},
	
	sync: function() {
		this.socket.emit('sync', {});
	},

	addButton: function(options) {
		options.parent = this;
		var button = new Button(options);
		//button.parent = this;
		this.controls[button.id] = button;
		return this;
	},

	addSlider: function(options) {
		options.parent = this;
		var slider = new Slider(options);
		//slider.parent = this;
		this.controls[slider.id] = slider;
		return this;
	}
}


//////////
//
//	Button control
//
function Button(options) {
	return this.init(options || {});
}

Button.prototype = {

	init: function(options) {
		this.parent = options.parent;
		this.id = options.id || 'Button' + this.parent.next_id++;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 125;
		this.h = options.h || 50;
		this.text = options.text || 'Untitled';
		this.script = options.script || '';
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || 'white';
		this.stroke = options.stroke || this.parent.color;
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.replies = [];
		this.times = [];
		this.repeat = options.repeat || 0;
		this.running = 0;
		this.corner = options.corner || this.parent.button_corner;
		this.shape = options.shape || '';	// default to rectangle
		this.r = options.r || undefined;

		var self = this;

		if (this.shape == 'circle') {
			this.elt = this.parent.paper.circle(this.x, this.y, this.r)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});});

		this.label = this.parent.paper.text(this.x, this.y, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
			.mouseup(function(e) { self.elt.attr({fill:self.fill});});
		} 
		else {	
			this.elt = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.corner)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});});

		this.label = this.parent.paper.text(this.x + (this.w/2), this.y + (this.h/2), this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
			.mouseup(function(e) { self.elt.attr({fill:self.fill});});	
		}


		return this;
	},

	handleClick: function(e) {
		if (this.repeat) {
			if (this.running) {
				this.running = false;
				clearInterval(this.intervalid);
				delete this.intervalid;
			} else {
				this.running = true;
				this.exec();
			}
		}
		else this.exec();
		e.preventDefault();
		e.stopPropagation();
		return false;
	},

	exec: function() {
		var cmd = Mustache.render(this.script, this);
		console.log('button exec:', cmd);
		this.parent.socket.emit('exec', {'cmd': cmd, 'id':this.id});
		var self = this;
		reply_handler = function(reply) { self.handleReply.call(self, reply); };
		if (this.repeat && !this.intervalid) {
			var self = this;
			this.intervalid = setInterval(function() { self.exec.call(self, {}); }, this.repeat);
		}
	},

	handleReply: function(reply) {
		if (reply === undefined) return;
		this.reply = reply.trim();
		if (this.reply.length == 0) return;
		this.setValue(this.reply);
		this.parent.socket.emit('update', {id: this.id, value: this.value});
	},
	
	setValue: function(value) {
		this.value = value;
		this.replies.push(this.value);
		this.times.push(new Date().getTime());
		this.label.attr({text: this.text + ': ' + this.value});
	}		
}


//////////
//
//	Slider control
//
function Slider(options) {
	return this.init(options || {});
}

Slider.prototype = {

	init: function(options) {
		this.parent = options.parent;
		this.id = options.id || 'Slider' + this.parent.next_id++;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 80;
		this.h = options.h || 200;
		this.text = options.text || 'Untitled';
		this.script = options.script || '';
		this.fill = options.fill || this.parent.fill;
		this.fill_highlight = options.fill_highlight || 'white';
		this.stroke = options.stroke || this.parent.color;
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.replies = [];
		this.times = [];

		this.min = options.min || 0;
		this.max = options.max || 255;
		this.value = options.value || this.min;

		this.slidew = .8 * this.w;
		this.slideh = options.slideh || 1+Math.floor(this.h / 12);

		this.barw = options.barw || 1;	//1+Math.floor(this.w / 16);
		this.barh = this.h;

		var self = this;

		this.outerrect = this.parent.paper.rect(this.x, this.y, this.w, this.h + this.slideh, 10)
			.attr({fill:this.fill, stroke:this.stroke, 'stroke-width':this.parent.control_stroke});

		this.bar = this.parent.paper.rect(this.x + (this.w-this.barw)/2, this.y, this.barw, this.barh + this.slideh)
			.attr({fill:this.stroke, stroke:this.stroke})
			.click(function(e) {
				console.log('bar click:', e);
			});

		this.slide = this.parent.paper.rect(this.x + (this.w - this.slidew)/2, this.slideYPos(), this.slidew, this.slideh, 5)
			.attr({fill:this.stroke, stroke:this.stroke, 'stroke-width': this['stroke-width']})
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.slideh + this.fontsize*2, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize});

		this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.slideh + this.fontsize, ''+this.value)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2});

		return this;
	},

	dragStart: function(x, y, event) {
		//this.dragy = y;
	},

	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e)
		if (y < this.y) y = this.y;
		else if (y > this.y + this.h) y = this.y + this.h;
		var fraction = (y - this.y) / this.h;
		var value = Math.floor(this.min + (1.0 - fraction) * (this.max - this.min));
		this.setValue(value);
		this.dragEnd(e);
	},

	dragEnd: function(e) {
		e.preventDefault();
		e.stopPropagation();
		var cmd = Mustache.render(this.script, this);
		//console.log('slider exec:', cmd);
		this.parent.socket.emit('exec', {'cmd': cmd, 'id':this.id});
		var self = this;
		reply_handler = function(reply) { self.handleReply.call(self, reply); };
		return true;
	},

	slideYPos: function() {
		if (this.value < this.min) this.value = this.min;
		if (this.value > this.max) this.value = this.max;
		var fraction = (this.value - this.min) / (this.max - this.min);
		return Math.floor(this.y + this.h * (1.0 - fraction));
	},

	handleReply: function(reply) {		// reply is ignored for slider
		//if (reply === undefined) return;
		//this.reply = reply.trim();
		//if (this.reply.length == 0) return;
		//this.setValue();
		this.parent.socket.emit('update', {id: this.id, value: this.value});
	},
	
	setValue: function(value) {
		this.value = value;
		this.replies.push(this.value);
		this.times.push(new Date().getTime());
		this.readout.attr({text: ''+this.value});
		var slidey = this.slideYPos();
		this.slide.attr({y:slidey});
	}		
}
