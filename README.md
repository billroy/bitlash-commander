# Bitlash Commander

Bitlash Commander is a node.js web interface toolkit for Arduino.  It serves a web page containing buttons and slider controls, easily customized, which trigger Bitlash scripts you specify to control the Arduino over the usb-serial link.

![screenshot](https://raw.github.com/billroy/bitlash-commander/master/screenshot.png)

Here is an overview of the architecture of Bitlash Commander:

![architecture](https://raw.github.com/billroy/bitlash-commander/master/public/images/commander-architecture.png)

The PC Serving and PC Viewing can be, and usually are, on the same PC; the server requires very modest system resources.


## Install: Arduino

You need to upload Bitlash to the Arduino.  Install Bitlash (see https://github.com/billroy/bitlash/wiki/install) , then (after restarting the Arduino IDE), connect your arduino and perform these commands in the Arduino IDE:

	File -> Examples -> bitlash -> bitlashdemo
	File -> Upload

NOTE: The default control panel requires you to enter this startup function on the Arduino in order for the buttons in the Toggle column to work correctly.  In a serial monitor,Copy and paste this into Bitlash:

	> function startup {pinmode(2,1);pinmode(4,1);pinmode(7,1);pinmode(8,1);pinmode(12,1);};

You only need to do this once.


## Install: PC

You need node.js (http://nodejs.org) and git (http://git-scm.com).

In a new terminal window:

	$ git clone http://github.com/billroy/bitlash-commander
	$ cd bitlash-commander
	$ npm install
	$ node index.js

Open a web browser on localhost:3000 to see the default control panel.

To start the web server on a different port:

	$ node index.js -p 8080

To specify a serial port:

	$ node index.js -s /dev/tty.usbserial-F00D2321

For help:	
	
	$ node index.js --help
	Usage: node ./index.js [flags]
	
	Options:
	  -p, --port        port for the http server             
	  -s, --serialport  port for usbserial arduino connection

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

Here is an example that sets analog output 5 to the current value of the slider:

	{script:'a5={{value}}'}

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

	Panel.addButton({id:'millis', x:100, y:100, w:250, text:'millis', script:'print millis'})
	Panel.addButton({id:'clock',  x:100, y:180, w:250, text:'clock', script:''})
	Panel.addButton({id:'clock2', x:100, y:260, w:250, text:'clock2', script:''});

	Panel.controls['millis'].on('update', function(data) {
		Panel.controls['clock'].setValue(data.value);
	});

	Panel.controls['clock'].on('update', function(data) {
		Panel.controls['clock2'].setValue(data.value);
	});



## To Do / Bugs

- chart control
		- data source periodic run 
		- click to run (data source vs. chart update)
		- where to display replies?
		- chart label
			- centered under chart
		- time axis values ick
		- y axis min/max options
		- multiple data sources [a0,d1,random(100)]
			- best handled with push to the control id
			- control can ignore the update or note it to trigger refresh

- BUG: sounds only play once

- BUG: index.html canvas is not wide enough for iPad/iPhone

- BUG: reply_handler race between bitlash.exec() and reply firing
	- still happens under load

- remove reply handler infra

- button
	- BUG: no display indication that a repeat button is repeating
	- invisible button for setup

- BUG: click on text of repeating button doesn't stop it

- startup initialization
	- pinmode / startup script / functions on bitlash
	- initial control values
	- or is it just another button?
		script limit 80 chars
	- auto-run specified buttons at startup

- doc:
	- big picture system data flow
	- panel options
		- channel
	- button and slider options	
		- autorun
	- link to Commander on bitlash.net
	- button.attr() and slider.attr()
		- iterates across subelements
		- svg group?

- detect serial port closure and reconnect
	- reconnect button
- detect socket.io port closure and reconnect

- controls
	- LED bargraph
	- scrolling text panel
	- knob
	- redlight

- examples
	- trafficlight
	- elevator
	- security alarm system

- revisit default sizes as % parent width/height

- better {{}} object for templates
	- date and time

- edit mode
	- edit mode toggle
	- new
	- drag
	- edit
	- delete
	- named control sets
		- save
		- load

- authorization / password protection
- send text command from keyboard
- allow operation without arduino connected

- sound
	- remote doorbell
	- lunch bell
