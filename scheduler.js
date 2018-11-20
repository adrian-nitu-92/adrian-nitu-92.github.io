"use strict";

var Scheduler = function (initEndedCallback) {

	var scheduler = this;

	this.getFirstNotPrioList = function(){
		for (var n in scheduler.requiredLists) {
			var name = scheduler.requiredLists[n];
			var list = scheduler.lists[name];
			if(list.bigCount === 1 && list.medCount === 3 && list.smallCount === 5) {
				continue;
			}
			if(list.bigCount + list.medCount + list.smallCount === Object.keys(list.cards).length) {
				continue;
			}
			if(list.name === "Today" && this.time.currentHour >= 10) {
				continue;
			}
			return list;
		}
		return null;
	}

	this.getUntagged = function(){
		for (var n in scheduler.requiredLists) {
			var name = scheduler.requiredLists[n];
			var list = scheduler.lists[name];
			var untagged = list.getUntagged();
			if(untagged.length != 0) {
				return {"name":list.name, "cards":untagged};
			}
		}
		return undefined;
	}

	this.almost_done = function() {
		scheduler.listsWaiting = scheduler.listsWaiting - 1;
		if(scheduler.listsWaiting !== 0) {
			return;
		}

		if(done == true){
			var e = new Error();
			console.log(e.stack);
			console.assert(done == false, "Multiple dones");
		}

		for (var n in scheduler.requiredLists) {
			var name = scheduler.requiredLists[n];
			var list = scheduler.lists[name];
			list.mergeList();
		}
		for (var n in scheduler.requiredLists) {
			var name = scheduler.requiredLists[n];
			var list = scheduler.lists[name];
			if(list.cards === undefined) {
				console.log(list.name);
				console.log(list)
				console.assert(false, "Nu ai carti pe o lista");
			}

		}

		if(scheduler.initEndedCallback !== undefined)
		{
			scheduler.initEndedCallback(scheduler);
		}
		this.done = true;
	}

	this._network_boardSelect = function(){
		var lists = this.lists;
		var curry = function(listName){
			var tarray = scheduler.requiredLists.slice(0);
			tarray.push("Done");
			if( ! tarray.includes(listName) ){
				return function(){
					setTimeout(scheduler.almost_done, 0);
				};
			}
			return function(answer) {
				lists[listName].setCards(answer);
				for(var i in lists[listName].cards){
					var card = lists[listName].cards[i];
					scheduler.cards[card.id] = card;
				}
				setTimeout(scheduler.almost_done, 0);
			};
		};

		var _network_label_success = function(answer) {
			scheduler.labels = {};
			scheduler.labelsNames = {};
			for(var i in answer){
				var label = answer[i];
				scheduler.labels[label.id] = label;
				scheduler.labelsNames[label.name] = label;
			}
		};

		var _network_document_success = function(answer) {
			for(var i in answer){
				var list = answer[i];

				if(lists[list.name] === undefined){
					if(false){
						addWarning("undefined list detected");
						console.log(list.name + " undefined");
					}

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
		Trello.get('/boards/51d3f043a536c77a09000a40/labels', _network_label_success, console.log);

		console.log(lists);

	}

	this.secondStageInit = function(){
		var time = this.time;
		this.moved = false;

		var maxInt = Number.MAX_SAFE_INTEGER;

		var maxTaskDay = 25;

		time.oneDay = {"start": time._3year.end, "end": maxInt, "len": maxInt};
		time.max = {"start": 0, "end": maxInt, "len": maxInt};

		this.lists["Today"]    = new List("Today",       time.today,   EVERYTIME,       null,      null,  sortTime,                           maxTaskDay, time);
		this.lists["Tomorrow"] = new List("Tomorrow", time.tomorrow,   EVERYTIME,    "Today",    "Week", sortScore,                           maxTaskDay, time);
		this.lists["Week"]     = new List("Week",         time.week,  ONCE_A_DAY, "Tomorrow",   "Month", sortScore, maxTaskDay * (time.daysInThisWeek-1), time);
		this.lists["Month"]    = new List("Month",       time.month, ONCE_A_WEEK,     "Week", "3 Month", sortScore,                                  200, time);
		this.lists["3 Month"]  = new List("3 Month",   time._3month, ONCE_A_WEEK,    "Month", "6 Month", sortScore,                                  250, time);
		this.lists["6 Month"]  = new List("6 Month",   time._6month, ONCE_A_WEEK,  "3 Month",    "Year", sortScore,                                  300, time);
		this.lists["Year"]     = new List("Year",         time.year, ONCE_A_WEEK,  "6 Month",  "3 Year", sortScore,                                  350, time);
		this.lists["3 Year"]   = new List("3 Year",     time._3year, ONCE_A_WEEK,     "Year", "One Day", sortScore,                                  400, time);
		this.lists["One Day"]  = new List("One Day",    time.oneDay,       NEVER,   "3 Year",      null, sortScore,                               maxInt, time);
		this.lists["Inbox"]    = new List("Inbox",         time.max,       NEVER,       null,      null, sortScore,                               maxInt, time);
		this.lists["Done"]     = new List("Done",          time.max,       NEVER,       null,      null, sortScore,                               maxInt, time);
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
			console.log(trelloApi);
			card.delete(trelloApi);
		}
	}

	this.doOver = function(name){
		if(this.moved || incrementator[name] === arraySortedBySize[name].length){
			// dont sort if at least one card has been moved
			this.listsSorting -= 1;
			return;
		}

		var card = arraySortedBySize[name][incrementator[name]];
		incrementator[name] = incrementator[name] +1;
		var cVal = arraySortedByPos[name].indexOf(card);
		var value = "bottom";

		debug(sortingDebug, "Sorting");
		debug(sortingDebug, card.name + " " + card.size);
		Trello.put('/cards/' + card.id + "/pos",{"value":value},
			function(){setTimeout(scheduler.doOver(name), (this.listsSorting-1)*100);}, console.log);
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
			this.listsSorting += 1;
			this.doOver(name);
			return true;
		}
	}

	/* init */
	this.mode = AMBITIOUS;
	this.moved = false;
	this.done = false;

	this.listsWaiting = 0;
	this.listsSorting = 0;

	this.cards = {};

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

console.assert	= function(cond, text){
	if( cond )	return;
	if( console.assert.useDebugger )	debugger;
	throw new Error(text || "Assertion failed!");
};
var debug = function( ar, mesage){
	if(ar){
		console.log(mesage);
	}
}

var sortingDebug = true;
var onceADayFlag = false;
var onceAWeekFlag = false;

var labelIsAType = function(label){
	if(convert[label] !== undefined) {
		return false;
	}
	return ["ImportantTask", "Pass", "Weekly", "Daily",
	"Big", "Medium", "Small"].indexOf(label) == -1;
}
var specialLabelConv = {"Grow":850, "Facultate": 750, "Health":600, "Work": 500, "Social":400, "Facultate-TA": 300, "Downtime":100 };
var convert = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":40,   "Month":4*5*8 , "3 Month":3*4*5*8 , "6 Month":6*4*5*8 , "Year":12*4*5*8 };
var convCal = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":5*24, "Month":4*7*24, "3 Month":3*4*7*24, "6 Month":6*4*7*24, "Year":12*4*7*24};
