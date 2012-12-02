//
// svg-controls.js: SVG control library for Bitlash Commander
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

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
		this.channel = options.channel || '';

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

	attr: function(attrs) {
		this.face.attr(attrs);
		//this.logo.attr(attrs);
		for (var id in this.controls) this.controls[id].attr(attrs);
		return this;
	},

	initSocketIO: function() {
		this.socket = io.connect();
		console.log('Socket connected', this.socket);

		var self = this;
		this.socket.on('reply', function (data) {
			console.log('Bitlash reply???:', data);
//			var reply_handler = self.reply_handlers.pop();
//			if (reply_handler) reply_handler(data);
		});
		this.socket.on('update', function(data) {
			//console.log('Update:', data);
			if (typeof data[0] == 'undefined') data = [data];
			for (var i=0; i < data.length; i++) {
				if (self.controls[data[i].id]) self.controls[data[i].id].setValue(data[i].value);
			}
		});
		this.socket.on('rexec', function(data) {
			console.log('rexec:', data);
			//self.sendCommand('exec', data);		// ugly kludge, fixing...
		});
		this.socket.on('pong', function(data) {
			var rtt = new Date().getTime() - data.timestamp;
			window.status = 'RTT: ' + rtt + 'ms';
		});
		this.socket.on('disconnect', function (data) {
			console.log('Socket Disconnected:', data);
			//connection_indicator.attr({stroke: 'darkgreen', fill: 'darkgreen'});		
			window.setTimeout(self.initSocketIO, 200);
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
		this.controls[button.id] = button;
		if (button.autorun) button.handleClick();
		return button;
	},

	addSlider: function(options) {
		options.parent = this;
		var slider = new Slider(options);
		this.controls[slider.id] = slider;
		return slider;
	},

	addChart: function(options) {
		options.parent = this;
		var chart = new Chart(options);
		this.controls[chart.id] = chart;
		if (chart.autorun) chart.handleClick();
		return chart;
	},

	sendCommand: function(command, data, reply_handler) {
		this.socket.emit(command, data);
	},

	sendUpdate: function(command, data) {
		this.socket.emit(command, data);
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
		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
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
		this.repeat = options.repeat || 0;
		this.running = 0;
		this.corner = options.corner || this.parent.button_corner;
		this.shape = options.shape || '';	// default to rectangle
		this.r = options.r || this.w/2;
		this.autorun = options.autorun || false;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

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
		else {		// default rectangular button
			this.elt = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.corner)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});});

			//$(this.elt).node.bind('contextmenu', function(e){
			//    alert('right click');
			//});

			this.label = this.parent.paper.text(this.x + (this.w/2), this.y + (this.h/2), this.text)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});});	
		}

		return this;
	},
	
	attr: function(attrs) {
		this.elt.attr(attrs);
		//this.label.attr(attrs);
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

		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	},

	exec: function() {
		if (!this.script) {
			this.setValue(!this.value);		// unscripted buttons toggle and gossip
			return;
		}
		var cmd = Mustache.render(this.script, this);
		console.log('button exec:', cmd);
		var self = this;
		var reply_handler = function(reply) { self.handleReply.call(self, reply); };
		this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);

		if (this.repeat && !this.intervalid) {
			var self = this;
			this.intervalid = setInterval(function() { self.exec.call(self, {}); }, this.repeat);
		}
	},

/*
	handleReply: function(reply) {
		console.log("UNEXPECTED REPLY");
		if (reply === undefined) return;
		this.reply = reply.trim();
		if (this.reply.length == 0) return;
		this.setValue(this.reply);
		var update = {id: this.id, value: this.value};
		this.parent.sendUpdate('update', update);
		this.fire('update', update);
	},
*/
	
	setValue: function(value) {
		this.value = value;
		this.label.attr({text: this.text + ': ' + this.value});
		var update = {id: this.id, value: this.value};
		this.fire('update', update);
	},

	on: function(eventname, listener) {
		if (!this.listeners[eventname]) this.listeners[eventname] = [];
		this.listeners[eventname].push(listener);
		//console.log('On:', this.id, this.listeners.length, this.listeners);
	},

	fire: function(eventname, data) {
		var listeners = this.listeners[eventname];
		//console.log('listeners:', listeners);
		if (!listeners) return;
		for (var i=0; i<listeners.length; i++) {
			var func = listeners[i];
			//console.log('firing listener', i, data);
			func(data);
		}
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
		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
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

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

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

	attr: function(attrs) {
		this.outerrect.attr(attrs);
		this.bar.attr(attrs);
		this.slide.attr(attrs);
		this.label.attr(attrs);
		this.readout.attr(attrs);
	},

	dragStart: function(x, y, event) {
		this.dragging = true;
		this.slide.attr({fill:this.fill_highlight});
	},

	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e)
		if (y < this.y) y = this.y;
		else if (y > this.y + this.h) y = this.y + this.h;
		var fraction = (y - this.y) / this.h;
		var value = Math.floor(this.min + (1.0 - fraction) * (this.max - this.min));
		this.setValue(value);
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		this.slide.attr({fill:this.stroke});
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		this.dragging = false;
		this.exec();
		return false;
	},

	exec: function() {
		if (!this.script) return;
		var cmd = Mustache.render(this.script, this);
		console.log('button exec:', cmd);
		var self = this;
		reply_handler = function(reply) { self.handleReply.call(self, reply); };
		this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);
	},

	slideYPos: function() {
		if (this.value < this.min) this.value = this.min;
		if (this.value > this.max) this.value = this.max;
		var fraction = (this.value - this.min) / (this.max - this.min);
		return Math.floor(this.y + this.h * (1.0 - fraction));
	},

//	handleReply: function(reply) {		// reply is ignored for slider
//		this.parent.sendUpdate('update', {id: this.id, value: this.value});
//	},

	setValue: function(value) {
		if (this.dragging) return;	// be the boss: ignore updates while dragging
		this.value = value;
		this.readout.attr({text: ''+this.value});
		var slidey = this.slideYPos();
		this.slide.attr({y:slidey});
		var update = {id: this.id, value: this.value};
		this.fire('update', update);
	},

	on: function(eventname, listener) {
		if (!this.listeners[eventname]) this.listeners[eventname] = [];
		this.listeners[eventname].push(listener);
	},

	fire: function(eventname, data) {
		var listeners = this.listeners[eventname];
		if (!listeners) return;
		for (var i=0; i<listeners.length; i++) {
			var func = listeners[i];
			func(data);
		}
	}	
}


//////////
//
//	Chart control
//
function Chart(options) {
	return this.init(options || {});
}

Chart.prototype = {

	init: function(options) {
		this.parent = options.parent;
		this.id = options.id || 'Chart' + this.parent.next_id++;
		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 300;
		this.h = options.h || 150;
		this.text = options.text || 'Untitled';
		this.script = options.script || '';
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || 'white';
		this.stroke = options.stroke || this.parent.color;
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.repeat = options.repeat || 0;
		this.running = 0;
		this.corner = options.corner || this.parent.Chart_corner;
		this.shape = options.shape || '';	// default to rectangle
		this.r = options.r || this.w/2;
		this.autorun = options.autorun || false;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		this.ticks = options.ticks || 5;
		this.target = options.target || this.id;
		this.refresh = options.refresh || 0;
		this.render();		// render D3 chart
		
		var self = this;
		if (this.refresh) setInterval(function() { self.redraw.call(self); }, this.refresh);
		return this;
	},
	
	render: function() {

		var margin = {top: 0, right: 0, bottom: 0, left: 0};
		var width = this.w - margin.left - margin.right;
		var height = this.h - margin.top - margin.bottom;

		var x = d3.scale.linear().range([0, width]);
		var y = d3.scale.linear().range([height, 0]);
		var color = d3.scale.category10();
		var xAxis = d3.svg.axis().scale(x).ticks(this.ticks).orient('bottom');
		var yAxis = d3.svg.axis().scale(y).ticks(this.ticks).orient('left');

		var line = d3.svg.line().interpolate('basis')
				.x(function(d) { return x(d.time); })
				.y(function(d) { return y(d.value); });

		var self = this;
		this.outerrect = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.parent.button_corner)
			.attr({fill: this.fill, stroke: this.stroke, 'stroke-width':this.parent.control_stroke})
			.click(function() { self.redraw(); });

		this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.fontsize*2, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function() { self.redraw(); });

		this.svg = d3.select(this.parent.paper.canvas).append('g')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', 'translate(' + (this.x+margin.left) + ',' + (this.y+margin.top) + ')');

		d3.json('d3/' + this.target, function(data) {

			// console.log('d3:', typeof data, data);

			color.domain(d3.keys(data[0]).filter(function(key) { return key !== 'time'; }));
			var values = color.domain().map(function(name) {
				return {
					name: name,
					values: data.map(function(d) {
						return {time: d.time, value: +d[name]};
					})
				};
			});
		
			x.domain(d3.extent(data, function(d) { return d.time; }));
			y.domain([
				d3.min(values, function(c) { return d3.min(c.values, function(v) { return v.value; }); }),
				d3.max(values, function(c) { return d3.max(c.values, function(v) { return v.value; }); })
			]);
		
			self.svg.append('g')
					.attr('class', 'x axis')
					.attr('transform', 'translate(0,' + height + ')')
					.attr('stroke', self.stroke)
					.attr('fill', self.stroke)
					.call(xAxis);
		
			self.svg.append('g')
					.attr('class', 'y axis')
					.attr('stroke', self.stroke)
					.attr('fill', self.stroke)
					.call(yAxis)
/* y axis label
				.append('text')
					.attr('transform', 'rotate(-90)')
					.attr('y', 6)
					.attr('dy', '.71em')
					.style('text-anchor', 'end')
					.attr('stroke', self.stroke)
					.attr('fill', self.stroke)
					.text(' ');
*/		
			var value = self.svg.selectAll('.value')
					.data(values)
				.enter().append('g')
					.attr('class', 'value');
		
			value.append('path')
					.attr('class', 'line')
					.attr('d', function(d) { return line(d.values); })
					.style('stroke', function(d) { return color(d.name); })
					.style('stroke-width', self['stroke-width']);
		
			value.append('text')
					.datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
					.attr('transform', function(d) { return 'translate(' + x(d.value.time) + ',' + y(d.value.value) + ')'; })
					.attr('x', 3)
					.attr('dy', '.35em')
					.attr('stroke', self.stroke)
					.attr('fill', self.stroke)
					.text(function(d) { return d.name; });
		});
	},

	redraw: function() {
		if (this.svg) {
			var doomed_svg = this.svg;
			delete this.svg;
			this.render();
			doomed_svg.remove();
		}
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

		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	},

	exec: function() {
		if (!this.script) {
			return;
		}
		var cmd = Mustache.render(this.script, this);
		console.log('Chart exec:', cmd);
		var self = this;
		var reply_handler = function(reply) { self.handleReply.call(self, reply); };
		this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);

		if (this.repeat && !this.intervalid) {
			var self = this;
			this.intervalid = setInterval(function() { self.exec.call(self, {}); }, this.repeat);
		}
	},

/*
	handleReply: function(reply) {
		console.log("UNEXPECTED REPLY");
		if (reply === undefined) return;
		this.reply = reply.trim();
		if (this.reply.length == 0) return;
		this.setValue(this.reply);
		var update = {id: this.id, value: this.value};
		this.parent.sendUpdate('update', update);
		this.fire('update', update);
	},
*/
	
	setValue: function(value) {
		this.value = value;
		//this.label.attr({text: this.text + ': ' + this.value});
		var update = {id: this.id, value: this.value};
		this.fire('update', update);
	},

	on: function(eventname, listener) {
		if (!this.listeners[eventname]) this.listeners[eventname] = [];
		this.listeners[eventname].push(listener);
		//console.log('On:', this.id, this.listeners.length, this.listeners);
	},

	fire: function(eventname, data) {
		var listeners = this.listeners[eventname];
		//console.log('listeners:', listeners);
		if (!listeners) return;
		for (var i=0; i<listeners.length; i++) {
			var func = listeners[i];
			//console.log('firing listener', i, data);
			func(data);
		}
	}	
}
