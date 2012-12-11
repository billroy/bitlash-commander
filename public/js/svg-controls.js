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
		this.id = options.id || options.title || 'Panel';
		this.w = options.w || $(window).width();
		this.h = options.h || $(window).height();
		this.x = options.x || ($(window).width() - this.w)/2;
		this.y = options.y || ($(window).height() - this.h)/2;
		this.tx = options.tx || this.x + (this.w/2);
		this.ty = options.ty || this.y + 50;
		this.color = options.color || 'greenyellow';
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || 'white';
		this.stroke = options.stroke || this.color;
		this.face_corner = options.face_corner || 20;
		this.button_corner = options.button_corner || 10;
		this.control_stroke = options.control_stroke || 3;
		this.title = options.title || 'Bitlash Commander';
		this.channel = options.channel || '';

		this.paper = Raphael(0, 0, $(window).width(), $(window).height());

		this.face = this.paper.rect(this.x, this.y, this.w, this.h, this.face_corner)
			.attr({stroke: this.stroke, fill: this.fill, 'stroke-width': 2 * this.control_stroke});
console.log('tx:', this.tx);

		this.logo = this.paper.text(this.tx, this.ty, this.title)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': 36});

		this.controls = {};
		this.next_id = 0;
		this.editing = false;
		this.next_x = 100;
		this.next_y = 100;
		this.next_inc = 50;

		this.initSocketIO();
		this.initContextMenu();
		this.sync();

		var self = this;
		this.editbutton = this.paper.path('M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z')
			.transform('T25,25')
			.attr({fill:this.fill, stroke: this.stroke})
			.click(function(e) { 
				self.editingpanel = !self.editingpanel;
				if (self.editingpanel) self.editbutton.attr({fill:self.stroke, stroke:self.stroke});
				else self.editbutton.attr({fill:self.fill, stroke: self.stroke});
			});

		// one-time initialization for editor buttons
		$('#editsave').click(function() { console.log('save!'); self.endEdit(1); });
		$('#editcancel').click(function() { self.endEdit(0); });
		$('#editadd').click(function() { self.editAddField(); });
		$('#editdelete').click(function() { self.editDeleteField(); });

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
		this.socket.on('update', function(data) {
			//console.log('Update:', data);
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
			console.log('Socket Disconnected:', data);
			//connection_indicator.attr({stroke: 'darkgreen', fill: 'darkgreen'});		
			window.setTimeout(self.initSocketIO, 200);
		});

		if (0) window.setInterval(function() {
			self.socket.emit('ping', {'timestamp': new Date().getTime()});
		}, 10000);
	},

	initContextMenu: function() {
		var self = this;
		$.contextMenu({
			selector: '#contextmenu',
			trigger: 'left',
			zIndex:99999,
			callback: function(key, options) {
				if (key == 'addbutton') self.addButton({});
				else if (key == 'addslider') self.addSlider({});
				else if (key == 'addchart') self.addChart({});
			},
			items: {
				'new': 		 {name: 'New Panel', 	icon: 'new'},
				'sep1': 	 '---------',
				'addbutton': {name: 'New Button', 	icon: 'addbutton'},
				'addslider': {name: 'New Slider', 	icon: 'addslider'},
				'addchart':  {name: 'New Chart', 	icon: 'addchart'},
				'sep2': 	 '---------',
				'open': 	 {name: 'Open Panel', 	icon: 'open'},
				'save': 	 {name: 'Save Panel', 	icon: 'save'}
			}
		});

		this.face.click(function(e) {
			if (self.editingpanel) {
				$('#contextmenu').contextMenu({x: e.clientX, y: e.clientY});
			}
			e.preventDefault();
			e.stopPropagation();
			return false;
		});

		$.contextMenu({
			selector: '#editmenu',
			trigger: 'left',
			zIndex:99999,
			callback: function(key, options) {
				if (key == 'edit') {self.edit(self.menuowner);}
				else if (key == 'duplicate') {self.duplicate(self.menuowner);}
				else if (key == 'delete') {self.deletecontrol(self.menuowner);}
			},
			items: {
				'edit': 		{name: 'Edit...', 	icon: 'edit'},
				'duplicate':	{name: 'Duplicate', icon: 'duplicate'},
				'sep1': 		'---------',
				'delete': 		{name: 'Delete', 	icon: 'delete'}
			}
		});

	},

	showEditMenu: function(id) {
		this.menuowner = id;
		var it = this.controls[id];
		$('#editmenu').contextMenu({x: it.x + it.w/2, y: it.y + it.h/2});
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
		options.type = 'Slider';
		var slider = new Slider(options);
		this.controls[slider.id] = slider;
		return slider;
	},

	addChart: function(options) {
		options.parent = this;
		options.type = 'Chart';
		var chart = new Chart(options);
		this.controls[chart.id] = chart;
		if (chart.autorun) chart.handleClick();
		return chart;
	},
	
	add: function(items) {		// add an array of items to the panel
		for (var i=0; i < items.length; i++) {
console.log('Add:', items[i]);
			if (items[i].type == 'Button') this.addButton(items[i]);
			else if (items[i].type == 'Slider') this.addSlider(items[i]);
			else if (items[i].type == 'Chart') this.addChart(items[i]);
			else if (items[i].type == 'Panel') {;}
			else console.log('Unknown type in Add:', items[i]);
		}
	},

	sendCommand: function(command, data, reply_handler) {
		this.socket.emit(command, data);
	},

	sendUpdate: function(command, data) {
		this.socket.emit(command, data);
	},
	
	lighter: function(color) {
		var rgb = Raphael.getRGB(color);
		var hsb = Raphael.rgb2hsb(rgb.r, rgb.g, rgb.b);
		var newb = Math.min(1, hsb.b*2);
		return Raphael.hsb2rgb(hsb.h, hsb.s, newb).hex;
	},
	
	edit: function(id) {

		var editor = $('#editor').css('background-color', 'white')
			.css('zIndex', 9999)
			.css('position', 'absolute')
			//.css('width', '50%')
			.css({left: this.controls[id].x, top: this.controls[id].y});

		var data = this.controlToEditFormat(id);
 		this.edittable = $('#dataTable').handsontable({
			data: data,
			startRows: data.length,
			startCols: 2,
			colHeaders: ['PROPERTY', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;VALUE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;']
		});

		for (var r=0; r<data.length; r++) {		// disallow edit of field names and id field value
			$('#dataTable').handsontable('setCellReadOnly', r, 0);
			if (data[r][0] == 'id') $('#dataTable').handsontable('setCellReadOnly', r, 1);
		}

		this.editingcontrol = id;
		console.log('edit table object:', this.edittable);
	},
	
	endEdit: function(save) {
		var opts = {};
		if (save) {
			var data = 	$('#dataTable').handsontable('getData');
			//console.log('endedit:', save, data);
			for (var i=0; i < data.length; i++) {
				opts[data[i][0]] = data[i][1];
			}
			console.log('Saving:', opts);
			this.controls[opts.id].delete();
			this.add([opts]);
			this.saveControls();
		}
		$('#dataTable').handsontable('destroy');
		$('#editor').css('zIndex', 0);
		delete this.editingcontrol;
	},
	
	saveControls: function() {
		this.socket.emit('save', this.panelToStorageFormat());
	},
	
	editAddField: function() {
		var id = this.editingcontrol;
		console.log('addfield:', id);
		var newfield = prompt('New field name:');
		if (!newfield) return;
		var newvalue = prompt('Value for new field:');
		this.controls[id].options[newfield] = newvalue;
		this.endEdit(0);
		this.edit(id);
	},
	
	editDeleteField: function() {
		var id = this.editingcontrol;
		console.log('addfield:', id);
		var doomedfield = prompt('Field to delete:');
		if (!doomedfield) return;
		if (this.controls[id].options.hasOwnProperty(doomedfield))
			delete this.controls[id].options[doomedfield];
		this.endEdit(0);
		this.edit(id);
	},
	
	duplicate: function(id) {
		var newopts = {};
		for (var f in this.controls[id].options) {
			newopts[f] = this.controls[id].options[f];
		}
		this.add([newopts]);
	},
	
	deletecontrol: function(id) {
		this.controls[id].delete();
		delete this.controls[id];	
	},


	inheritOption: function(id, opt) {
		if (!this.controls[id].options.hasOwnProperty(opt))
			this.controls[id].options[opt] = this.controls[id][opt];
	},

	controlToEditFormat: function(id) {
		var data = [];

		// force some fields to be in the edit list, even if not originally specified
		this.inheritOption(id, 'id');
		this.inheritOption(id, 'x');
		this.inheritOption(id, 'y');
		
		//if (!this.controls[id].options.hasOwnProperty('id'))
		//	this.controls[id].options['id'] = id;

		for (var f in this.controls[id].options) {				// for properties in original options
			if (this.controls[id].options.hasOwnProperty(f)
				&& (typeof this.controls[id][f] != 'object')
				&& (typeof this.controls[id][f] != 'function')) {		// push current object value
				data.push([f, this.controls[id][f] || this.controls[id].options[f]]);
			}
		}
		console.log('controlToEdit:', id, data);
		return data;
	},

	controlToStorageFormat: function(id) {
		var data = {};

		//if (!this.controls[id].options) return;

		// force the id to be in the storage list, even if it wasn't specified
		if (!(this.controls[id].options.hasOwnProperty('id')))

			this.controls[id].options['id'] = id;

		for (var f in this.controls[id].options) {				// for properties in original options
			if (this.controls[id].options.hasOwnProperty(f)
				&& (typeof this.controls[id][f] != 'object')
				&& (typeof this.controls[id][f] != 'function')) {		// push current object value
				//data.push([f, this.controls[id][f]]);
				data[f] = this.controls[id][f];
			}
		}
		//console.log('controlToStorage:', id, typeof this.controls[id], data);
		return data;
	},

	panelToStorageFormat: function() {
		var data = [];
		data.push({type: 'Panel', id: this.id});
		for (var id in this.controls) {
			data.push(this.controlToStorageFormat(id));
		}
		//console.log('Controls.ToStorage:', data);
		return data;
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
		this.type = options.type = 'Button';
		this.parent = options.parent;

		this.options = {};
		for (var o in options) this.options[o] = options[o];

		if (options.id) this.id = options.id;
		else if (options.text && !this.parent.controls[options.text]) this.id = options.text;
		else this.id = this.type + this.parent.next_id++;

		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 125;
		this.h = options.h || 50;
		this.text = options.text || 'Untitled';
		this.noreadout = options.noreadout || false;
		this.script = options.script || '';
		this.stroke = options.stroke || this.parent.color;
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || this.parent.lighter(this.stroke);
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.repeat = options.repeat || 0;
		this.running = 0;
		this.corner = options.corner || this.parent.button_corner;
		this.shape = options.shape || '';	// default to rectangle
		this.r = options.r || this.w/2;
		this.autorun = options.autorun || false;
		this.value = options.value || 0;
		this.path = options.path || undefined;
		this.scale = options.scale || 1;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		var self = this;

		if (this.shape == 'circle') {
			this.elt = this.parent.paper.circle(this.x, this.y, this.r)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			this.label = this.parent.paper.text(this.x + (this.w/2), this.y + 2*this.r + this.fontsize, this.text)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			if (!this.noreadout) this.readout = this.parent.paper.text(this.x, this.y, this.value)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
		}
		else if (this.shape == 'path') {	// path button
			var translation = ['t', this.x, ',', this.y, 's', this.scale].join('');
			//var translation = ['T600,600'].join('');
console.log('Path:', translation, this.x, this.y, this.scale);

			this.elt = this.parent.paper.path(this.path)
				.transform(translation)
				//.scale(this.scale)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			var bbox = this.elt.getBBox();
			this.w = bbox.width;
			this.h = bbox.height;
			var labely = bbox.y + this.h + this.fontsize;

			this.label = this.parent.paper.text(this.x, labely, this.text)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			if (!this.noreadout) this.readout = this.parent.paper.text(this.x, this.y, this.value)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
		}
		else {		// default rectangular button
			this.elt = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.corner)
				.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			//this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.fontsize, this.text)
			this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h/2, this.text)
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
				.click(function(e) { return self.handleClick.call(self, e); })
				.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			//if (!this.noreadout) this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + this.h/2, ''+this.value)
			if (!this.noreadout) this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.fontsize, '')
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
				.click(function(e) { return self.handleClick.call(self, e); })
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
		}

		return this;
	},

	delete: function() {
		this.elt.remove();
		this.label.remove();
		if (this.readout) this.readout.remove();
	},
	
	attr: function(attrs) {
		this.elt.attr(attrs);

		var textattrs = {};
		for (var f in attrs) textattrs[f] = attrs[f];
		if (textattrs.stroke) textattrs.fill=attrs.stroke;
		this.label.attr(textattrs);
		if (this.readout) this.readout.attr(textattrs);
	},

	dragStart: function(x, y, event) {
		console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		this.elt.attr({fill:this.fill_highlight}).toFront();
		if (this.readout) this.readout.toFront();
		this.label.toFront();
	},

	dragMove: function(dx, dy, x, y, e) {
		console.log('move:',dx,dy,x,y,e);
		this.x = this.drag.x + dx;
		this.y = this.drag.y + dy;
		if (this.shape == 'circle') {
			this.elt.attr({cx:x-this.drag.xoff, cy:y-this.drag.yoff});
			this.label.attr({cx:x-this.drag.xoff, cy:y-this.drag.yoff});		//??
			if (this.readout) this.readout.attr({x:x-this.drag.xoff, y:y-this.drag.yoff});
		}
		else if (this.shape == 'path') {
			var bbox = this.elt.getBBox();
			this.elt.transform(['t', this.x-this.drag.xoff, ',', this.y-this.drag.yoff, 's', this.scale].join(''));
			var labely = bbox.y + this.h + this.fontsize;
			this.label.attr({x:x-this.drag.xoff, y:labely - this.drag.yoff});
			if (this.readout) this.readout.attr({x:x-this.drag.xoff , y:y-this.drag.yoff});
		}
		else {
			this.elt.attr({x:x-this.drag.xoff, y:y-this.drag.yoff});
			this.label.attr({x:x-this.drag.xoff + this.w/2, y:y-this.drag.yoff + this.h + this.fontsize});
			if (this.readout) this.readout.attr({x:x-this.drag.xoff + this.w/2, y:y-this.drag.yoff + this.h/2});
		}
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		this.elt.attr({fill:this.fill});
		delete this.drag;
		this.dragging = false;
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	},

	handleClick: function(e) {
		if (this.repeat) {
			if (this.running) {
				this.running = false;
				clearInterval(this.intervalid);
				delete this.intervalid;
				this.runningindicator.remove();
				delete this.runningindicator;
			} else {
				this.running = true;
				var translation = ['t', this.x, ',', this.y, 's', .75].join('');

				this.runningindicator = this.parent.paper.path('M19.275,3.849l1.695,8.56l1.875-1.642c2.311,3.59,1.72,8.415-1.584,11.317c-2.24,1.96-5.186,2.57-7.875,1.908l-0.84,3.396c3.75,0.931,7.891,0.066,11.02-2.672c4.768-4.173,5.521-11.219,1.94-16.279l2.028-1.775L19.275,3.849zM8.154,20.232c-2.312-3.589-1.721-8.416,1.582-11.317c2.239-1.959,5.186-2.572,7.875-1.909l0.842-3.398c-3.752-0.93-7.893-0.067-11.022,2.672c-4.765,4.174-5.519,11.223-1.939,16.283l-2.026,1.772l8.26,2.812l-1.693-8.559L8.154,20.232z')
					.transform(translation)
					.attr({fill:this.stroke, stroke: this.stroke})
					.click(function(e) { 
//						self.addButton({x:self.next_x+=self.next_inc, y:self.next_y+=self.next_inc});
					});
					
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
		//console.log('button exec:', cmd);

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			var self = this;
			var reply_handler = function(reply) { self.handleReply.call(self, reply); };
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);
		}
		if (this.repeat && !this.intervalid) {
			var self = this;
			this.intervalid = setInterval(function() { self.exec.call(self, {}); }, this.repeat);
		}
	},
	
	setValue: function(value) {
		this.value = value;
		//this.label.attr({text: this.text + ': ' + this.value});
		if (this.readout) this.readout.attr({text: '' + this.value});
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
		this.type = options.type = 'Slider';
		this.parent = options.parent;

		this.options = {};
		for (var o in options) this.options[o] = options[o];

		if (options.id) this.id = options.id;
		else if (options.text && !this.parent.controls[options.text]) this.id = options.text;
		else this.id = this.type + this.parent.next_id++;

		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 80;
		this.h = options.h || 200;
		this.text = options.text || 'Untitled';
		this.noreadout = options.noreadout || false;
		this.script = options.script || '';
		this.stroke = options.stroke || this.parent.color;
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || 'white';	// this.parent.lighter(this.stroke);
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		this.min = options.min || 0;
		this.max = options.max || 255;
		this.value = options.value || this.min;

		this.slidew = .8 * this.w;
		this.slideh = options.slideh || 1+Math.floor(this.h / 10);

		this.barw = options.barw || 1;	//1+Math.floor(this.w / 16);
		this.barh = this.h;

		var self = this;

		this.outerrect = this.parent.paper.rect(this.x, this.y, this.w, this.h + this.slideh, 10)
			.attr({fill:this.fill, stroke:this.stroke, 'stroke-width':this.parent.control_stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		this.bar = this.parent.paper.rect(this.x + (this.w-this.barw)/2, this.y, this.barw, this.barh + this.slideh)
			.attr({fill:this.stroke, stroke:this.stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		this.slide = this.parent.paper.rect(this.x + (this.w - this.slidew)/2, this.slideYPos(), this.slidew, this.slideh, 5)
			.attr({fill:this.stroke, stroke:this.stroke, 'stroke-width': this['stroke-width']})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.slideMove, this.slideStart, this.slideEnd, this, this, this);

		this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.slideh + this.fontsize*2, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (!this.noreadout) this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.slideh + this.fontsize, ''+this.value)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		return this;
	},

	delete: function() {
		this.outerrect.remove();
		this.bar.remove();
		this.slide.remove();
		this.label.remove();
		if (this.readout) this.readout.remove();
	},
	

	attr: function(attrs) {
		this.outerrect.attr(attrs);
		this.bar.attr(attrs);
		this.slide.attr(attrs);

		var textattrs = {};
		for (var f in attrs) textattrs[f] = attrs[f];
		if (textattrs.stroke) textattrs.fill=attrs.stroke;
		this.label.attr(textattrs);
		if (this.readout) this.readout.attr(textattrs);
	},

	dragStart: function(x, y, event) {
console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		this.outerrect.attr({fill:this.fill_highlight}).toFront();
		this.bar.toFront();
		this.slide.toFront();
		this.label.toFront();
		if (this.readout) this.readout.toFront();
	},

	dragMove: function(dx, dy, x, y, e) {
		console.log('move:',dx,dy,x,y,e);
		this.x = this.drag.x + dx;
		this.y = this.drag.y + dy;

		this.outerrect.attr({x:x-this.drag.xoff, y:y-this.drag.yoff});
		this.bar.attr({x:x-this.drag.xoff + (this.w-this.barw)/2, y:y-this.drag.yoff});
		this.slide.attr({x:x-this.drag.xoff + (this.w - this.slidew)/2, y:this.slideYPos()});

		this.label.attr({x:x - this.drag.xoff + this.w/2, y:y - this.drag.yoff + this.h + this.slideh + this.fontsize*2});
		if (this.readout) this.readout.attr({x:x - this.drag.xoff + this.w/2, y:y - this.drag.yoff + this.h + this.slideh + this.fontsize});
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		this.outerrect.attr({fill:this.fill});
		delete this.drag;
		this.dragging = false;
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	},


	slideStart: function(x, y, event) {
		this.sliding = true;
		this.slide.attr({fill:this.fill_highlight});
	},

	slideMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e)
		if (y < this.y) y = this.y;
		else if (y > this.y + this.h) y = this.y + this.h;
		var fraction = (y - this.y) / this.h;
		var value = Math.floor(this.min + (1.0 - fraction) * (this.max - this.min));
		this.setValue(value);
		return this.slideFinish(e);
	},

	slideEnd: function(e) {
		this.slide.attr({fill:this.stroke});
		return this.slideFinish(e);
	},
	
	slideFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		this.sliding = false;
		this.exec();
		return false;
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
		if (!this.script) return;
		var cmd = Mustache.render(this.script, this);

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			var self = this;
			reply_handler = function(reply) { self.handleReply.call(self, reply); };
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);
		}
	},

	slideYPos: function() {
		if (this.value < this.min) this.value = this.min;
		if (this.value > this.max) this.value = this.max;
		var fraction = (this.value - this.min) / (this.max - this.min);
		return Math.floor(this.y + this.h * (1.0 - fraction));
	},

	setValue: function(value) {
		if (this.dragging) return;	// be the boss: ignore updates while dragging
		this.value = value;
		if (this.readout) this.readout.attr({text: ''+this.value});
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
		this.type = options.type = 'Chart';
		this.parent = options.parent;

		this.options = {};
		for (var o in options) this.options[o] = options[o];

		if (options.id) this.id = options.id;
		else if (options.text && !this.parent.controls[options.text]) this.id = options.text;
		else this.id = this.type + this.parent.next_id++;

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
		this.interpolate = options.interpolate || 'step-after';		// 'basis'

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		this.ticks = options.ticks || 5;
		this.target = options.target || this.id;
		this.refresh = options.refresh || 0;
		if (options.ymax) this.ymax = options.ymax;
		if (options.ymin) this.ymin = options.ymin;
		this.render();		// render D3 chart
		
		var self = this;
		if (this.refresh) setInterval(function() { self.redraw.call(self); }, this.refresh);
		return this;
	},

	attr: function(attrs) {
		this.outerrect.attr(attrs);

		var textattrs = {};
		for (var f in attrs) textattrs[f] = attrs[f];
		if (textattrs.stroke) textattrs.fill=attrs.stroke;
		this.label.attr(textattrs);
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

		var line = d3.svg.line().interpolate(this.interpolate)
				.x(function(d) { return x(d.time); })
				.y(function(d) { return y(d.value); });

		var self = this;
		this.outerrect = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.parent.button_corner)
			.attr({fill: this.fill, stroke: this.stroke, 'stroke-width':this.parent.control_stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.fontsize*2, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

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
			if (self.ymax != undefined) y.domain([self.ymin, self.ymax]);
			else y.domain([
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

	delete: function() {
		this.outerrect.remove();
		this.label.remove();
		this.svg.remove();
	},

	dragStart: function(x, y, event) {
		console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		this.outerrect.attr({fill:this.fill_highlight}).toFront();
		this.label.toFront();
		this.svg.toFront();		
	},

	dragMove: function(dx, dy, x, y, e) {
		console.log('move:',dx,dy,x,y,e);
		this.outerrect.attr({x:x-this.drag.xoff, y:y-this.drag.yoff});
		this.label.attr({x:x - this.drag.xoff + this.w/2, y:y - this.drag.yoff + this.h + this.fontsize*2});
		this.svg.attr('x', x - this.drag.xoff);
		this.svg.attr('y', y - this.drag.yoff);
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		this.outerrect.attr({fill:this.fill});
		delete this.drag;
		this.dragging = false;
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
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
		else this.redraw();

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

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			var self = this;
			var reply_handler = function(reply) { self.handleReply.call(self, reply); };
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id}, reply_handler);
		}

		if (this.repeat && !this.intervalid) {
			var self = this;
			this.intervalid = setInterval(function() { self.exec.call(self, {}); }, this.repeat);
		}
	},
	
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
