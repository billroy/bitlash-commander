# Bitlash Commander

Bitlash Commander is a node.js web interface toolkit for your Bitlash-powered Arduino.  It serves a web page containing buttons and slider controls, easily customized, which trigger Bitlash scripts you specify to control the Arduino over the usb-serial link.



## Install

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



## To Do

- don't need monitor control, get rid of it

- button
	- periodic update
	- click to update
	- highlight while pressed using lighter()
	- inherit from eventemitter for side effects like color changes

- reorganize svg-controls.js
- Controls()
	.addButton()
	.addSlider()

- chart
- BUG: control-C doesn't quit the server

- sync sliders and other statuses at startup
- broadcast slider updates
- broadcast button status updates
- reconnect serial port on close

- edit mode
	- edit mode toggle
	- new
	- drag
	- edit
	- delete

- separate the control library
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
