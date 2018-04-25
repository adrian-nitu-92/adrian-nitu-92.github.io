"use strict";
var TrelloApi = function() {

	this.parseTasks = function (list) {
		var cards = list.cards;	
		//once a day, parse everything, then, if no error from subsumate occured, store all above month
		//this includes updating and adding calendar events
		for(var c in cards){
			var card = cards[c];
			if(card.mit){
				list.mitCount = list.mitCount + 1;
			}
			if(card.dueComplete) {
				card.dueCompleteProcess();
				continue;
			}

			if(list.shouldUpdate()) {
				addToGcal(card);
			}
		}
		return true;
	};
};

var sortPos = function(a,b){
	return a.pos - b.pos;
};

var sortTime = function(a,b){
	var a1 = a.date;
	var b1 = b.date;
	if(a.mit || b.mit) {
		if(!(a.mit && b.mit)) {
			if(a.mit) {
				return -1;
			}
			return +1;
		}
	}
	if(a.date === b.date) {
		return sortPos(a,b);
	}
	return a.date-b.date;
};

var sortScore = function(a,b) {
	if(a.size === b.size) {
		return sortTime(a,b);
	}
	return b.size - a.size;
};

var trelloApi = new TrelloApi();
