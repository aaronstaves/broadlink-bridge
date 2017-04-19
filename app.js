'use strict';

let broadlink = require('broadlinkjs');
let express   = require('express');
let mkdirp    = require('mkdirp');
let fs        = require('fs');

var rmpro;
var adapter = new broadlink();
var app       = new express();

var timer;
var timeout;
var curButton;
var curRemote;


// broadlink adapter ready
adapter.on("deviceReady", (dev) => {

	// global rmpro
	rmpro = dev;

	// IR command received
	rmpro.on("rawData", (data) => {

		// clear everthing, but store our current data
		clearTimeout(timeout);
		clearInterval(timer);
		let button = curButton;
		let remote = curRemote;
		curButton = undefined;
		curRemote = undefined;

		console.log(data);

		// make dir for remote
		mkdirp("remotes/"+remote, function (err) {
			if (err) console.error(err);

			// write button file
			fs.writeFile("remotes/"+remote+"/"+button, data, function(err) {

				if(err) {
					return console.log(err);
				}
				else {
					console.log('The command "' + button + '" was saved for *' + remote + '* remote');
				}
			});
		});
	});
});

// broadlink init
adapter.discover();


// Execute command from button
app.get('/remote/:remote/:button', function(req, res) {

	let remote = req.params.remote.toLowerCase();
	let button = req.params.button.toLowerCase();

	console.log('pushing "' + button + '" on *' + remote + '* remote');

	// find command
	fs.readFile("remotes/"+remote+"/"+button, function(err, cmd) { 
		if ( err ) {
			console.error(err.stack);
			res.status(500).send('whoops!')
		}
		else {

			// send data
			rmpro.sendData( new Buffer(cmd));
			res.send('OK');
		}
	});

});


// learn command
app.get('/learn/:remote/:button', function(req, res) {

	// if we're not in the middle of a button already
	if (curRemote !== undefined ) {
		res.status(500).send("cannot learn! already learning a button!");
	}
	else {

		// set current data
		curRemote = req.params.remote.toLowerCase();
		curButton = req.params.button.toLowerCase();
		console.log('learning "' + curButton + '" on *' + curRemote + '* remote');

		// setup a timer to check for new IR data
		timer = setInterval(function(){
			console.log("waiting for remote...");
			rmpro.checkData();
		}, 1000);

		// set a mega timeout to kill everything
		timeout = setTimeout(function() {
			console.log('Took too long to receive IR command, quitting');
			clearInterval(timer);
			curRemote = undefined;
			curButton = undefined;
		}, 30000);

		// start leraning and give something to the frontend
		rmpro.enterLearning();
		res.send('OK');
	}
});


// start server
var port = process.env.PORT || 3000;
app.listen(port, function () {
	console.log('broadlink bridge started on port ' + port)
})
/*

	var RokuPower;

	var timer = setInterval(function(){

		//console.log(RokuPower);
		if ( RokuPower !== null ) {
			//console.log(RokuPower);
		}
		/*
		console.log("send check!");
		dev.checkData();
	}, 1000);

});
*/


