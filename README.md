# Bitlash Commander

Bitlash Commander is a node.js web interface toolkit for Arduino.  It serves a web page containing buttons and slider controls, easily customized, which trigger Bitlash scripts you specify to control the Arduino over the usb-serial link.

![screenshot](https://raw.github.com/billroy/bitlash-commander/master/screenshot.png)

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

	var Panel = new ControlPanel({color:'turquoise'})
		.addButton({id:'millis', x:100, y:100, w:250, text:'millis'});

To update this control from Bitlash you would print a line of this form from a repeating background function:

	{"id":"millis","value":"33861"}

...where 'id' is the id of the control, millis in this case, and 'value' is the new value for the control.

Here is a Bitlash utility function to properly format JSON output for any id and value.   Copy and paste this definition into your Bitlash so you can use it below:

	function update {printf("{\"id\":\"%s\",\"value\":\"%d\"}\n", arg(1), arg(2));};

Here is an example of how to call update, and a startup function to trigger it every 1000 ms; copy and paste these, too:

	function pm { update("millis", millis); }
	function startup {run pm,1000;}

If you copy and paste those functions to your Bitlash, you can open the "push.html" file in the distribution to see the millis counter update in action.

	http://localhost:3000/push.html


## To Do

- BUG: reply_handler race between bitlash.exec() and reply firing
	- still happens under load

- button
	- BUG: no display indication that a repeat button is repeating

- reply from bitlash should have
	id
	value: (value of reply)
	where to fit channel id
	
- BUG: click on text of repeating button doesn't stop it

- startup initialization
	- pinmode / startup script / functions on bitlash
	- initial control values
	- or is it just another button?
	- auto-run specified buttons at startup

- collect data cache on server
	- avoid rebroadcast on sync
	- handle per-channel sync
	- enables server-driven charting across all nodes

- doc:
	- button.on(), slider.on()
	- panel options
		- channel
	- button and slider options	
	- link to Commander on bitlash.net

- reconnect serial port on close
	- reconnect button

- controls
	- chart
	- LED bargraph

- revisit default sizes as % parent width/height

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
	- would benefit from arduino push

- scrolling log panel
