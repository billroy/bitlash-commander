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


## To Do

- BUG: reply_handler race between bitlash.exec() and reply firing
	- each control should have its own reply handler
	- need a way to handle command attempts while busy
		- retry?
	- ERROR: call while busy is the symptom.
		- can we queue the command and the callback?
		- nextCommand()
			
- push
	- bitlash sends JSON update:
		{id:'Button1', value:'green'}
	- '{' intercepts it out of the stream for processing
	- arrives as unsolicited input
	- push to json_callback function	

	- should repeat even be happening on the PC side?
		- start a task to send updates
		- perhaps remove repeat

- button
	- inherit from eventemitter for side effects like color changes
	- BUG: no display indication that a repeat button is repeating


- put labels below buttons?
	- full face in color with readout


- BUG: interpage update leak
	- Panel.id?  Panel.channel?
	- channels design
		- exec/update cycle
		- on('update')

- BUG: click on text of repeating button doesn't stop it

- startup initialization
	- pinmode / startup script / functions on bitlash
	- initial control values

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

- send text command from keyboard
- allow operation without arduino connected
- authorization / password protection

- sound
	- remote doorbell
	- would benefit from arduino push

- scrolling log panel
