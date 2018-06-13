"use strict";
var EVERYTIME = "EVERYTIME";
var ONCE_A_DAY = "ONCE_A_DAY";
var ONCE_A_WEEK = "ONCE_A_WEEK"
var NEVER = "NEVER";

var reqCounter = 0;

var debugCanTakeCard = false;
var debugReasign = false;

var List = function(name, start, end, duration, updateFrequency, previous, next,
	sortFunction, maxCount, maxMitCount, time) {
	this.addListsData = function() {
		listsData[name] = {
			"name" :          this.name,
			"start": new Date(this.start),
			"end"  : new Date(this.end),
			"ticks": this.ticks,
			"sizes" : {}
		};

	}

	this.shouldUpdate = function() {
		return  this.sumTicks > this.ticks ||
			    this.updateFrequency === EVERYTIME ||
			   (this.updateFrequency === ONCE_A_DAY && onceADayFlag) ||
			   (this.updateFrequency === ONCE_A_WEEK && onceAWeekFlag);
	}

	this.takeCardFrom = function(card, list) {
		reqCounter = reqCounter +1;
		this.sumTicks += card.tick;
		this.cardCount = this.cardCount +1;
		if(card.mit){
			this.mitCount = this.mitCount + 1;
		}
		if(list.end < this.end){
			list.cardCount = list.cardCount - 1;
			list.sumTicks -= card.tick;
		}

		this.cards[card.id] = card;
		delete list.cards[card.id];
		var ccc = this.counts[card.label];
		if (ccc === undefined){
			ccc = 0;
		}
		this.counts[card.label] = ccc + 1;
		var arrayCards = Object.values(this.cards);
		arrayCards.sort(this.sortFunction);

		var iof = arrayCards.indexOf(card);
		if(iof < 0){
			throw "die";
		}
		var value = 0;
		if(iof === 0) {
			value = "top";
		} else if(iof === arrayCards.length - 1) {
			value = "bottom";
		} else {
			value = arrayCards[iof-1].pos/2 + arrayCards[iof+1].pos /2;
		}
		this._enqueue(card.id, value);

		moved = true;
	}
	this._enqueue= function(id, value){
		var cardid = id;
		var listid = this.id;
		setTimeout(function(){
			Trello.put('/cards/' + cardid + "/idList",{"value":listid}, console.log, console.log);
			Trello.put('/cards/' + cardid + "/pos",{"value":value}, console.log, console.log);
			reqCounter = reqCounter -1;
		 }, (reqCounter - 1) * 250);
		}

	this.canTakeCard = function(card) {
		var lists = scheduler.lists;
		var percGap = this.percGap;
		var flatGap = this.flatGap;
		var mitGap  = (this.maxMitCount * this.percGap);
		var cardTick = 0.125;
		debug(debugCanTakeCard, "debugging can take card for card:")
		debug(debugCanTakeCard, card.name);

		// card can be undefined for a generic test
		if(card !== undefined){
			var clist = lists[card.listname];
			var nnclist = lists[clist.next];
			if(nnclist !== undefined && card.date > nnclist.end) {
				debug(debugCanTakeCard, "don't move more than 1 list away");
				return false;
			}

			if(card.date <= this.end) {
				// if the task must be done now, the gaps should be 0
				percGap = 0.0;
				flatGap = 0;
				mitGap  = 0;
			}
			var nnlist = lists[this.next];
			if(nnlist !== undefined && card.date > nnlist.end) {
				debug(debugCanTakeCard, "don't move more than 1 list away");
				return false;
			}
			cardTick = card.tick;

			if (card.mit &&
				this.mitCount + 1 > (this.maxMitCount - mitGap)) {
				debug(debugCanTakeCard, "mit check failed");
				debug(debugCanTakeCard, this.mitCount);
				debug(debugCanTakeCard, (this.maxMitCount - mitGap));
				return false;
			}
		}
		if (this.sumTicks + flatGap + cardTick > this.ticks){
			debug(debugCanTakeCard, "flat tick check failed");
			return false;
		}

		if (this.sumTicks + cardTick > (this.ticks * (1-percGap))) {
			debug(debugCanTakeCard, "Perc tick check failed");
			return false;
		}

		if (this.cardCount + 1 > (this.maxCount * (1-percGap))){
			debug(debugCanTakeCard, "count check failed");
			return false;
		}

		if(card !== undefined) {
				debug(debugCanTakeCard, card.name + " can fit into " + this.name);
				debug(debugCanTakeCard, this.sumTicks + "+" + flatGap + "+" + cardTick + "<" + this.ticks);
				debug(debugCanTakeCard, this.sumTicks + "+" + cardTick + "<" + (this.ticks * (1-percGap)));
				debug(debugCanTakeCard, "=======================");
			}
		return true;
	}

	this.reasign_card_to_proper_list = function(lists) {
		var prevListName = this.previous;
		if(prevListName === null) {
			return true;
		}
		console.log(this.name);
		var lists = scheduler.lists;
		var flag = ["Today", "Tomorrow", "Week", "Next Week"].indexOf(this.name) === -1;
		var prevList = lists[prevListName];
		var nnlist = lists[this.next];
		var targetListId = prevList.id;
		var inbox = lists["Inbox"];
		var cards = this.cards;
		debug(debugReasign, "debug reasign");
		for(var c in cards){
			var card = cards[c];
			debug(debugReasign, card.name);
			var due = new Date(card.date).getTime();
			debug(debugReasign, new Date(due));
			if(due < this.start){
				debug(debugReasign, "before start");
				if(prevList.canTakeCard(card)) {
					prevList.takeCardFrom(card, this);
				} else {
					if(card.mit){
						addError("MIT's must be moved. Make room for <b>" + card.name + "</b>");
						return false;
					}
					inbox.takeCardFrom(card, this);
				}
			}
			else {
				if(nnlist !== undefined){
					debug(debugReasign, "nnlist " + nnlist.name);
					if(due > nnlist.end){
						console.log("too early");
						nnlist.takeCardFrom(card, this);
						continue;
					}
					debug(debugReasign, "this.end " + new Date(this.end));
					if(due > this.end){
						debug(debugReasign, "after end");
						if(this.sumTicks - card.tick > this.ticks - this.flatGap){
							console.log("no time");
							nnlist.takeCardFrom(card, this);
							continue;
						}
						if(this.sumTicks - card.tick > (this.ticks * (1-this.percGap))){
							console.log("no time");
							nnlist.takeCardFrom(card, this);
							continue;
						}
						if(this.cardCount - 1 > (this.maxCount * (1-this.percGap))){
							console.log("no count");
							nnlist.takeCardFrom(card, this);
							continue;
						}
						console.log(this.mitCount - 1);
						console.log((this.maxMitCount * (1-this.percGap)));
						if(card.mit &&
							this.mitCount - 1 > (this.maxMitCount * (1-this.percGap))){
							console.log("no mit count");
							nnlist.takeCardFrom(card, this);
							continue;
						}
					}
					if(flag &&
					 (card.tick > prevList.ticks/4) &&
					 toTicks(due - prevList.end) < Math.min(prevList.ticks, 7*24)){
						addWarning("I need you to split <b>" + card.name + "</b><br/>");
					}
				}
				else {
					debug(debugReasign, "no nnlist");
				}
			}
		}
		return true;
	}

	this.name = name;
	this.start = start;
	this.end = end;
	this.sumTicks = 0;
	this.ticks = duration;
	this.updateFrequency = updateFrequency;
	this.previous = previous;
	this.next = next;
	this.sortFunction = sortFunction;
	this.cardCount = 0;
	this.maxCount = Math.min(maxCount, 1.5 * duration);
	this.counts = {};
	this.mitCount = 0;
	this.maxMitCount = maxMitCount;
	this.percGap = 0.1; // 10% default free
	this.flatGap = 2;   // 2 hours free, by default

	this.addListsData();

	this.weekCount = 1;

	if(["Month", "3 Month", "6 Month", "Year", "3 Year"].indexOf(this.name) >= 0){
		var aux = time.week.end;

		while(aux + time.weekLengthInMs < this.end) {
			aux = aux + time.weekLengthInMs;
			this.weekCount = this.weekCount + 1;
		}
	}
	graph.initCount(this.name, this.ticks);

};

var toTicks = function(x) {
	return x / (1000 * 60 * 60);
}
