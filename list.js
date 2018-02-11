"use strict";
var EVERYTIME = "EVERYTIME";
var ONCE_A_DAY = "ONCE_A_DAY";
var ONCE_A_WEEK = "ONCE_A_WEEK"
var NEVER = "NEVER";

var reqCounter = 0;

var List = function(name, start, end, duration, updateFrequency, previous, next, sortFunction, maxCount, maxMitCount) {
	this.name = name;
	this.start = start;
	this.end = end;
	this.ticks = duration;
	this.updateFrequency = updateFrequency;
	this.previous = previous;
	this.next = next;
	this.sortFunction = sortFunction;
	this.cardCount = 0;
	this.maxCount = maxCount;
	this.counts = {};
	this.mitCount = 0;
	this.maxMitCount = maxMitCount;
	this.percGap = 0.1; // 10% default free
	this.flatGap = 2;   // 2 hours free, by default

	graph.initCount(this.name, this.ticks);

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
		var percGap = this.percGap;
		var flatGap = this.flatGap;
		var mitGap  = (this.maxMitCount * this.percGap);
		var cardTick = 0.125;

		// card can be undefined for a generic test
		if(card !== undefined){
			// don't move more than 1 list away
			var clist = lists[card.listname];
			var nnclist = lists[clist.next];
			if(nnclist !== undefined && card.date > nnclist.end) {
				return false;
			}

			if(card.date <= this.end) {
				// if the task must be done now, the gaps should be 0
				percGap = 0.0;
				flatGap = 0;
				mitGap  = 0;
			}
			cardTick = card.tick;

			if (card.mit &&
				this.mitCount + 1 > (this.mitCount - mitGap)) {
				return false;
			}
		}
		if (this.sumTicks + flatGap + cardTick > this.ticks){
			return false;
		}

		if (this.sumTicks + cardTick > (this.ticks * (1-percGap))) {
			return false;
		}

		if (this.cardCount + 1 > (this.maxCount * (1-percGap))){
			return false
		}

		if(card !== undefined) {
				console.log(card.name + " can fit into " + this.name);
				console.log(this.sumTicks + "+" + flatGap + "+" + cardTick + "<" + this.ticks);
				console.log(this.sumTicks + "+" + cardTick + "<" + (this.ticks * (1-percGap)));
				console.log("=======================");
			}
		return true;
	}

	this.reasign_card_to_proper_list = function() {
		var prevListName = this.previous;
		if(prevListName === null) {
			return true;
		}
		var flag = this.name !== "Today" && this.name !== "Tomorrow";
		var prevList = lists[prevListName];
		var nnlist = lists[this.next];
		var targetListId = prevList.id;
		var inbox = lists["Inbox"];
		var cards = this.cards;
		for(var c in cards){
			var card = cards[c];
			var due = new Date(card.date).getTime();
			if(due < this.start){
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
				if(nnlist !== undefined && due > nnlist.end){
					nnlist.takeCardFrom(card, this);
					continue;
				}
				if(nnlist !== undefined && due > this.end){
					if(this.sumTicks - card.tick > this.ticks - this.flatGap){
						nnlist.takeCardFrom(card, this);
						continue;
					}
					if(this.sumTicks - card.tick > (this.ticks * (1-this.percGap))){
						nnlist.takeCardFrom(card, this);
						continue;
					}
					if(this.cardCount - 1 > (this.maxCount * (1-this.percGap))){
						nnlist.takeCardFrom(card, this);
						continue;
					}
					if(card.mit &&
						this.mitCount - 1 > (this.maxMitCount * (1-this.percGap))){
						nnlist.takeCardFrom(card, this);
						continue;
					}
				}
				if(flag && card.tick > prevList.ticks/4){
					addWarning("I need you to split <b>" + card.name + "</b><br/>");
				}
			}
		}
		if(prevList.canTakeCard()){
			for(var c in cards) {
				var card = cards[c];
				if(prevList.canTakeCard(card)) {
					prevList.takeCardFrom(card, this);
				} else {
					if(card.mit){
						continue;
					}
					console.log("Stopped at:" + card.name + " from "+this.name);
					break;
				}
			}
		}
		return true;
	}
};
