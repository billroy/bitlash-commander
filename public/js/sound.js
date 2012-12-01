//
// sound.js: Bitlash Commander sound effects
//
//	Copyright 2012 Bill Roy (MIT License; see LICENSE file)
//

// The sounds used below are from http://www.freesound.org
//

var Sound = {

	sounds: {
		'ping': 		'6164__NoiseCollector.mp3',
		'whoosh': 		'12657_mich3d_Whoosh_2294A7.mp3',
		'klaxon': 		'17468__cognito_perce_1C634D.mp3',
		'whinny':		'18229__dobroide__200_2705E3.mp3',
		'carddrop':		'19244__deathpie__cardDrop2.mp3',
		'shuffle':		'19245__deathpie__shuffle.mp3',
		'warning':		'23512__liquidhot__De_1C637C.mp3',
		'accordion':	'27354_junggle_accordeon_20.mp3',
		'tone':			'34005__jobro__EAS_beep.mp3',
		'tweet':		'35383__UncleSigmund_2198B0_tweet.mp3',
		'tick':			'35687__Bansemer__Clo_1CCE53.mp3',
		'laser':		'39459_THE_bizniss_laser.mp3',
		'squeegee':		'39525_THE_bizniss_SQUEEGEE.mp3',
		'ding':			'41344__ivanbailey__1.mp3',
		'dong:':		'41345__ivanbailey__2.mp3',
		'chalk':		'43548__richymel__tiza.mp3',
		'wind':			'44600__natefreesound_15B5B7.mp3',
		'carddraw':		'45813__themfish__draw_card.mp3',
		'gong':			'46062__reinsamba__gong.mp3'
	},
	

	jPlayer: null,
	initialized: false,
	ready: false,
	
	init: function() {
		$('#player').jPlayer({
			ready: function () {
				console.log('jplayer ready:', this);
				this.ready = true;
			},
			supplied: 'mp3',
			swfPath: 'js/jplayer/Jplayer.swf',
			solution: 'html,flash'
		});
		this.initialized = true;
	},

	play: function(soundid) {
		if (!this.initialized) this.init();
		if (!this.sounds[soundid]) return;
		var url = 'sound/' + this.sounds[soundid];
		console.log('play:', soundid, url);
		var player = $('#player');
		player.jPlayer('clearMedia');
		player.jPlayer('setMedia', { mp3: url });
		player.jPlayer('play');
	}
}





