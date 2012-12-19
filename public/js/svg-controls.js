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
		this.options = {};
		for (var o in options) this.options[o] = options[o];
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
		this.grid = options.grid || 24;

		this.paper = Raphael(0, 0, $(window).width(), $(window).height());

		this.face = this.paper.rect(this.x, this.y, this.w, this.h, this.face_corner)
			.attr({stroke: this.stroke, fill: this.fill, 'stroke-width': 2 * this.control_stroke});

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
				//if (self.editingpanel) self.editbutton.attr({fill:self.stroke, stroke:self.stroke});
				//else self.editbutton.attr({fill:self.fill, stroke: self.stroke});
				if (self.editingpanel) self.face.attr({fill:"url('/images/grid24-greenblack.png')", stroke:self.stroke});
				else self.face.attr({fill:self.fill, stroke: self.stroke});
			});

		// one-time initialization for editor buttons
		$('#editsave').click(function() { console.log('save!'); self.endEdit(1); });
		$('#editcancel').click(function() { self.endEdit(0); });
		$('#editadd').click(function() { self.editAddField(); });
		$('#editdelete').click(function() { self.editDeleteField(); });

		if (this.title) this.logo = this.addText({
			x:this.tx,
			y:this.ty,
			text:this.title, 
			fill:this.stroke, stroke:this.stroke, fontsize: 36
		});

		return this;
	},

	attr: function(attrs) {
		this.face.attr(attrs);
		this.editbutton.attr(attrs);
		if (attrs.stroke) this.logo.attr({stroke:attrs.stroke, fill:attrs.stroke});
		for (var id in this.controls) this.controls[id].attr(attrs);
		return this;
	},

	initSocketIO: function() {
		this.socket = io.connect();
		console.log('Socket connected', this.socket);

		var self = this;
		this.socket.on('update', function(data) {
console.log('Update:', data);
			if (typeof data[0] == 'undefined') data = [data];
			for (var i=0; i < data.length; i++) {
				var ctrl = self.controls[data[i].id];
				if (ctrl) {
					if ((data[i].xvalue != undefined) && (data[i].yvalue != undefined)) {
console.log('Incoming Update XY:', data);
						ctrl.setValue(data[i].xvalue, data[i].yvalue);
					}
					else if (data[i].value != undefined) ctrl.setValue(data[i].value);
					else console.log('Malformed update:', i, data);
				}
			}
		});
		this.socket.on('add', function(data) {
			self.add(data);
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
				if (key == 'addbutton') self.addButton({x:self.menux, y:self.menuy, });
				else if (key == 'addrbutton') self.addButton({x:self.menux, y:self.menuy, subtype:'circle'});
				else if (key == 'addpbutton') self.addButton({x:self.menux, y:self.menuy, subtype:'path',
					path:'M26.154,13.988c-0.96-0.554-1.982-0.892-3.019-1.032c0.396-0.966,0.616-2.023,0.616-3.131c0-4.399-3.438-8.001-7.772-8.264c3.245,0.258,5.803,2.979,5.803,6.292c0,3.373-2.653,6.123-5.983,6.294v1.292c0.908,0.144,1.605,0.934,1.605,1.883c0,0.232-0.043,0.454-0.118,0.66l1.181,0.683c1.826-2.758,5.509-3.658,8.41-1.981c2.896,1.672,3.965,5.299,2.506,8.254C31.386,21.038,29.992,16.204,26.154,13.988zM4.122,16.587c2.92-1.686,6.628-0.764,8.442,2.034l1.141-0.657c-0.072-0.2-0.109-0.417-0.109-0.642c0-0.909,0.638-1.67,1.489-1.859v-1.319c-3.3-0.202-5.92-2.94-5.92-6.292c0-3.297,2.532-6.007,5.757-6.286c-4.312,0.285-7.729,3.875-7.729,8.258c0,1.078,0.206,2.106,0.581,3.05c-1.004,0.147-1.999,0.481-2.931,1.02c-3.812,2.201-5.209,6.985-3.264,10.87C0.174,21.823,1.251,18.244,4.122,16.587zM11.15,11.452c0.114,0.139,0.235,0.271,0.362,0.398c0.126,0.126,0.259,0.247,0.397,0.361c0.102,0.084,0.211,0.16,0.318,0.236c0.93-0.611,2.045-0.969,3.244-0.969c1.201,0,2.312,0.357,3.242,0.969c0.107-0.077,0.217-0.152,0.318-0.236c0.139-0.114,0.271-0.235,0.397-0.361c0.127-0.127,0.248-0.259,0.362-0.398c0.113-0.138,0.222-0.283,0.323-0.431c-1.307-0.956-2.908-1.528-4.643-1.528c-0.042,0-0.083-0.001-0.124,0c-0.019,0-0.04-0.001-0.06,0c-1.666,0.038-3.201,0.605-4.462,1.528C10.929,11.17,11.037,11.314,11.15,11.452zM9.269,16.787c-0.168-0.062-0.338-0.117-0.512-0.164c-0.173-0.047-0.348-0.083-0.525-0.113c-0.177-0.03-0.355-0.053-0.535-0.065c-0.175,1.609,0.13,3.282,0.998,4.786c0.868,1.503,2.164,2.606,3.645,3.259c0.079-0.162,0.15-0.328,0.212-0.496c0.063-0.169,0.118-0.338,0.164-0.512c0.047-0.173,0.087-0.349,0.115-0.525c0.022-0.13,0.034-0.262,0.046-0.394c-0.993-0.5-1.86-1.286-2.461-2.325c-0.6-1.04-0.847-2.182-0.783-3.294C9.512,16.889,9.392,16.833,9.269,16.787zM18.122,22.657c0.014,0.132,0.024,0.263,0.046,0.394c0.03,0.177,0.067,0.352,0.113,0.524c0.047,0.174,0.102,0.346,0.165,0.514c0.062,0.169,0.132,0.333,0.212,0.495c1.48-0.653,2.777-1.755,3.644-3.257c0.868-1.504,1.176-3.179,1.001-4.788c-0.18,0.013-0.358,0.035-0.535,0.065c-0.177,0.029-0.353,0.067-0.525,0.113s-0.345,0.101-0.513,0.163c-0.124,0.047-0.241,0.105-0.362,0.16c0.063,1.11-0.183,2.253-0.784,3.292C19.984,21.373,19.116,22.157,18.122,22.657zM20.569,27.611c-2.92-1.687-3.977-5.358-2.46-8.329l-1.192-0.689c-0.349,0.389-0.854,0.634-1.417,0.634c-0.571,0-1.086-0.254-1.436-0.653l-1.146,0.666c1.475,2.96,0.414,6.598-2.488,8.272c-2.888,1.668-6.552,0.791-8.386-1.935c2.38,3.667,7.249,4.87,11.079,2.658c0.929-0.535,1.711-1.227,2.339-2.018c0.64,0.832,1.45,1.554,2.416,2.112c3.835,2.213,8.709,1.006,11.086-2.671C27.132,28.396,23.463,29.282,20.569,27.611z',
					//path:'M19.562,10.75C21.74,8.572,25.5,7,25.5,7c-8,0-8-4-16-4v10c8,0,8,4,16,4C25.5,17,21.75,14,19.562,10.75zM6.5,29h2V3h-2V29z',
					scale:5
				});
				else if (key == 'addgroup') self.addGroup({x:self.menux, y:self.menuy, numx:3, numy:3});
				else if (key == 'addslider') self.addSlider({x:self.menux, y:self.menuy, });
				else if (key == 'addxyslider') self.addSlider({x:self.menux, y:self.menuy, subtype:'xy', w:100, h:100});
				else if (key == 'addhslider') self.addSlider({x:self.menux, y:self.menuy, subtype:'x', w:200, h:80});
				else if (key == 'addchart') self.addChart({x:self.menux, y:self.menuy, });
				else if (key == 'save') self.saveControls();
				else if (key == 'editpanel') self.edit.call(self, self);
				else if (key == 'addtext') self.addText({x:self.menux, y:self.menuy, });
				else if (key == 'scale') {
					var scale = prompt('Enter scale:');
					//var transform = 's'+scale;
					//self.attr({transform:scale});
					self.attr({scale:scale});
					//self.paper.scale(scale, scale);
				}
				else if (key == 'align') self.alignToGrid();
			},
			items: {
				//'newpanel': 	{name: 'New Panel', 	icon: 'newpanel'},
				'editpanel': 	{name: 'Panel Properties...', 	icon: 'editpanel'},
				'align': 		{name: 'Align to Grid', icon: 'editpanel'},
				'sep1': 	 	'---------',
				'addtext': 	{name: 'New Text', 		icon: 'addbutton'},
				'sep2': 	 	'---------',
				'addbutton': 	{name: 'New Button', 	icon: 'addbutton'},
				'addrbutton': 	{name: 'New Round Button', 	icon: 'addbutton'},
				'addpbutton': 	{name: 'New Path Button', 	icon: 'addbutton'},
				'addgroup': 	{name: 'New Group', 	icon: 'addbutton'},
				'sep3': 	 	'---------',
				'addslider': 	{name: 'New Slider', 	icon: 'addslider'},
				'addxyslider': 	{name: 'New XY-Slider', icon: 'addslider'},
				'addhslider': 	{name: 'New H-Slider', 	icon: 'addslider'},
				'sep4': 	 	'---------',
				'addchart':  	{name: 'New Chart', 	icon: 'addchart'},
				'sep5': 	 	'---------',
				'openpanel': 	{name: 'Open Panel', 	icon: 'openpanel'},
				//'scale': 	 	{name: 'Scale...', 	icon: 'save'},
				'save': 	 	{name: 'Save Panel', 	icon: 'save'}
			}
		});

		this.face.click(function(e) {
			if (self.editingpanel) {
				self.menux = e.clientX;
				self.menuy = e.clientY;
				$('#contextmenu').contextMenu({x:self.menux, y:self.menuy});
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
				'edit': 		{name: 'Item Properties...', 	icon: 'edit'},
				'duplicate':	{name: 'Duplicate', icon: 'duplicate'},
				'sep1': 		'---------',
				'delete': 		{name: 'Delete', 	icon: 'delete'}
			}
		});

	},

	showEditMenu: function(id, event) {
		this.menuowner = id;
		$('#editmenu').contextMenu({x: event.clientX, y:event.clientY});
	},
	
	sync: function() {
		this.socket.emit('sync', {});
	},

	uniqueid: function(basestring) {
		var id;
		for (;;) {
			id = basestring + this.next_id++;
			if (!this.controls[id]) return id;
		}
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

	addText: function(options) {
		options.parent = this;
		options.type = 'Text';
		var text = new Text(options);
		this.controls[text.id] = text;
		return text;
	},

	addGroup: function(options) {
		options.parent = this;
		options.type = 'Group';
		var group = new Group(options);
		this.controls[group.id] = group;
		return group;
	},
	
	add: function(items) {		// add an array of items to the panel
		for (var i=0; i < items.length; i++) {
			//console.log('Add:', items[i]);
			if (items[i].type == 'Button') this.addButton(items[i]);
			else if (items[i].type == 'Slider') this.addSlider(items[i]);
			else if (items[i].type == 'Chart') this.addChart(items[i]);
			else if (items[i].type == 'Text') this.addText(items[i]);
			else if (items[i].type == 'Group') this.addGroup(items[i]);
			else if (items[i].type == 'Panel') {
				for (var f in items[i]) {
					this.options[f] = this[f] = items[i][f];
				}
				var panelopts = {};
				if (items[i].fill) this.fill = panelopts.fill = items[i].fill;
				if (items[i].stroke) this.stroke = panelopts.stroke = items[i].stroke;
				if (items[i].color) this.stroke = this.color = panelopts.stroke = items[i].color;
				this.attr(panelopts);
			}
			else console.log('Unknown type in Add:', items[i]);
		}
	},

	sendCommand: function(command, data) {
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

	edit: function(object) {	// edit control.id or this

		var x = (object == this) ? this.menux : this.controls[object].x;
		var y = (object == this) ? this.menuy : this.controls[object].y;

		var editor = $('#editor').css('background-color', 'white')
			.css('zIndex', 9999)
			.css('position', 'absolute')
			//.css('width', '50%')
			.css({left: x, top: y});

		var data;
console.log('pre-edit: options:', this.options);
console.log('edit:', object==this, object, this);
		if (object == this) data = this.panelToEditFormat();
		else data = this.controlToEditFormat(object);

console.log('edit:data:', data);

 		this.edittable = $('#dataTable').handsontable({
			data: data,
			startRows: data.length,
			startCols: 2,
			colHeaders: ['PROPERTY', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;VALUE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;']
		});

		for (var r=0; r<data.length; r++) {		// disallow edit of field names
			$('#dataTable').handsontable('setCellReadOnly', r, 0);
			//if (data[r][0] == 'id') $('#dataTable').handsontable('setCellReadOnly', r, 1);
		}

		this.editingcontrol = object;
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
			if (opts.x) opts.x = parseInt(opts.x);
			if (opts.y) opts.y = parseInt(opts.y);
			if (opts.w) opts.w = parseInt(opts.w);
			if (opts.h) opts.h = parseInt(opts.h);

			console.log('Saving:', opts);
			if (this.editingcontrol == this) {
				//for (var i=0; i < data.length; i++) {
				//	if (typeof this[data[i][0] == 'number') opts[data[i][0]] = parseInt(data[i][1]);
				//	else opts[data[i][0]] = data[i][1];
				//}
				//var attrs = {};
				for (var f in opts) {
					this.options[f] = this[f] = opts[f];
				}
				if (opts.fill) this.attr({fill:opts.fill});
				if (opts.stroke) this.attr({stroke:opts.stroke});
				if (opts.color) this.attr({stroke:opts.color});
			}
			else {
				this.controls[this.editingcontrol].delete();
				this.add([opts]);
			}
		}
		$('#dataTable').handsontable('destroy');
		$('#editor').css('zIndex', 0);
		delete this.editingcontrol;
	},
	
	saveControls: function() {
		this.socket.emit('save', this.panelToStorageFormat());
	},

	load: function(panelid) {
console.log('Load:', panelid);
		this.id = panelid;
		this.socket.emit('open', panelid);
	},

	editAddField: function() {
		var id = this.editingcontrol;
		console.log('addfield:', id);
		var newfield = prompt('New field name:');
		if (!newfield) return;
		var newvalue = prompt('Value for new field:');

		if (this.editingcontrol == this) {
			this.options[newfield] = newvalue;
			this[newfield] = newvalue;
		}
		else {
			this.controls[id].options[newfield] = newvalue;
			this.controls[id][newfield] = newvalue;
		}
		this.endEdit(0);
		this.edit(id);
	},
	
	editDeleteField: function() {
		var id = this.editingcontrol;
		console.log('addfield:', id);
		var doomedfield = prompt('Field to delete:');
		if (!doomedfield) return;
		if (this.editingcontrol == this) {
			if (this.options.hasOwnProperty(doomedfield))
				delete this.options[doomedfield];
		}
		else {
			if (this.controls[id].options.hasOwnProperty(doomedfield))
				delete this.controls[id].options[doomedfield];
		}
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
				&& (f != 'parent')
				//&& (typeof this.controls[id][f] != 'object')
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
				&& ((typeof this.controls[id][f] != 'object') || (this.controls[id][f] instanceof Array))
				&& (typeof this.controls[id][f] != 'function')) {		// push current object value
				data[f] = this.controls[id][f];
			}
		}
		//console.log('controlToStorage:', id, typeof this.controls[id], data);
		return data;
	},

	panelToEditFormat: function() {
console.log('p2e1:', this.options, this);
		var data = [];
		for (var f in this.options) {				// for properties in original options
console.log('p2e:', f);
			if (this.options.hasOwnProperty(f)
				&& ((typeof this.options[f] != 'object') || (this.options[f] instanceof Array))
				&& (typeof this.options[f] != 'function')) {		// push current object value
				data.push([f, this.options[f] || this[f]]);
			}
		}
		console.log('panelToEdit:', data);
		return data;
	},

	panelToStorageFormat: function() {
		var data = [];
		var panelopts = {};
		for (var f in this.options) {
			if (this.options.hasOwnProperty(f)
				&& (typeof this.options[f] != 'object')
				&& (typeof this.options[f] != 'function')) {
				panelopts[f] = this.options[f];
			}
		}
		panelopts.type = 'Panel';
		panelopts.id = this.id;
		data.push(panelopts);

		for (var id in this.controls) {
			data.push(this.controlToStorageFormat(id));
		}
		//console.log('Controls.ToStorage:', data);
		return data;
	},
	
	alignToGrid: function() {
		if (!this.grid) return;
		for (var id in this.controls) {
			var control = this.controls[id];
			var newx = this.grid * Math.floor(control.x / this.grid);
			var newy = this.grid * Math.floor(control.y / this.grid);
			control.move(newx, newy);
		}
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
		else this.id = this.parent.uniqueid(this.type);

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
		if (options.corner != undefined) this.corner = options.corner;
		else this.corner = this.parent.button_corner;
		this.subtype = options.subtype || '';	// default to rectangle
		this.r = options.r || this.w/2;
		this.autorun = options.autorun || false;
		this.value = options.value || 0;
		this.path = options.path || undefined;
		this.scale = options.scale || 1;
		if (options.group) this.group = options.group;
		if (options.row != undefined) this.row = options.row;
		if (options.col != undefined) this.col = options.col;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		var self = this;

		if (this.subtype == 'circle') {
			this.elt = this.parent.paper.circle(this.x+this.r, this.y+this.r, this.r);
			this.label = this.parent.paper.text(this.x + this.r, this.y + this.r, this.text);
			if (!this.noreadout) this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + 2 * this.r + this.fontsize, this.value);
		}
		else if (this.subtype == 'path') {	// path button
			var translation = ['t', this.x, ',', this.y, 's', this.scale].join('');
			//console.log('Path:', translation, this.x, this.y, this.scale);
			this.elt = this.parent.paper.path(this.path)
				.transform(translation);

			var bbox = this.elt.getBBox();
			//var brect = this.parent.paper.rect(bbox.x, bbox.y, bbox.width, bbox.height)
			//	.attr({fill:this.fill, stroke:this.stroke});
			//console.log('bbox:', this.x, this.y, bbox);
			this.elt.toFront();

			this.w = bbox.width;
			this.h = bbox.height;
			var labelx = this.x;
			var labely = bbox.y + this.h + this.fontsize;
			//var labelx = bbox.x + bbox.width/2;
			//var labely = bbox.y + bbox.height/2;

			this.label = this.parent.paper.text(labelx, labely, this.text);
			if (!this.noreadout) this.readout = this.parent.paper.text(this.x, this.y, this.value);
		}
		else {		// default rectangular button
			this.elt = this.parent.paper.rect(this.x, this.y, this.w, this.h, this.corner);
			this.label = this.parent.paper.text(this.x + (this.w/2), this.y + this.h/2, this.text);
			if (!this.noreadout) this.readout = this.parent.paper.text(this.x + (this.w/2), this.y + this.h + this.fontsize, '');
		}

		this.elt.attr({fill:this.fill, stroke:this.stroke, 'stroke-width': this['stroke-width']})
			.click(function(e) { return self.handleClick.call(self, e); })
			//.dblclick(function(e) { self.parent.showEditMenu(self.id, event); })
			.mousedown(function(e) { self.highlight.call(self, e); return false;})
			.mouseup(function(e) { self.dehighlight.call(self, e); return false;})
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (this.label) this.label.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			//.dblclick(function(e) { self.parent.showEditMenu(self.id, event); })
			.mousedown(function(e) { self.highlight.call(self, e); return false;})
			.mouseup(function(e) { self.dehighlight.call(self, e); return false;})
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (this.readout) this.readout.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
			.click(function(e) { return self.handleClick.call(self, e); })
			//.dblclick(function(e) { self.parent.showEditMenu(self.id, event); })
			.mousedown(function(e) { self.highlight.call(self, e); return false;})
			.mouseup(function(e) { self.dehighlight.call(self, e); return false;})
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		return this;
	},
	
	highlight: function(event) {
		this.elt.attr({fill:this.fill_highlight});
		var highlight_attr = {fill:this.fill, stroke: this.fill};
		if (this.label) this.label.attr(highlight_attr);
		//if (this.readout) this.readout.attr(highlight_attr);
	},

	dehighlight: function(event) {
		this.elt.attr({fill:this.fill});
		var dehighlight_attr = {fill:this.stroke, stroke: this.stroke};
		if (this.label) this.label.attr(dehighlight_attr);
		//if (this.readout) this.readout.attr(dehighlight_attr);
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

	setText: function(text) {
		this.label.attr({text:text});
	},

	dragStart: function(x, y, e) {
console.log('Drag start:', x, y, e);

		if (!this.parent.editingpanel) return true;// this.dragFinish(e);

		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id, e);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		//this.highlight();
		this.attr({opacity:0.5});
		this.toFront();
	},

	toFront: function() {
		this.elt.toFront();
		if (this.readout) this.readout.toFront();
		this.label.toFront();
	},

	move: function(x, y) {
		//console.log('move:', x, y, this);
		this.x = x;
		this.y = y;
		if (this.subtype == 'circle') {
			this.elt.attr({cx:x + this.r, cy:y + this.r});
			this.label.attr({x:x + (this.w/2), y:y + this.r});
			if (this.readout) this.readout.attr({x: this.x + (this.w/2), y: this.y + 2 * this.r + this.fontsize});
		}
		else if (this.subtype == 'path') {
			var bbox = this.elt.getBBox();
			this.elt.transform(['t', x, ',', y, 's', this.scale].join(''));
			var labely = bbox.y + this.h + this.fontsize;
			this.label.attr({x:x, y:labely});
			if (this.readout) this.readout.attr({x:x, y:y});
		}
		else {
			this.elt.attr({x:x, y:y});
			this.label.attr({x:x + this.w/2, y:y + this.h/2});
			if (this.readout) this.readout.attr({x:x + this.w/2, y:y + this.h + this.fontsize});
		}
	},

	dragMove: function(dx, dy, x, y, e) {
console.log('dragMove:',dx,dy,x,y,e);
		if (!this.parent.editingpanel) return true;// this.dragFinish(e);

		var grid = this.parent.grid;
		if (grid && !e.shiftKey) {
			this.x = this.drag.x + (grid * Math.floor(dx / grid));
			this.y = this.drag.y + (grid * Math.floor(dy / grid));
		}
		else {
			this.x = this.drag.x + dx;
			this.y = this.drag.y + dy;
		}
		this.move(this.x, this.y);
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
console.log('dragEnd');
		if (!this.parent.editingpanel) return true;// this.dragFinish(e);
		//this.elt.attr({fill:this.fill});
		this.attr({opacity:1.0});
		this.dehighlight();
		this.options.x = this.x;
		this.options.y = this.y;
		delete this.drag;
		this.dragging = false;
		if (this.group) {
			console.log('dragEnd calling:', this.row, this.col);
			this.parent.controls[this.group].dragNotify(this);
		}
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	},

	handleClick: function(e) {
console.log('handleClick', e);
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
					.attr({fill:this.stroke, stroke: this.stroke});
					
				this.exec();
			}
		}
		else this.exec();

		return true;		//this.dragFinish();
	},

	exec: function() {
		if (!this.script) {
			this.setValue(!this.value);		// unscripted buttons toggle and gossip
			return;
		}

		if (typeof this.script == 'function') {
			return this.script.call(this);
		}
		
		var cmd = Mustache.render(this.script, this);
		//console.log('button exec:', cmd);

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id});
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
		else this.id = this.parent.uniqueid(this.type);

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
		this.fill_highlight = options.fill_highlight || this.parent.lighter(this.stroke);
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		this.min = options.min || 0;
		this.max = options.max || 0;
		this.xmin = options.xmin || 0;
		this.xmax = options.xmax || 255;
		this.ymin = options.ymin || 0;
		this.ymax = options.ymax || 255;

		this.recenter = options.recenter || false;

		this.value = options.value || this.min;
		this.xvalue = options.xvalue || this.xmin;
		this.yvalue = options.yvalue || this.ymin;

		this.barw = options.barw || 1;	//1+Math.floor(this.w / 16);
		this.barh = this.barw;

		this.subtype = this.options.subtype = options.subtype || 'y';
		if (this.subtype == 'xy') {
			this.slidew = options.slidew || 1+Math.floor(this.w / 12);
			this.w += this.slidew;
			this.slideh = options.slideh || 1+Math.floor(this.h / 12);
		}
		else if (this.subtype == 'x') {
			this.slidew = options.slidew || 1+Math.floor(this.w / 10);
			this.slideh = .8 * this.h;
		}
		else {
			this.ymin = options.min || this.ymin;
			this.ymax = options.max || this.ymax;
			this.value = options.value || this.value;
			this.slidew = .8 * this.w;
			this.slideh = options.slideh || 1+Math.floor(this.h / 10);
		}

		var self = this;

		this.outerw = this.w; if (this.subtype != 'y') this.outerw += this.slidew;
		this.outerh = this.h; if (this.subtype != 'x') this.outerh += this.slideh;
		this.outerxmid = this.x + this.w/2; if (this.subtype !='y') this.outerxmid += (this.slidew/2);
		this.outerymid = this.y + this.h/2; if (this.subtype !='x') this.outerymid += (this.slideh/2);

		this.outerrect = this.parent.paper.rect(this.x, this.y, this.outerw, this.outerh, 10)
			.attr({fill:this.fill, stroke:this.stroke, 'stroke-width':this.parent.control_stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (this.subtype != 'y') this.xbar = this.parent.paper.rect(this.x, this.outerymid, this.outerw, this.barh)
			.attr({fill:this.stroke, stroke:this.stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (this.subtype != 'x') this.ybar = this.parent.paper.rect(this.outerxmid, this.y, this.barw, this.outerh)
			.attr({fill:this.stroke, stroke:this.stroke})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		this.slide = this.parent.paper.rect(this.x + (this.w - this.slidew)/2, this.slideYPos(), this.slidew, this.slideh, 5)
			.attr({fill:this.stroke, stroke:this.stroke, 'stroke-width': this['stroke-width']})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.slideMove, this.slideStart, this.slideEnd, this, this, this);

		this.label = this.parent.paper.text(this.outerxmid, this.y + this.outerh + this.fontsize*2, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		if (!this.noreadout) {
			if (this.subtype != 'x') this.yreadout = this.parent.paper
				.text(this.outerxmid, this.y + this.outerh + this.fontsize, ''+(this.value || this.xvalue || ''))
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
				.click(function(e) { return self.handleClick.call(self, e); })
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

			if (this.subtype != 'y') this.xreadout = this.parent.paper.text(this.x + this.outerw + this.fontsize, this.y + this.h/2, ''+(this.yvalue || ''))
				.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize-2})
				.click(function(e) { return self.handleClick.call(self, e); })
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);
		}
		return this;
	},

	delete: function() {
		this.outerrect.remove();
		if (this.xbar) this.xbar.remove();
		if (this.ybar) this.ybar.remove();
		this.slide.remove();
		this.label.remove();
		if (this.xreadout) this.xreadout.remove();
		if (this.yreadout) this.yreadout.remove();
	},

	attr: function(attrs) {
		this.outerrect.attr(attrs);
		if (this.xbar) this.xbar.attr(attrs);
		if (this.ybar) this.ybar.attr(attrs);
		this.slide.attr(attrs);

		var textattrs = {};
		for (var f in attrs) textattrs[f] = attrs[f];
		if (textattrs.stroke) textattrs.fill=attrs.stroke;
		this.label.attr(textattrs);
		this.slide.attr(textattrs);
		if (this.xreadout) this.xreadout.attr(textattrs);
		if (this.yreadout) this.yreadout.attr(textattrs);
	},

	dragStart: function(x, y, event) {
		//console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id, event);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		//this.outerrect.attr({fill:this.fill_highlight}).toFront();
		this.attr({opacity:0.5});
		this.outerrect.toFront();
		if (this.xbar) this.xbar.toFront();
		if (this.ybar) this.ybar.toFront();
		this.slide.toFront();
		this.label.toFront();
		if (this.xreadout) this.xreadout.toFront();
		if (this.yreadout) this.yreadout.toFront();
	},

	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e);
		var grid = this.parent.grid;
		if (grid && !e.shiftKey) {
			this.x = this.drag.x + (grid * Math.floor(dx / grid));
			this.y = this.drag.y + (grid * Math.floor(dy / grid));
		}
		else {
			this.x = this.drag.x + dx;
			this.y = this.drag.y + dy;
		}
		this.move(this.x, this.y);
		return this.dragFinish(e);
	},
	
	move: function(x, y) {
		this.x = x;
		this.y = y;
		this.outerrect.attr({x:this.x, y:this.y});
		if (this.xbar) this.xbar.attr({x:this.x, y:this.y + this.outerh/2});
		if (this.ybar) this.ybar.attr({x:this.x + (this.w-this.barw)/2, y:this.y});
		this.slide.attr({x:this.x + (this.w - this.slidew)/2, y:this.slideYPos()});

		this.label.attr({x:this.x + this.w/2, y:this.y + this.outerh + this.fontsize*2});
		if (this.xreadout) this.xreadout.attr({x:this.x + this.w/2, y:this.y + this.outerh + this.fontsize});
		if (this.yreadout) this.yreadout.attr({x:this.x + this.outerw + this.fontsize, y:this.y + this.h/2});
	},

	dragEnd: function(e) {
		//this.outerrect.attr({fill:this.fill});
		this.attr({opacity:1});
		this.options.x = this.x;
		this.options.y = this.y;
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
		this.slide.attr({fill:this.fill});
		//this.glow = this.slide.glow({color:'white'});
	},

	slideMove: function(dx, dy, x, y, e) {
		//console.log('slidemove:',dx,dy,x,y,e)
		if (y < this.y) y = this.y;
		else if (y > this.y + this.h) y = this.y + this.h;
		if (x < this.x) x = this.x;
		else if (x > this.x + this.w) x = this.x + this.w;

		var xfraction = (x - this.x) / this.w;
		var xvalue = Math.floor(this.xmin + (xfraction) * (this.xmax - this.xmin));
		var yfraction = (y - this.y) / this.h;
		var yvalue = Math.floor(this.ymin + (1.0 - yfraction) * (this.ymax - this.ymin));

		if (this.subtype == 'xy') this.setValue(xvalue, yvalue);
		else if (this.subtype == 'x') this.setValue(xvalue);
		else this.setValue(yvalue);
		return this.slideFinish(e);
	},

	slideEnd: function(e) {
		//this.glow.remove();
		this.slide.attr({fill:this.stroke});
		return this.slideFinish(e);
	},
	
	slideFinish: function(e) {
		e.preventDefault();
		e.stopPropagation();
		this.sliding = false;
		this.exec();
		var self = this;
		//console.log('slidefinish:', e, e.type);	
		if (this.recenter && ((e.type == 'mouseup') || (e.type == 'touchend'))) {
			window.setTimeout(function() {
				self.slideToCenter();
			}, 10);
		}
		return false;
	},

	slideToCenter: function() {
		if (this.subtype == 'xy') this.setValue((this.xmax + this.xmin)/2, (this.ymax + this.ymin)/2);
		else if (this.subtype == 'x') this.setValue((this.xmax + this.xmin)/2);
		else this.setValue((this.ymax + this.ymin)/2);
		this.exec();
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

		if (typeof this.script == 'function') {
			return this.script.call(this);
		}

		var cmd = Mustache.render(this.script, this);

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id});
		}
	},

	slideXPos: function() {
		if (this.subtype == 'y') return this.x + (this.w - this.slidew)/2;
		if (this.xvalue < this.xmin) this.xvalue = this.xmin;
		if (this.xvalue > this.xmax) this.xvalue = this.xmax;
		var fraction = (this.xvalue - this.xmin) / (this.xmax - this.xmin);
		return Math.floor(this.x + this.w * fraction);
	},

	slideYPos: function() {
		if (this.subtype == 'x') return this.y + (this.h - this.slideh)/2;
		if (this.yvalue < this.ymin) this.yvalue = this.ymin;
		if (this.yvalue > this.ymax) this.yvalue = this.ymax;
		var fraction = (this.yvalue - this.ymin) / (this.ymax - this.ymin);
		return Math.floor(this.y + this.h * (1.0 - fraction));
	},

	setValue: function(value1, value2) {

		//console.log('slider set:', value1, value2, typeof value1, typeof value2);

		if (this.dragging) return;	// be the boss: ignore updates while dragging

		if (this.subtype == 'xy') {
			if (value1 != undefined) this.xvalue = value1;
			if (value2 != undefined) this.yvalue = value2;
			if (this.xreadout && (this.xvalue != undefined)) this.xreadout.attr({text: ''+this.xvalue});
			if (this.yreadout && (this.yvalue != undefined)) this.yreadout.attr({text: ''+this.yvalue});
			var slidex = this.slideXPos();
			var slidey = this.slideYPos();
			this.slide.attr({x:slidex, y:slidey});
			var update = {id: this.id, xvalue: this.xvalue, yvalue: this.yvalue};
			this.fire('update', update);
		}
		else if (this.subtype == 'x') {
			this.value = this.xvalue = value1;
			if (this.xreadout && (this.value != undefined)) this.xreadout.attr({text: ''+this.value});
			var slidex = this.slideXPos();
			this.slide.attr({x:slidex});
			var update = {id: this.id, value: this.value};
			this.fire('update', update);
		}
		else {
			this.value = this.yvalue = value1;
			if (this.yreadout && (this.value != undefined)) this.yreadout.attr({text: ''+this.value});
			var slidey = this.slideYPos();
			//console.log('slidey:', slidey);
			this.slide.attr({y:slidey});
			var update = {id: this.id, value: this.value};
			this.fire('update', update);
		}
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
		else this.id = this.parent.uniqueid(this.type);

		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 300;
		this.h = options.h || 150;
		this.text = options.text || 'Untitled';
		this.script = options.script || '';
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || this.parent.lighter(this.stroke);
		this.stroke = options.stroke || this.parent.color;
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.repeat = options.repeat || 0;
		this.running = 0;
		this.corner = options.corner || this.parent.button_corner;
		this.subtype = options.subtype || '';
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

		this.svg.attr(attrs);
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
				//.attr('transform', 'translate(' + (this.x+margin.left) + ',' + (this.y+margin.top) + ')');
				.attr('transform', 'translate(' + (this.x) + ',' + (this.y) + ')');

		d3.json('/d3/' + this.target, function(data) {

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
		
			self.svgx = self.svg.append('g')
					.attr('class', 'x axis')
					.attr('transform', 'translate(0,' + height + ')')
					.attr('stroke', self.stroke)
					.attr('fill', self.stroke)
					.call(xAxis);
		
			self.svgy = self.svg.append('g')
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
			self.svgvalue = self.svg.selectAll('.value')
					.data(values)
				.enter().append('g')
					.attr('class', 'value');
		
			self.svgvalue.append('path')
					.attr('class', 'line')
					.attr('d', function(d) { return line(d.values); })
					.style('stroke', function(d) { return color(d.name); })
					.style('stroke-width', self['stroke-width']);
		
			self.svgvalue.append('text')
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
		//console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id, event);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		this.attr({opacity:0.5});
		this.outerrect.toFront();
		this.label.toFront();
		//this.svg.toFront();		
	},

	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e);
		var grid = this.parent.grid;
		if (grid && !e.shiftKey) {
			this.x = this.drag.x + (grid * Math.floor(dx / grid));
			this.y = this.drag.y + (grid * Math.floor(dy / grid));
		}
		else {
			this.x = this.drag.x + dx;
			this.y = this.drag.y + dy;
		}
		this.move(this.x, this.y);
		return this.dragFinish(e);
	},
	
	move: function(x, y) {
		this.x = x;
		this.y = y;
		this.outerrect.attr({x:this.x, y:this.y});
		this.label.attr({x:this.x + this.w/2, y:this.y + this.h + this.fontsize*2});

		var translation = ['translate(', this.x, ',', this.y,')'].join('');
		//console.log('translation:', translation)
		this.svg.attr('transform', translation);
	},

	dragEnd: function(e) {
		//this.outerrect.attr({fill:this.fill});
		this.attr({opacity:1.0});
		this.options.x = this.x;
		this.options.y = this.y;
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

		if (typeof this.script == 'function') {
			return this.script.call(this);
		}

		var cmd = Mustache.render(this.script, this);
		console.log('Chart exec:', cmd);

		if (cmd.match(/^javascript\:/)) {			// javascript command
			cmd = cmd.replace('javascript:', '');
			eval(cmd);
		}
		else {										// bitlash command
			this.parent.sendCommand('exec', {'cmd': cmd, 'id':this.id});
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


//////////
//
//	Text control
//
function Text(options) {
	return this.init(options || {});
}

Text.prototype = {

	init: function(options) {
		this.type = options.type = 'Text';
		this.parent = options.parent;

		this.options = {};
		for (var o in options) this.options[o] = options[o];

		if (options.id) this.id = options.id;
		else if (options.text && !this.parent.controls[options.text]) this.id = options.text;
		else this.id = this.parent.uniqueid(this.type);

		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 100);
		this.y = this.parent.y + (options.y || 100);
		this.text = options.text || 'Untitled';

		this.stroke = options.stroke || this.parent.color;
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || this.parent.lighter(this.stroke);
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		var self = this;

		this.label = this.parent.paper.text(this.x, this.y, this.text)
			.attr({fill:this.stroke, stroke:this.stroke, 'font-size': this.fontsize})
			.click(function(e) { return self.handleClick.call(self, e); })
			.mousedown(function(e) { self.attr({opacity:0.5}); })
			.mouseup(function(e) { self.attr({opacity:1.0});})
			.mouseout(function(e) { self.attr({opacity:1.0});})
			.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		return this;
	},

	delete: function() {
		this.label.remove();
	},
	
	attr: function(attrs) {
		var textattrs = {};
		for (var f in attrs) textattrs[f] = attrs[f];
		if (textattrs.stroke) textattrs.fill=attrs.stroke;
		this.label.attr(textattrs);
	},

	setText: function(text) {
		this.label.attr({text:text});
	},

	dragStart: function(x, y, event) {
		//console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return true;
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id, event);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		this.label.toFront();
	},

	move: function(newx, newy) {
		this.label.attr({x:this.x, y:this.y});
	},


	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e);
		var grid = this.parent.grid;
		if (grid && !e.shiftKey) {
			this.x = this.drag.x + (grid * Math.floor(dx / grid));
			this.y = this.drag.y + (grid * Math.floor(dy / grid));
		}
		else {
			this.x = this.drag.x + dx;
			this.y = this.drag.y + dy;
		}
		this.move(this.x, this.y);
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		this.options.x = this.x;
		this.options.y = this.y;
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
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	},

	setValue: function(value) {
		this.value = value;
		this.label.attr({text: this.value});
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
//	Group control
//
function Group(options) {
	return this.init(options || {});
}

Group.prototype = {

	init: function(options) {
		this.type = options.type = 'Group';
		this.parent = options.parent;

		this.options = {};
		for (var o in options) this.options[o] = options[o];

		if (options.id) this.id = options.id;
		else if (options.text && !this.parent.controls[options.text]) this.id = options.text;
		else this.id = this.parent.uniqueid(this.type);

		if (this.parent.channel.length) this.id = '' + this.parent.channel + '.' + this.id;
		this.x = this.parent.x + (options.x || 50);
		this.y = this.parent.y + (options.y || 50);
		this.w = options.w || 125;
		this.h = options.h || 50;
		this.text = options.text || '';
		this.noreadout = options.noreadout || false;
		this.script = options.script || '';
		this.stroke = options.stroke || this.parent.color;
		this.fill = options.fill || 'black';
		this.fill_highlight = options.fill_highlight || this.parent.lighter(this.stroke);
		this['stroke-width'] = options['stroke-width'] || this.parent.control_stroke;
		this.fontsize = options.fontsize || 20;
		this.repeat = options.repeat || 0;
		this.running = 0;

		if (options.corner != undefined) this.corner = options.corner;
		else this.corner = this.parent.button_corner;

		this.subtype = options.subtype || '';	// default to rectangle
		this.r = options.r || this.w/2;
		this.autorun = options.autorun || false;
		this.value = options.value || 0;
		this.path = options.path || undefined;
		this.scale = options.scale || 1;
		this.color = options.color || this.parent.color;

		this.listeners = {};	// hash of arrays of listeners, keyed by eventname

		this.numx = options.numx || 1;
		this.numy = options.numy || 3;

		if (options.gutterx != undefined) this.gutterx = options.gutterx;
		else if (options.gutter != undefined) this.gutterx = options.gutter;
		else this.gutterx = 20;
		if (options.guttery != undefined) this.guttery = options.guttery; 
		else if (options.gutter != undefined) this.guttery = options.gutter;
		else this.guttery = 20;

		var self = this;

		this.elt = this.parent.paper.rect(
			this.x - this.gutterx,
			this.y - this.guttery, 
			this.numx * (this.w + this.gutterx) + this.gutterx,
			this.numy * (this.h + this.guttery) + this.guttery, this.corner)
				.attr({fill:this.fill, stroke:this.color, 'stroke-width': this['stroke-width']})
				.click(function(e) { return self.handleClick.call(self, e); })
				//.mousedown(function(e) { self.elt.attr({fill:self.fill_highlight}); })
				//.mouseup(function(e) { self.elt.attr({fill:self.fill});})
				.drag(this.dragMove, this.dragStart, this.dragEnd, this, this, this);

		var nextstroke = 0;
		var strokes = this.stroke;
		if (!(strokes instanceof Array)) strokes = [strokes];

		var nextfill = 0;
		var fills = this.fill;
		if (!(fills instanceof Array)) fills = [fills];

		var nexttext = 0;
		var texts = this.text;
		if (!(texts instanceof Array)) texts = [texts];

		var nextscript = 0;
		var scripts = this.script;
		if (!(scripts instanceof Array)) scripts = [scripts];

		var x;
		var y = this.y;
		for (var row = 0; row < this.numy; row++) {
			x = this.x;
			for (var col=0; col< this.numx; col++) {
				var opts = {};
				for (var o in this.options) opts[o] = this.options[o];
				opts.id = this.itemid(row, col);
				opts.group = this.id;
				opts.x = x;
				opts.y = y;
				opts.row = row;
				opts.col = col;

				opts.stroke = strokes[nextstroke];
				if (++nextstroke >= strokes.length) nextstroke = 0;

				opts.fill = fills[nextfill];
				if (++nextfill >= fills.length) nextfill = 0;

				opts.text = texts[nexttext];
				if (++nexttext >= texts.length) nexttext = 0;

				opts.script = scripts[nextscript];
				if (++nextscript >= scripts.length) nextscript = 0;

				this.parent.addButton(opts);
				x += (this.w + this.gutterx);
			}
			y += (this.h + this.guttery);
		}
	},

	itemid: function(row, col) {
		return  '' + this.id + '-' + row + '-' + col;
	},

	each: function(callback) {
		for (var row = 0; row < this.numy; row++) {
			for (var col = 0; col < this.numx; col++) {
				callback(this.parent.controls[this.itemid(row, col)]);
			}
		}
	},

	delete: function() {
		this.each(function(control) { control.parent.deletecontrol(control.id); });
		this.elt.remove();
	},
	
	attr: function(attrs) {
		this.elt.attr(attrs);
		this.each(function(control) { control.attr(attrs); });
	},

	setText: function(text) {
	},

	// when a button in our group moves, it calls here to notify
	dragNotify: function(moved) {
		// calculate x,y of group from row, col of button[id]
		//var moved = this.parent.controls[id];
		var newx = moved.x - moved.col * (this.w + this.gutterx);
		var newy = moved.y - moved.row * (this.h + this.guttery);
		this.move(newx, newy);
	},

	move: function(newx, newy) {
		this.options.x = this.x = newx;
		this.options.y = this.y = newy;
		this.elt.attr({x:this.x - this.gutterx, y:this.y - this.guttery});

		var x;
		var y = this.y;
		for (var row = 0; row < this.numy; row++) {
			x = this.x;
			for (var col=0; col< this.numx; col++) {
				var control = this.parent.controls[this.itemid(row, col)];
				control.move(x, y);
				control.toFront();
				x += (this.w + this.gutterx);
			}
			y += (this.h + this.guttery);
		}
	},
	
	dragStart: function(x, y, event) {
		//console.log('Drag start:', x, y, event);
		if (!this.parent.editingpanel) return this.dragFinish();
		if (event && event.shiftKey) {
			this.parent.showEditMenu(this.id, event);
			return true;
		}
		this.drag = {x:this.x, y:this.y, xoff: x-this.x, yoff: y-this.y};
		this.dragging = true;
		//this.elt.attr({fill:this.fill_highlight}).toFront();
		this.attr({opacity:0.5})
		this.elt.toFront();
		return true;
	},

	dragMove: function(dx, dy, x, y, e) {
		//console.log('move:',dx,dy,x,y,e);
		if (!this.parent.editingpanel) return this.dragFinish();

		var grid = this.parent.grid;
		if (grid && !e.shiftKey) {
			this.x = this.drag.x + (grid * Math.floor(dx / grid));
			this.y = this.drag.y + (grid * Math.floor(dy / grid));
		}
		else {
			this.x = this.drag.x + dx;
			this.y = this.drag.y + dy;
		}
		this.move(this.x, this.y);
		return this.dragFinish(e);
	},

	dragEnd: function(e) {
		if (!this.parent.editingpanel) return this.dragFinish();
		//this.elt.attr({fill:this.fill});
		this.attr({opacity:1.0});
		this.options.x = this.x;
		this.options.y = this.y;
		delete this.drag;
		this.dragging = false;
/*
		if (this.group) {
			console.log('dragEnd calling:', this.row, this.col);
			this.parent.controls[this.group].dragNotify(this);
		}
*/
		return this.dragFinish(e);
	},
	
	dragFinish: function(e) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		return false;
	},

	handleClick: function(e) {
		return false;
	},

	exec: function() {
	},

	setValue: function(value) {
		var bit = 0;
		this.value = value;
		if (typeof value == 'string') {
			for (var row = 0; row < this.numy; row++) {
				for (var col = 0; col < this.numx; col++) {
					var control = this.parent.controls[this.itemid(row, col)];
					if (this.value == control.text) control.highlight();
					else control.dehighlight();
				}
			}
		}
		else if (typeof value == 'number') {
			for (var row = 0; row < this.numy; row++) {
				for (var col = 0; col < this.numx; col++) {
					var control = this.parent.controls[this.itemid(row, col)];
					var bitvalue = ((value & (1<<bit++)) != 0) ? 1 : 0;
					if (bitvalue) control.highlight();
					else control.dehighlight();
				}
			}
		}
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

