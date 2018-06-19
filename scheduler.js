"use strict";

var Scheduler = function (initEndedCallback) {

	var scheduler = this;

	this.getFirstNotPrioList = function(){
		addError("unimplemented getFirstNotPrioList");
		return Object.values(this.lists.Today.cards);
	}

	this.getUntagged = function(){
		addError("unimplemented getUntagged");
		return [];
	}

	this._network_boardSelect = function(){
		var lists = this.lists;
		var curry = function(listName){
			var tarray = scheduler.requiredLists.slice(0);
			tarray.push("Done");
			if( ! tarray.includes(listName) ){
				scheduler.listsWaiting = scheduler.listsWaiting - 1;
				if(scheduler.initEndedCallback !== undefined && scheduler.listsWaiting === 0)
				{
					setTimeout(scheduler.initEndedCallback(scheduler), 100);
				}
				return done;
			}
			return function(answer, list) {
				var cards = {};
				for(var i in answer){
					var card = answer[i];
					cards[card.id] = new Card(card, lists[listName], lists["Inbox"], lists["Done"]);
				}
				lists[listName].cards = cards;
				lists[listName].cardCount = Object.keys(cards).length;
				scheduler.listsWaiting = scheduler.listsWaiting - 1;
				if(scheduler.initEndedCallback !== undefined && scheduler.listsWaiting === 0)
				{
					setTimeout(scheduler.initEndedCallback(scheduler), 100);
				}
				done();

			};
		};

		var _network_document_success = function(answer) {
			for(var i in answer){
				var list = answer[i];

				if(lists[list.name] === undefined){
					addWarning("undefined list detected");
					console.log(list);
					lists[list.name] = list;
				} else {
					Object.assign(lists[list.name], list);
				}

				var listID = lists[list.name].id;
				Trello.get('/lists/'+ listID +'/cards', curry(list.name), console.log);
				scheduler.listsWaiting = scheduler.listsWaiting + 1;
			}
		};

		Trello.get('/boards/51d3f043a536c77a09000a40/lists', _network_document_success, console.log);

		console.log(lists);

	}

	this.secondStageInit = function(){
		var time = this.time;
		this.moved = false;

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
		this._network_boardSelect();

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

	this.doOver = function(name){
		if(this.moved){
			// dont sort if at least one card has been moved
			return;
		}
		if(incrementator[name] < arraySortedBySize[name].length){
			var card = arraySortedBySize[name][incrementator[name]];
			incrementator[name] = incrementator[name] +1;
			var cVal = arraySortedByPos[name].indexOf(card);
			var value = "bottom";

			debug(sortingDebug, "Sorting");
			debug(sortingDebug, card.name + " " + card.size);
			Trello.put('/cards/' + card.id + "/pos",{"value":value},
				function(){scheduler.doOver(name)}, console.log);
		}
	}

	this.sort = function(list) {
		var name = list.name;
		var cards = list.cards;
        var arrayCards = Object.keys(cards).map(function(key) {
            return cards[key];
        });
        arraySortedByPos[name] = arrayCards.slice(0);
        arraySortedByPos[name].sort(sortPos);
        arraySortedBySize[name] = arrayCards.slice(0);
        var sortFunc = list.sortFunction;
        arraySortedBySize[name].sort(sortFunc);
        var s1 = arraySortedByPos[name].map(function(el) {
            return el.size;
        }).toString();
        var s2 = arraySortedBySize[name].map(function(el) {
            return el.size;
        }).toString();
        if (s1 != s2) {
            console.log(name + " is not sorted!");
            incrementator[name] = 0;
            this.doOver(name);
            return true;
        }
	}

	/* init */
	this.mode = CORE;
	this.moved = false;

	this.listsWaiting = 0;

	this.requiredLists = ["Today", "Tomorrow", "Week", "Month", "3 Month", "6 Month", "Year", "3 Year", "Inbox", "One Day"];

	this.graphList = this.requiredLists.slice(0,-2);

	this.lists = {};
	this.time = new Time();
	this.initEndedCallback = initEndedCallback;

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


var incrementator = {};

var arraySortedByPos = {};
var arraySortedBySize = {};