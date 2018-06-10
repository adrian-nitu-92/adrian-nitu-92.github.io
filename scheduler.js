"use strict";

var Scheduler = function () {

	this.done = false;

	/* init */
	justReset = (localStorage.getItem("reset") === "undefined");

	localStorage.setItem("reset", "value");

	Trello.authorize({
		type: 'popup',
		name: 'Getting Started Application',
		scope: {
			read: 'true',
			write: 'true' },
			expiration: 'never',
			success: every5,
			error: console.log
		});
}

