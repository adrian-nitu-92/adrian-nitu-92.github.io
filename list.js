"use strict";

var reqCounter = 0;

var debugCanTakeCard = false;
var debugReasign = false;

var List = function(name, timeObject, updateFrequency, previous, next,
	sortFunction, maxCount, maxMitCount, time) {

	this.shouldUpdate = function() {
		return  this.sumTicks > this.maxTicks ||
			    this.updateFrequency === EVERYTIME ||
			   (this.updateFrequency === ONCE_A_DAY && onceADayFlag) ||
			   (this.updateFrequency === ONCE_A_WEEK && onceAWeekFlag);
	}

	this.takeCardFrom = function(card, list) {
		console.assert(card !== undefined && list !== undefined, "Learn the api, please");
		reqCounter = reqCounter +1;
		this.sumTicks += card.tick;
		this.cardCount += 1;
		if(card.mit){
			this.mitCount += 1;
		}
		if(list.end < this.end){
			list.cardCount -= 1;
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
			return;
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

		scheduler.moved = true;
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
		if (this.sumTicks + flatGap + cardTick > this.maxTicks){
			debug(debugCanTakeCard, "flat tick check failed");
			return false;
		}

		if (this.sumTicks + cardTick > (this.maxTicks * (1-percGap))) {
			debug(debugCanTakeCard, "Perc tick check failed");
			return false;
		}

		if (this.cardCount + 1 > (this.maxCount * (1-percGap))){
			debug(debugCanTakeCard, "count check failed");
			return false;
		}

		if(card !== undefined) {
				debug(debugCanTakeCard, card.name + " can fit into " + this.name);
				debug(debugCanTakeCard, this.sumTicks + "+" + flatGap + "+" + cardTick + "<" + this.maxTicks);
				debug(debugCanTakeCard, this.sumTicks + "+" + cardTick + "<" + (this.maxTicks * (1-percGap)));
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
			var due = new Date(card.date).getTime();

			if(due >= this.start && due < this.end){
				continue;
			}

			debug(debugReasign, card.name);
			debug(debugReasign, new Date(due));
			if (due < this.start){
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
				if(nnlist === undefined){
					debug(debugReasign, "no nnlist");
				} else {
					debug(debugReasign, "nnlist " + nnlist.name);
					if(due > nnlist.end){
						debug(debugReasign, "too early");
						nnlist.takeCardFrom(card, this);
						continue;
					}
					debug(debugReasign, "this.end " + new Date(this.end));
					if(due > this.end){
						debug(debugReasign, "after end");
						if(this.sumTicks - card.tick > this.maxTicks - this.flatGap){
							debug(debugReasign, "no flat time");
							nnlist.takeCardFrom(card, this);
							continue;
						} else {
							debug(debugReasign, "flat time");
						}
						if(this.sumTicks - card.tick > (this.maxTicks * (1-this.percGap))){
							debug(debugReasign, "no perc time");
							nnlist.takeCardFrom(card, this);
							continue;
						} else {
							debug(debugReasign, "perc time");
						}
						if(this.cardCount - 1 > (this.maxCount * (1-this.percGap))){
							debug(debugReasign, "no count");
							nnlist.takeCardFrom(card, this);
							continue;
						} else {
							debug(debugReasign, "count");
						}
						console.log(this.mitCount - 1);
						console.log((this.maxMitCount * (1-this.percGap)));
						if(card.mit &&
							this.mitCount - 1 > (this.maxMitCount * (1-this.percGap))){
							debug(debugReasign, "no mit count");
							nnlist.takeCardFrom(card, this);
							continue;
						} else {
							debug(debugReasign, "mit count");
						}
					}
					if(flag &&
					 (card.tick > prevList.maxTicks/4) &&
					 toTicks(due - prevList.end) < Math.min(prevList.maxTicks, 7*24)){
						addWarning("I need you to split <b>" + card.name + "</b><br/>");
					}
				}
			}
		}
		return true;
	}
	this.setCards = function(cardsRaw){
		var cards = {};
		for(var i in cardsRaw){
			var card = cardsRaw[i];
			cards[card.id] = new Card(card, this, scheduler.lists["Inbox"],  scheduler.lists["Done"]);
		}
		this.cards = cards;
		this.cardCount += Object.keys(cards).length;
	}

	this.addLabel = function(label, size, extra){
		var osize = size;
		size = parseFloat("" + size);
		if(size !== size){
			console.assert(false, "size");
		}
		if(this.graphData.sumsCount[label] === undefined){
			this.graphData.sumsCount[label] = 0;
		}

		/* We look at the 3 year to see what labels are valid,
		 * and some lists don't reach the 3 year label list */
		 /* This is a shitty hack */
		if(scheduler.lists["3 Year"].graphData.sumsCount[label] === undefined){
			scheduler.lists["3 Year"].graphData.sumsCount[label] = 0;
		}

		this.graphData.sumsCount[label]  += size;
		this.graphData.sumsCount["Free"] -= size;
		if(extra !== undefined) {
			if(this.graphData.sumsCount[extra][label] === undefined) {
				this.graphData.sumsCount[extra][label] = 0;
			}
			this.graphData.sumsCount[extra][label] += size;
		}
		this.sumTicks += size;
	}

	this.mergeList = function (){
		var lists = scheduler.lists;

		var whatIneedToFillInThisbunch = this.weekCount - 1;

		// TODO this is broken and way too aggresive
		for(var t in this.graphData.sumsCount){
			if (t == "Daily"){
				continue;
			}
			if (t == "Weekly"){
				continue;
			}

			if( this.graphData.sumsCount["Daily"][t] === undefined) {
				this.graphData.sumsCount["Daily"][t] = 0;
			}
			if( this.graphData.sumsCount["Weekly"][t] === undefined) {
				this.graphData.sumsCount["Weekly"][t] = 0;
			}
			if( this.graphData.sumsCount[t] === undefined) {
				this.graphData.sumsCount[t] = 0;
			}
			//this.addLabel(t, 7 * whatIneedToFillInThisbunch * this.graphData.sumsCount["Daily"][t]);
			//this.addLabel(t,     whatIneedToFillInThisbunch * this.graphData.sumsCount["Weekly"][t]);
		}

		if(this.next === null){
			return;
		}
		var nextList = lists[this.next];

		if(this.end === nextList.end){
			console.assert(nextList.cardCount == 0);
		}

		nextList.cardCount += this.cardCount;

		var extraAdd = nextList.weekCount - this.weekCount;
		var order = scheduler.requiredLists;

		for(var t in this.graphData.sumsCount){
			if (t == "Daily"){
				continue;
			}
			if (t == "Weekly"){
				continue;
			}

			//nextList.addLabel(t, this.graphData.sumsCount[t]);

			if(nextList.graphData.sumsCount["Daily"][t] === undefined) {
			   nextList.graphData.sumsCount["Daily"][t] = 0;
			}
			if(nextList.graphData.sumsCount["Weekly"][t] === undefined) {
			   nextList.graphData.sumsCount["Weekly"][t] = 0;
			}

			//nextList.addLabel(t, 7 * extraAdd * this.graphData.sumsCount["Daily"][t]);
			//nextList.addLabel(t,     extraAdd * this.graphData.sumsCount["Weekly"][t]);

			for (var l in scheduler.lists){
				var ll = scheduler.lists[l];
				break;
				if(order.indexOf(l) < 0){
					continue;
				}
				if(order.indexOf(l) <= order.indexOf(this.name)){
					continue;
				}
				if(scheduler.lists[l].graphData.sumsCount["Daily"][t] === undefined) {
				   scheduler.lists[l].graphData.sumsCount["Daily"][t] = 0;
				}
				if(scheduler.lists[l].graphData.sumsCount["Weekly"][t] === undefined) {
				   scheduler.lists[l].graphData.sumsCount["Weekly"][t] = 0;
				}

				scheduler.lists[l].addLabel(t, 7 * extraAdd * this.graphData.sumsCount["Daily"][t]);
				scheduler.lists[l].addLabel(t,     extraAdd * this.graphData.sumsCount["Weekly"][t]);

			}
		}

	}

	this.name = name;
	this.start = timeObject.start;
	this.startString = "" + new Date(timeObject.start);
	this.end = timeObject.end;
	this.endString = "" + new Date(timeObject.end);
	this.maxTicks = timeObject.len;
	this.sumTicks = 0;
	this.updateFrequency = updateFrequency;
	this.previous = previous;
	this.next = next;
	this.sortFunction = sortFunction;
	this.cardCount = 0;
	this.maxCount = Math.min(maxCount, 1.5 * this.maxTicks);
	this.counts = {};
	this.mitCount = 0;
	this.maxMitCount = maxMitCount;
	this.percGap = 0.1; // 10% default free
	this.flatGap = 2;   // 2 hours free, by default

	this.weekCount = 1;

	this.graphData = {
			"name"      : this.name,
			"start"     : new Date(this.start),
			"end"       : new Date(this.end),
			"ticks"     : this.maxTicks,
			"sizes"     : null,
			"sumsCount" : {
				"Daily" : {},
			   "Weekly" : {},
			     "Free" : this.maxTicks,
			}
		};

	this.graphData.sizes = this.graphData.sumsCount;

	if(["Month", "3 Month", "6 Month", "Year", "3 Year"].indexOf(this.name) >= 0){
		var aux = time.week.end;

		while(aux + time.weekLengthInMs < this.end) {
			aux = aux + time.weekLengthInMs;
			this.weekCount = this.weekCount + 1;
		}
	}
};

var toTicks = function(x) {
	return x / (1000 * 60 * 60);
}
