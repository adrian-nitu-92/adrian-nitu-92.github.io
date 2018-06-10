"use strict";

var Scheduler = function () {

	this.getUntagged = function(){
		return [];
	}

	/* init */
	this.done = false;
	this.lists = {};
	var scheduler = this;

	justReset = (localStorage.getItem("reset") === "undefined");

	localStorage.setItem("reset", "value");

	setTimeout(function(){Trello.authorize({
		type: 'popup',
		name: 'Getting Started Application',
		scope: {
			read: 'true',
			write: 'true' },
			expiration: 'never',
			success: function() {every5(scheduler);},
			error: console.log
		});}, 0);
}
