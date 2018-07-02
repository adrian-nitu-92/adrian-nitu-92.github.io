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

	this._network_setLabel = function(label){
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


	this.setDone = function() {
		Trello.put('/cards/' + this.id + "/dueComplete",{"value":true}, console.log, console.log);
	}
	this.setSkipped = function() {
		Trello.put('/cards/' + this.id + "/idList",{"value":this.inbox.id}, console.log, console.log);
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
		    trello_api.deleteCard(this);
		} else {
			console.log("unbreakable heart");
			console.log(this);
		}
	}

	this._parseLabels = function() {
		var labelIsAType = function(label){
			return ["ImportantTask", "Pass", "Weekly", "Daily",
			"Big", "Medium", "Small"].indexOf(ln) == -1;
		}
		var specialLabelConv = {"Grow":850, "Facultate": 750, "Health":600, "Work": 500, "Social":400, "Facultate-TA": 300, "Downtime":100 };
		var convert = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":30,   "Month":4*5*8 , "3 Month":3*4*5*8 , "6 Month":6*4*5*8 , "Year":12*4*5*8 };
		var convCal = {"30 minute task" : 0.5, "Hour task": 1, "2 hour task": 2, "3 hour task":3, "5 hour task":5, "8 hour task":8, "13 hour task":13, "Week":5*24, "Month":4*7*24, "3 Month":3*4*7*24, "6 Month":6*4*7*24, "Year":12*4*7*24};
		var labels = this.labels;
		var found = 0;
		this.tick = 0.125;
		this.calendarTick = 0.25;
		this.size = 0;
		var labelToAdd = [];
		this.big = false;
		this.medium = false;
		this.small = false;
		for(var i in labels){
			var tick = undefined;
			var label = labels[i];
			var ln = label.name;
			if (ln == "Pass"){
				this.pass = true;
			} else if (ln == "Big"){
				this.big = true;
				scheduler.bigId = label.id;
			} else if (ln == "Medium"){
				this.medium = true;
				scheduler.medId = label.id;
			} else if (ln == "Small"){
				this.small = true;
				scheduler.smallId = label.id;
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
				if(labelIsAType(ln)) {
					labelToAdd.push(ln);
				}
			}
		}
		if(labelToAdd.length == 0) {
			labelToAdd.push("Unlabeled");
		}
		if(this.big){
			this.size += 1000;
			this.list.bigCount += 1;
		}
		if(this.medium){
			this.size += 500;
			this.list.medCount += 1;
		}
		if(this.small){
			this.size += 100;
			this.list.smallCount += 1;
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
			this.list.addLabel(ln, this.tick/labelToAdd.length, extra);
			var x = this.list.counts[ln];
			if(x === undefined){
				x = 0;
			}
			this.list.counts[ln] = x + 1;
		}
	}

	this.setLabel = function(label, set){
		console.log(this.name + " + " + label + " " +(set ? "on" : "off"));
		var idLabels = {"Big":scheduler.bigId, "Medium":scheduler.medId, "Small":scheduler.smallId};

		console.assert(idLabels[label] !== undefined);

		console.log(this.labels);

		if(set){
			this.labels.push({"id":idLabels[label], "name":label});
		} else {
			var index = -1;
			for (var i in this.labels){
				if(this.labels[i].id == idLabels[label]) {
					index = i;
					break;
				}
			}
			console.assert(index >= 0);
			this.labels.splice(i, 1);
		}
		console.log(this.labels);

		var networkLabels = this.labels.map(a => a.id);

		console.log(networkLabels);
		Trello.put('/cards/' + this.id + "/idLabels",{"value":networkLabels}, console.log, console.log);
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
