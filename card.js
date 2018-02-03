"use strict";
var Card = function(cardObject, listname) {

	this.updateDesc = function(){
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

	this.dueCompleteProcess = function() {
		if(! this.dueComplete ){
			return;
		}
		this.dueComplete = false;
		if(this.repeating) {
			var due = new Date(this.due).getTime();
			due = due + this.repeatAfter;
			this.due = due;
			addToGcal(this);
			Trello.put('/cards/' + this.id + "/dueComplete",{"value":false}, console.log, console.log);
			Trello.put('/cards/' + this.id + "/due",{"value":due}, console.log, console.log	);

			lists["Inbox"].takeCardFrom(this, lists[this.listname]);
		} else {
			Trello.put('/cards/' + this.id + "/idList",{"value":lists["Done"].id}, console.log, console.log);
		}
	}

	this.scrub = function() {
		if(this.due) {
			Trello.put('/cards/' + this.id + "/due",{"value":"null"}, function(v){console.log(v);}, function(v){console.log(v);});
		}
		this.deleteGoogleEvent();
	}

	this.deleteGoogleEvent = function() {
		if(this.eventId !== undefined) {
			var t = this.eventId;
			this.eventId = undefined;
			this.updateDesc();

			_deleteGoogleEvent(t);
		}
	}

	this.delete = function() {
		_deleteGoogleEvent(this.eventId);
		if(! this.eraseMeNot)	{
			Trello.delete('/cards/' + this.id, function(v){console.log(v);}, function(v){console.log(v);});
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
		var labelToAdd = undefined;
		for(var i in labels){
			var tick = undefined;
			var label = labels[i];
			var ln = label.name;
			if(ln == "MIT"){
				this.mit = true;
			} else if (ln == "Pass"){
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
					if(ln !== "Weekly" && ln !== "Daily" && labelToAdd === undefined) {
						labelToAdd = ln;
						graph.types.add(ln);
					}
				}
			}
		}
		if(labelToAdd === undefined) {
			labelToAdd = "Unlabeled";
		}
		if(this.mit){
			this.size = 1000;
		}
		var sm = this.getScoreMultiplier();
		this.size = this.size * sm * 10;
		if(found > 1){
			addError("Card " + JSON.stringify(this) + " is not labeled correctly <br/>");
			return false;
		}
		this.label = labelToAdd;
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
		if(due < weekStart) {
			return 10;
		}
		for(var l in requiredLists) {
			var lname = requiredLists[l];
			if(due < lists[lname].end) {
				return scoreMultiplier[lname];
			}
		}
		return 1;
	}

	this.listname = listname;

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
		this.updateDesc();
	}

	var nDate = lists["Week"].end;
	this.date = new Date(this.due).getTime();
	if(this.date === 0) {
		this.date = nDate;
		if(this.listname == "Week") {
			console.log(this);
			this.due = this.date;
			Trello.put('/cards/' + this.id + "/due",{"value":this.due}, console.log, console.log);
		}
	}

};