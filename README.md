# Bitlash Commander

Bitlash Commander is a node.js web interface toolkit for your Bitlash-powered Arduino.  It serves a web page containing buttons and slider controls, easily customized, which trigger Bitlash scripts you specify to control the Arduino over the usb-serial link.

![screenshot](https://raw.github.com/billroy/bitlash-commander/master/screenshot.png)

## Install: Arduino

You need to upload Bitlash to the Arduino.  Install Bitlash (see https://github.com/billroy/bitlash/wiki/install) , then (after restarting the Arduino IDE), connect your arduino and perform these commands in the Arduino IDE:

	File -> Examples -> bitlash -> bitlashdemo
	File -> Upload.

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

## Customize

Right now, to add new controls you can add your own addButton and addSlider initialization to public/index.html.

Buttons and Sliders display the value returned by Bitlash in their label.

## The "Script" field

The script field of a control contains the Bitlash code you want executed when the button is pressed or the slider is moved.  The text of the script field is sent to Bitlash, and any reply from Bitlash is displayed by the control.

Here is an example that toggles pin 13 and returns the value of pin 13 by printing it:

	{script:'d13=!d13;print d13'}


### Text substitution using Mustache

You can customize the script sent to Bitlash based on the current value of the control.

Here is an example that sets analog output 5 to the current value of the slider:

	{script:'a5={{value}}'}

You can use any field of the control object in {{}}.


## To Do

- button
	- inherit from eventemitter for side effects like color changes
	- display indication that a repeat button is repeating

- reorganize svg-controls.js
- Controls(c, y, w, h, fill, stroke, ...)
	.addButton()
	.addSlider()

- chart
- BUG: control-C doesn't quit the server

- sync sliders and other statuses at startup
- broadcast slider updates
- broadcast button status updates
- reconnect serial port on close
	- reconnect button

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
- sound
- scrolling log panel

- arduino demo board
	- 8 tracking graph gauges for a0-a7
	- 6 sliders for PWM pins (3,5,6,9,10,11) (outputs)
	- 6 toggles for remaining pins (2,4,7,8,12,13) (outputs)
