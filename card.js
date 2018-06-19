"use strict";
var Card = function(cardObject, list, inbox, done) {

	this._network_updateDesc = function(){
		this.auxObj.eventId = this.eventId;
		this.auxObj.eraseMeNot = this.eraseMeNot;
		var val = JSON.stringify(this.auxObj);
		if(val === "{}"){
			val = "";
			if(this.desc === val) {
				return;
			}
		}
		Trello.put('/cards/' + this.id + "/desc",{"value":val}, console.log, console.log);
	}

	this._network_dueCompleteProcess = function() {
		if(! this.dueComplete ){
			return;
		}
		this.dueComplete = false;
		if(this.repeating) {
			this.date = this.date + this.repeatAfter;
			this.due = this.date;
			addToGcal(this);
			Trello.put('/cards/' + this.id + "/dueComplete",{"value":false}, console.log, console.log);
			Trello.put('/cards/' + this.id + "/due",{"value":this.due}, console.log, console.log	);

			this.inbox.takeCardFrom(this, list);
		} else {
			Trello.put('/cards/' + this.id + "/idList",{"value":this.done.id}, console.log, console.log);
		}
	}

	this._network_reschedule = function() {
		if(this.repeating) {
			this.dueComplete = true;
			this._network_dueCompleteProcess();
		} else {
			var lists = scheduler.lists;
			this.due = lists["Today"].start/2 + lists["Today"].end/2;
			this.date = this.due;
			Trello.put('/cards/' + this.id + "/due",{"value":this.due}, console.log, console.log);
		}
	}

	this._network_scrub = function() {
		if(this.due) {
			Trello.put('/cards/' + this.id + "/due",{"value":"null"}, console.log, console.log);
		}
		this.deleteGoogleEvent();
	}

	this.deleteGoogleEvent = function() {
		if(this.eventId !== undefined) {
			var t = this.eventId;
			this.eventId = undefined;
			this._network_updateDesc();

			_deleteGoogleEvent(t);
		}
	}

	this.delete = function(trello_api) {
		if(trello_api === undefined){
			console.log(new Error().stack);
			throw "Learn the api, please"
		}
		_deleteGoogleEvent(this.eventId);
		if(! this.auxObj.eraseMeNot){
		    delete this.list[this.id];
		    trello_api(delete(this));
		} else {
			console.log("unbreakable heart");
			console.log(this);
		}
	}

	this._parseLabels = function() {
		var specialLabelConv = {"Challenge":1000, "Grow":850, "Facultate": 750, "Health":600, "Work": 500, "Social":400, "Facultate-TA": 300, "Downtime":100 };
		var convert = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":30,   "Month":4*5*8 , "3 Month":3*4*5*8 , "6 Month":6*4*5*8 , "Year":12*4*5*8 };
		var convCal = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":5*24, "Month":4*7*24, "3 Month":3*4*7*24, "6 Month":6*4*7*24, "Year":12*4*7*24};
		var labels = this.labels;
		var found = 0;
		this.tick = 0.125;
		this.calendarTick = 0.25;
		this.size = 0;
		var labelToAdd = [];
		for(var i in labels){
			var tick = undefined;
			var label = labels[i];
			var ln = label.name;
			if(ln == "MIT"){
				this.mit = true;
			} else if (ln == "Pass"){
				this.pass = true;
			} else if (ln == "Big"){
				this.pass = true;
			} else if (ln == "Medium"){
				this.pass = true;
			} else if (ln == "Small"){
				this.pass = true;
			} else if (ln == "Weekly"){
				this.repeating = true;
				this.repeatAfter = 7 * 24 * 60 * 60 * 1000;
			} else if (ln == "Daily"){
				this.repeating = true;
				this.repeatAfter = 24 * 60 * 60 * 1000;
			} else if (specialLabelConv[ln] !== undefined){
				this.size = this.size + specialLabelConv[ln];
			} else {
				tick = convert[label.name];
				if(tick !== undefined){
					found = found + 1;
					this.tick = tick;
					this.size = this.size + tick;
					this.calendarTick = convCal[label.name];
				}
			}
			if(tick === undefined){
				if(["Challenge", "MIT", "ImportantTask", "Pass"].indexOf(ln) == -1) {
					if(ln !== "Weekly" && ln !== "Daily") {
						labelToAdd.push(ln);
					}
				}
			}
		}
		if(labelToAdd.length == 0) {
			labelToAdd.push("Unlabeled");
		}
		if(this.mit){
			this.size = 1000;
		}
		if(found > 1){
			addError("Card " + JSON.stringify(this) + " is not labeled correctly <br/>");
		}
		for(var i in labelToAdd){
			ln = labelToAdd[i];
			var extra = undefined;
			if (this.repeating){
				extra = "Daily";
				if(this.repeatAfter > 24 * 60 * 60 * 1000){
					extra = "Weekly";
				}
			}
			if(window.graph !== undefined){
				graph.add(this.listname, ln, this.tick/labelToAdd.length, extra);
			}
			var x = this.list.counts[ln];
			if(x === undefined){
				x = 0;
			}
			this.list.counts[ln] = x + 1;
		}
		if(this.dueComplete === false){
			this.list.sumTicks += this.tick;
		}
	}

	this.listname = list.name;
	this.list = list;
	this.inbox = inbox;
	this.done = done;

	Object.assign(this, cardObject);

	this._parseLabels();

	try {
		this.auxObj = JSON.parse(cardObject	.desc);
		Object.assign(this, this.auxObj);
	} catch (err) {
		this.auxObj = {};
	}

	if(this.auxObj.eventId === undefined && this.desc.indexOf("gdoc") != -1) {
		this.eventId = this.desc.split(" -- ")[1];
		this.auxObj.eventId = this.eventId;
		this.auxObj.eraseMeNot = false;
		this._network_updateDesc();
	}

	var nDate = scheduler.lists["Week"].end - 1000;
	this.date = new Date(this.due).getTime();
	if(this.date === 0) {
		this.date = nDate;
	}

};
