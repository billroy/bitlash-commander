# Bitlash Commander

Bitlash Commander is a node.js web interface toolkit for Arduino.  It serves web pages containing buttons, sliders, and chart controls, easily customized, which trigger Bitlash scripts you specify to control the Arduino over the usb-serial link.  

Commander includes a graphical panel editing environment suitable for bringing up simple control panels without any coding, as well as a hands-on Javascript/HTML page development environment with plenty of examples for deep customization.

For documentation please see the Bitlash Commander wiki: https://github.com/billroy/bitlash-commander/wiki

Here are screenshots of some of the examples that ship with Commander:

![Default Panel - one control for each available Arduino pin ](https://raw.github.com/billroy/bitlash-commander/master/public/images/screenshot-commander.png)

![Panic Button - showing use of an SVG path as a button](https://raw.github.com/billroy/bitlash-commander/master/public/images/screenshot-panic.png)

![Color Lab](https://raw.github.com/billroy/bitlash-commander/master/public/images/screenshot-colorlab.png)

![You want Buttons?](https://raw.github.com/billroy/bitlash-commander/master/public/images/screenshot-buttons.png)

![Button Groups?](https://raw.github.com/billroy/bitlash-commander/master/public/images/screenshot-buttongroups.png)

Here is an overview of the architecture of Bitlash Commander:

![Bitlash Commander Architecture](https://raw.github.com/billroy/bitlash-commander/master/public/images/commander-architecture.png)

The PC Serving and PC Viewing can be, and usually are, on the same PC; the server requires very modest system resources.


## Installing Bitlash on the Arduino

To start, you need to upload Bitlash to the Arduino.  

First, install the Bitlash library from GitHub into your Arduino library folder(see https://github.com/billroy/bitlash/wiki/install).

Second (after restarting the Arduino IDE), connect your arduino and perform these commands in the Arduino IDE:

	File -> Examples -> bitlash -> bitlashdemo
	File -> Upload

This wouldn't be a bad time to connect to Bitlash on the arduino using the Serial Monitor (at 57600 baud) and familiarize yourself with Bitlash a bit.  When you're done, close the Serial Monitor and continue here.

## Installing Bitlash Commander on the PC

# Install Prerequisites: node.js, git, build environment

You need node.js (http://nodejs.org) and optionally git (http://git-scm.com).  Do those installs, and return here.

It's a little easier to get the latest builds of Commander if you use the git method.  It's fine to proceed without git if you don't want the bleeding edge versions.

You also need a compiler and build environment for your platform so that the serial port driver will build successfully.  Follow the guidance for your platform here in the section titled "To Install" before proceeding: https://github.com/voodootikigod/node-serialport


# Install Bitlash Commander

Option 1: If you don't have git installed: in a new terminal window:

	$ npm install bitlash-commander
	$ cd node_modules/bitlash-commander
	$ node index.js


Option 2: If you do have git installed: in a new terminal window:

	$ git clone http://github.com/billroy/bitlash-commander
	$ cd bitlash-commander
	$ npm install
	$ node index.js


In either case, open a web browser on localhost:3000 to see the default control panel.

To start the web server on a different port:

	$ node index.js -p 8080

To specify a serial port for the arduino you would start it this way:

	$ node index.js -s /dev/tty.usbserial-F00D2321

Windows users will need to specify a com port using -s.  On Mac and Linux, the first usb arduino is used unless -s is specified.

To secure the server by requiring a login (edit the user/password table in index.js):

	$ node index.js -l

For help:	
	
	$ node index.js --help
	Usage: node ./index.js [flags]
	
	Options:
	  -p, --port        TCP port for the http server (3000)                    
	  -s, --serialport  port for usbserial arduino connection                  
	  -b, --baud        baud rate for usbserial arduino connection (57600)     
	  -c, --cache       load cached values on restart                          
	  -r, --redis       redis server url in redis-url format                   
	  -x, --rexec       set true to accept remote bitlash commands on socket.io
	  -l, --login       require a valid login to use the server                  [boolean]
	  -u, --update      allow HTTP updates via POST /update/:id/:value         


## Customize

Copy public/index.html to public/new.html and edit new.html to add your controls following the addButton / addSlider examples you will see there.  Then open new.html for testing:

	http://localhost:3000/new.html

Buttons display the value returned by Bitlash in their label.  Make sure your script causes Bitlash to print the output you'd like displayed.

There are many options you can set on the Button and Slider object, though mostly the defaults should work for you.  See Button.init() and Slider.init().

## The "Script" field

The script field of a control contains the Bitlash code you want executed when the button is pressed or the slider is moved.  The text of the script field is sent to Bitlash, and any reply from Bitlash is displayed by the control (if it's a Button).

Here is an example that toggles pin 13 and returns the value of pin 13 by printing it:

	{script:'d13=!d13;print d13'}


### Text substitution using Mustache

You can customize the script sent to Bitlash based on the current value of the control.

Here is an example that sets analog output 5 to the current value of the slider and prints it back as a response message:

	{script:'print a5={{value}}'}

You can use any field of the control object in {{}}.


## Pushing data from Bitlash

It is desirable to be able to update indicators on the control panel without action from the operator.  To do this, Bitlash Commander provides an upstream data channel from Bitlash to the controls on the various web pages open on the server.

To update a control using the upstream JSON channel you must know the control's id.  The easiest way is to assign one when you create the button in the .html file.  In this example from public/push.html, the button has the id 'millis':

	var Panel = new ControlPanel({color:'turquoise'});
	Panel.addButton({id:'millis', x:100, y:100, w:250, text:'millis'});

To update this control from Bitlash you would print a line of this form from a repeating background function:

	{"id":"millis","value":"33861"}

...where 'id' is the id of the control, "millis' in this case, and 'value' is the new value for the control.

Here is a Bitlash utility function to properly format JSON output for any id and value.   Copy and paste this definition into your Bitlash so you can use it below:

	function update {printf("{\"id\":\"%s\",\"value\":\"%d\"}\n", arg(1), arg(2));};

Here is an example of how to call update, and a startup function to trigger it every 1000 ms; copy and paste these, too:

	function pm { update("millis", millis); }
	function startup {run pm,1000;}

If you copy and paste those functions to your Bitlash, you can open the "push.html" file in the distribution to see the millis counter update in action.

	http://localhost:3000/push.html

## Listening for control updates

You can implement side-effects (like playing sounds or updating secondary controls) by listening for control updates.  

The push example in the file public/push.html shows event listeners in use:

	var Panel = new ControlPanel({color:'turquoise'});

	Panel.addButton({id:'millis', x:100, y:100, w:250, text:'millis', script:'print millis'});
	Panel.addButton({id:'clock',  x:100, y:180, w:250, text:'clock', script:''});
	Panel.addButton({id:'clock2', x:100, y:260, w:250, text:'clock2', script:''});

	Panel.controls['millis'].on('update', function(data) {
		Panel.controls['clock'].setValue(data.value);
	});

	Panel.controls['clock'].on('update', function(data) {
		Panel.controls['clock2'].setValue(data.value);
	});



## To Do / Bugs

- defaults should be in the Control, not the control panel
	- how to propagate panel updates
		- delete/re-render after edit

- BUG: update: scripts don't update other controls on the same page
	listening to their matching source
	- must call boss.handleUpdate to get distribution
	- seems to cause an update loop

- text and readout should be mustached
- reverse noreadout


- readout: '{{value}}' instead of noreadout

- knob:
	- NREP: won't rotate without script
	- fixed list of values in value array
	- value field is index into values

- BUG: group render / resize is borked
	- options
		- calculate group w, h from child.w, child.h, numx, numy
			- but then what does resize do?
			- resize changes child size to fill new box 
				with specified numx, numy, and gutters

-->		- calculate child.w and child.h from w, h, numx, numy
			- this can be "invalid" (size can be less than 0)
				- init to plausible values; 1 grid is minimum; force w and h if needed
			- resize changes child size to fill new box
				- min resize is the grid quantum
		
		- calculate numx, numy from w, h, child.w, child.h
			- slack in the gutters

	- more options
		- disallow drag on the group, allow resize of buttons

	- what happens on drag resize of the group?
	- resize a group should...
		- add more buttons
-->		- resize existing buttons
		- change the gutters but leave the buttons as sized

-->	- resize an item in a group should resize all the items and the group wrapper
-->	- move an item in a group should move the group

	- don't touch x,y 
		- adjust origin of outerrect to be at x,y and offset the array from there

- BUG: drag/resize
	- path button doesn't resize
	- group resizes very creatively
	- slider: slide and ybar should resize with control resize

- BUG: slider goes dead after drag (only in some panels)
	- stops receiving updates
	- can't drag the slider

- right-click menus
	- add "save panel" on item edit menu
	- enable context menu in panel face?

- multi panel
	- BUG: All menu commands end up targeted at Panel0
		- Delete a control in any panel but the first fails
		- Same with Duplicate
		- Create a button in Panel7, shows up in Panel0

		- symptom: 'this' is wrong, so this.menuowner is undefined
			- menuowner is set in the correct panel Panel7
			- 'this' is Panel0
			- could save 'menupanel' as well as owner
		- could be raphael dispatching to the first paper in the div
		- seems like Boss could coordinate a fix

- meter control
	- damping factor for animation
	- draw the arc

- scope control
	- time axis marks
	- "scope this"
	- draw vertical connectors for logic signals
	- xy meter
	- multiple sources (source array) (color array)
	- time axis controls (zoom in/out, start/stop, faster/slower)
		- requires point history

- lockdown mode: no menu access

- BUG: knob isn't responsive after edit mode
	- restore handlers

- doc:
	- update: in script
	- knob
	- circle button uses w, h not r (deprecated)
		- so it's really an ellipse
	- source id dispatch
		- source array for groups
	- Meter, Scope
	- radio attribute in groups
	- new frontpage 
	- new install
	- commander sketch	
	- -c and -u
	- ssl
	- group.childopts

- chart: rename target to source, as it should have been

- BUG: path buttons get their w and h set: bug?

- mustache-expand the label text?
	- setText...

- grid fill with small image is costly and does not adapt to grid size
	- try drawing the grid explicitly, at the grid size

- commander page is too big for ipad

- xy sliders
	- BUG: update channel can't handle xvalue, yvalue
	- recenter after command
		- rename to "returnto" and use the value provided as the reset point
		- easing instead of one big jump

- bug: chart svg doesn't update color on a panel stroke change

- BUG: dragging button doesn't drag repeat indicator
	- repeat indicator should be in elts[]
	- or separate remove

- panel label handling
	label should be called text; get rid of label

- group
	- color picker
	- individual button update via highlight instead of readout
		(mega.html)
	- how to add individual button on() handlers?
		or should update be propagated to the group?
	- text group
	- slider group: extend height for readout and label
	- bug: create a group of round buttons in panel editor: buttons don't show
	- bug: drag a group member should drag the parent

- thumbnails for index page

- localhost-only mode

- property editor
	- for button group: decode array attributes from property editor
		- BUG: editing of array attributes is broken
	- broadcast control updates
		- delete the control, force the id, and broadcast update
		-- deleting control requires a separate command?  or a null value?

- edit mode
	- drag resize
	- color picker

- chart control
	- data source periodic run 
	- time axis values ick
	- y axis min/max options
	- multiple data sources [a0,d1,random(100)]
		- best handled with push to the control id
		- control can ignore the update or note it to trigger refresh
	- chart windowing
		http://computationallyendowed.com/blog/2013/01/21/bounded-panning-in-d3.html

- server:
	- for viewer nodes: fetch remote data for a chart on demand

- doc:
	- -i ipclient option and security impact
	- commander front page
	- getting started
	- server options
		- starting and stopping

	- customizing scripts
	- the panel editor

	- panel options
		- channel
		- title x and y

	- javascript: scripts
		- mustache templating

	- link to Commander on bitlash.net
	- button.attr() and slider.attr()
		move()
		toFront()
		- iterates across subelements
		- svg group?
	- examples
	- security & auth

- detect serial port closure and reconnect
	- reconnect button
- detect socket.io port closure and reconnect

- datalogging
	- limit number of points per series
	- integrate with cosm for upload

- controls
	- range slider (slider with two sliders)
	- dropdown selector
	- uploader button: click to upload a bitlash code file or url to the arduino
		- autorunnable
	- image, clickable to start/stop refresh
	- scrolling text panel
	- knob
	- syschat
	- image

- examples
	- synth
	- piano
	- trafficlight
	- security alarm system
	- train set
	- remote doorbell
	- send text command from keyboard
	- lunch bell

- revisit default sizes as % parent width/height

- improve operation without arduino connected

- alert delivery
	- http://fabien-d.github.com/alertify.js/
	- sms
	- email

- multiple arduino support
	- command steering
	- node registry / configuration
	- ip-accept list
		[['bitlash1', '192.168.1.17'], ...]
		- scripts addressed to bitlash1: would go to 192.168.1.17

- Incoming OSC
	- map to controls by id
	