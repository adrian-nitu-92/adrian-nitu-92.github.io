"use strict";

var Scheduler = function (initEndedCallback) {

	this.getUntagged = function(){
		return [];
	}

	this.secondStageInit = function(){
		var time = this.time;
		moved = false;

		var maxInt = Number.MAX_SAFE_INTEGER;

		scoreMultiplier = {};
		mult = 1.5;
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

		var maxTaskDay = 25;

		this.lists["Today"]    = new List("Today",       time.today.start, time.tomorrow.start,    time.today.len,  ONCE_A_DAY,       null,      null,  sortTime,                           maxTaskDay,         5, time);
		this.lists["Tomorrow"] = new List("Tomorrow", time.tomorrow.start,   time.tomorrow.end, time.tomorrow.len,  ONCE_A_DAY,    "Today",    "Week", sortScore,                           maxTaskDay,         5, time);
		this.lists["Week"]     = new List("Week",       time.tomorrow.end,       time.week.end,     time.week.len,  ONCE_A_DAY, "Tomorrow",   "Month", sortScore, maxTaskDay * (time.daysInThisWeek-1),        15, time);
		this.lists["Month"]    = new List("Month",          time.week.end,      time.month.end,    time.month.len, ONCE_A_WEEK,     "Week", "3 Month", sortScore,                                  200,        25, time);
		this.lists["3 Month"]  = new List("3 Month",       time.month.end,    time._3month.end,  time._3month.len, ONCE_A_WEEK,    "Month", "6 Month", sortScore,                                  250,        25, time);
		this.lists["6 Month"]  = new List("6 Month",     time._3month.end,    time._6month.end,  time._6month.len, ONCE_A_WEEK,  "3 Month",    "Year", sortScore,                                  300,        25, time);
		this.lists["Year"]     = new List("Year",        time._6month.end,       time.year.end,     time.year.len, ONCE_A_WEEK,  "6 Month",  "3 Year", sortScore,                                  350,        25, time);
		this.lists["3 Year"]   = new List("3 Year",         time.year.end,     time._3year.end,   time._3year.len, ONCE_A_WEEK,     "Year", "One Day", sortScore,                                  400,        25, time);
		this.lists["One Day"]  = new List("One Day",      time._3year.end,              maxInt,            maxInt,       NEVER,   "3 Year",      null, sortScore,                               maxInt, undefined, time);
		this.lists["Inbox"]    = new List("Inbox",                      0,              maxInt,            maxInt,       NEVER,       null,      null, sortScore,                               maxInt, undefined, time);
		this.lists["Done"]     = new List("Done",                       0,              maxInt,            maxInt,       NEVER,       null,      null, sortScore,                               maxInt, undefined, time);
		boardSelect(gItemID, this.lists);

		if(this.initEndedCallback !== undefined)
		{
			this.initEndedCallback();
		}
	}

	/* init */
	this.done = false;
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
