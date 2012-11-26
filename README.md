# CW

CW is a virtual software-defined radio for morse code practice over your local network.

CW works like an internet chat server for morse code: you can send and receive code between separate browsers connected to the server.  It simulates the on-the-air experience over your local network.  (Performance over the open internet is currently poor due to the impact of network path latency jitter.)

The user interface is a simple digital CW radio.  You can send morse using the shift key or by clicking or touching the onscreen transmit button.  You can tune to different frequencies.  There is an FFT spectrum display so you can see signals nearby, and a spectrum waterfall so you can follow recent transmissions.

![The Radio Interface](https://raw.github.com/billroy/cw/master/screenshot.png)

There is a feature for sending practice text; you can send multiple practice texts at once on different frequencies to simulate busy band conditions.

Runs on Safari and Chrome, and the other browsers when they support HTML5 Audio and SVG.  

On iPad you can transmit and see the waterfall, but not receive.  On iPhone, no dice.

### Install and Run

You need Node (http://nodejs.org) and Git (http://git-scm.com)

Node users: if npm isn't working after the node install finishes, check your NODE_PATH.  Here's my .bashrc which sets the path:

	NODE_PATH="/usr/local/lib/node_modules"
	export NODE_PATH

From the command line:

	> git clone http://github.com/billroy/cw
	> cd cw
	> npm install
	> node index.js
	> open http://localhost:3000

You can optionally run on a port other than 3000, for example 8080:

	> node index.js -p 8080

### Keyboard Usage

- Up, Down: increment/decrement frequency, 10 Hz steps
- Left, Right: increment/decrement frequency, 100 Hz steps
- Shift: straight key
- Alt: iambic dit
- Ctrl: iambic dah
- y: enter text or URL to send at current frequency
- i: zoom in fft
- o: zoom out fft


### Alpha "frequencies"

You can enter an alphanumeric frequency that is not a number, like "chatroom23".  Only others with exactly the same frequency will hear your transmissions, and vice versa.

Privacy note: Don't count on this for privacy.  Every client sees every dit, even if you're on a non-numeric channel.


### POSTing text and urls for playback

You can post play requests to the server:

	$ cat testmsg.json 
	{
		"frequency": 7030000,
		"wpm": 20,
		"text": "This is the text of the test message.",
		repeat: 10
	}
	$ curl -X POST -H 'Content-Type:application/json' -d @testmsg.json localhost:3000/tx

If text is a url (begins with http:// or https://), the contents of the url are retrieved and played back, instead of the url.  To play a url, put a blank in front of it.

If the text is an RSS feed url (begins with feed://), the contents of the feed are retrieved and played back.

There is a scripted example named "traffic" in the test/ folder that runs some traffic near 7010000:

	> cd test
	> ./traffic

### Technologies:

HTML5 Audio, Socket.io, Express, Raphael.js, Kibo.js, jQuery

### EC2 Install

(Note: BUG: poor performance due to jitter.  run it on your laptop.)

- Ubuntu 12.04 image

	sudo apt-get install python-software-properties
	sudo add-apt-repository ppa:chris-lea/node.js
	sudo apt-get update
	sudo apt-get install nodejs npm git-core
	git clone https://github.com/billroy/cw
	cd cw
	npm install
	sudo node index -p 80

The script EC2-INSTALL in the distribution will do the above commands for you.

Install "forever" to make node run as a daemon.
	
### TODO:

- BUG: No sound on iPad.  Seems to make the call to start the oscillator but no sound.

- BUG: Ugly latency jitter on Heroku and EC2
	even with tcp proxy (though somewhat better)
	- bug: streams json packets together.  need packet separator.

	- consider sending whole elements {elt:'dit', wpm:15}
		- half the traffic
		- works well for iambic
		- have to wait for keyup from straight key
		- still has interelement timing problems

- BUG: stuck iambic paddle on rolloff

- BUG: baby waterfall pixels aren't perfect length

- BUG: 300 ms wait time on iPad makes it hard to send accurately

- @sources
	- @tick tick server
	- @echo echo server
	- @dir:name play-file server: @dirname gives random content from dirname
	- @serial: server serial input -> morse @ frequency...

- 'z' to zero beat the tuning
- handle window resize events
- command from client to stop traffic
- visible display bandwidth zoom controls
- privacy: filter packets on the server
- handle server down/up better
- farnsworth spacing
- sidetone control 300-900 step 50	
- mute
- button board
- color picker
- audio band pass control
- url query string -> frequency
- wpm control for iambic
- big red iambic buttons in the UI
- iambic on mouse right click
- noise
