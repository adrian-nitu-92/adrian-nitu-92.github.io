"use strict";

var Scheduler = function (initEndedCallback) {

	this.getUntagged = function(){
		return [];
	}

	this.secondStageInit = function(){
		var time = this.time;
		moved = false;

		var maxInt = Number.MAX_SAFE_INTEGER;

		var maxTaskDay = 25;

		time.oneDay = {"start": time._3year.end, "end": maxInt, "len": maxInt};
		time.max = {"start": 0, "end": maxInt, "len": maxInt};

		this.lists["Today"]    = new List("Today",       time.today,  ONCE_A_DAY,       null,      null,  sortTime,                           maxTaskDay,         5, time);
		this.lists["Tomorrow"] = new List("Tomorrow", time.tomorrow,  ONCE_A_DAY,    "Today",    "Week", sortScore,                           maxTaskDay,         5, time);
		this.lists["Week"]     = new List("Week",         time.week,  ONCE_A_DAY, "Tomorrow",   "Month", sortScore, maxTaskDay * (time.daysInThisWeek-1),        15, time);
		this.lists["Month"]    = new List("Month",       time.month, ONCE_A_WEEK,     "Week", "3 Month", sortScore,                                  200,        25, time);
		this.lists["3 Month"]  = new List("3 Month",   time._3month, ONCE_A_WEEK,    "Month", "6 Month", sortScore,                                  250,        25, time);
		this.lists["6 Month"]  = new List("6 Month",   time._6month, ONCE_A_WEEK,  "3 Month",    "Year", sortScore,                                  300,        25, time);
		this.lists["Year"]     = new List("Year",         time.year, ONCE_A_WEEK,  "6 Month",  "3 Year", sortScore,                                  350,        25, time);
		this.lists["3 Year"]   = new List("3 Year",     time._3year, ONCE_A_WEEK,     "Year", "One Day", sortScore,                                  400,        25, time);
		this.lists["One Day"]  = new List("One Day",    time.oneDay,       NEVER,   "3 Year",      null, sortScore,                               maxInt, undefined, time);
		this.lists["Inbox"]    = new List("Inbox",         time.max,       NEVER,       null,      null, sortScore,                               maxInt, undefined, time);
		this.lists["Done"]     = new List("Done",          time.max,       NEVER,       null,      null, sortScore,                               maxInt, undefined, time);
		_network_boardSelect(gItemID, this.lists);

		if(this.initEndedCallback !== undefined)
		{
			this.initEndedCallback();
		}
	}

	this.getScoreMultiplier = function() {
		if(this.mit) {
			return 1;
		}
		if(this.due === undefined) {
			return 0.1;
		}
		if (this.due == null){
			return 0.1;
		}
		var due = new Date(this.due).getTime();
		var weekStart = scheduler.time.week.start;
		var lists = scheduler.lists;
		if(due < weekStart) {
			return 10;
		}
		for(var l in this.requiredLists) {
			var lname = this.requiredLists[l];
			if(due < lists[lname].end) {
				return this.scoreMultiplier[lname];
			}
		}
		return 1;
	}

	this.getOverdue = function(){
		var	ret = [];
		var cards = {};
	    Object.assign(cards, this.lists["Today"].cards);
	    Object.assign(cards, this.lists["Inbox"].cards);
	    for(var c in cards){
	        var card = cards[c];
	        if(card.date < this.lists["Today"].start){
	           ret.push(card);
	        }
	    }
	    return ret;
	}

	this.deleteAllCardsIn = function(listname){
		console.log(this.lists[listname]);
	    var cards = this.lists[listname].cards;
	    console.log(cards);
	    for (var c in cards) {
	        var card = cards[c];
	        console.log(card.name);
	        card.delete(trelloApi);
	    }
	}

	/* init */
	this.mode = CORE;

	this.requiredLists = ["Today", "Tomorrow", "Week", "Month", "3 Month", "6 Month", "Year", "3 Year", "Inbox", "One Day"];

	this.graphList = this.requiredLists.slice(0,-2);

	this.scoreMultiplier = {};
	var scoreMultiplier = this.scoreMultiplier;
	var mult = 1.5;
	scoreMultiplier["Today"]    = mult = mult /1.5;
	scoreMultiplier["Tomorrow"] = mult = mult /1.5;
	scoreMultiplier["Week"]     = mult = mult /1.5;
	scoreMultiplier["Month"]    = mult = mult /1.5;
	scoreMultiplier["3 Month"]  = mult = mult /1.5;
	scoreMultiplier["6 Month"]  = mult = mult /1.5;
	scoreMultiplier["Year"]     = mult = mult /1.5;
	scoreMultiplier["3 Year"]   = mult = mult /1.5;
	scoreMultiplier["Inbox"]    = mult = mult /1.5;
	scoreMultiplier["One Day"]  = mult = mult /1.5;

	this.lists = {};
	var scheduler = this;
	this.time = new Time();
	this.initEndedCallback = initEndedCallback;

	justReset = (localStorage.getItem("reset") === "undefined");

	localStorage.setItem("reset", "value");

	setTimeout(function(){Trello.authorize({
		type: 'popup',
		name: 'Getting Started Application',
		scope: {
			read: 'true',
			write: 'true' },
			expiration: 'never',
			success: function() {scheduler.secondStageInit();},
			error: console.log
		});}, 5);
}
