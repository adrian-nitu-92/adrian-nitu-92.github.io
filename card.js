"use strict";
var Card = function(cardObject, list, inbox, done) {

	this._network_updateDesc = function(){
		this.auxObj.eventId = this.eventId;
		this.auxObj.eraseMeNot = this.eraseMeNot;
		this.auxObj.supporting = this.supporting;
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

	this.getCalName = function () {
		var prefix = "";
		for(var i in this.labels){
			if(["Big", "Medium", "Small"].indexOf(this.labels[i].name) != - 1)
			{
				prefix = this.labels[i].name + " - ";
			}
		}
		return prefix + this.name;
	}

	this.getCalColorId = function() {
		if(this.big) return 11;
		if(this.medium) return 5;
		if(this.small) return 7;
		return 8;
	}

	this.changeDate = function(date) {
		this.date = date;
		this.due = this.date;
		Trello.put('/cards/' + this.id + "/due",{"value":this.due},
			console.log, console.log);
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
			Trello.put('/cards/' + this.id + "/due",{"value":this.due}, console.log, console.log);

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
			this.due = lists["Tomorrow"].end - 4 * 60 * 60 * 1000; // Maine pe la 10-11
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
			} else if (ln == "Medium"){
				this.medium = true;
			} else if (ln == "Small"){
				this.small = true;
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
		var now = new Date().getTime();
		var date = new Date(this.due).getTime();
		var endDate = date + this.tick * 60 * 60 * 1000;
		if(now > date) {
			this.tick -= (now - date) / (60 * 60 * 1000);
		}
		if(endDate > this.list.end) {
			this.tick -= (endDate - this.list.end) / (60 * 60 * 1000);
		}
		if(this.tick < 0) {
			this.tick = 0;
		}
		if(labelToAdd.length == 0) {
			labelToAdd.push("Unlabeled");
		}
		this.parsedLabels = labelToAdd;
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

		console.assert(scheduler.labelsNames[label] !== undefined);

		console.log(this.labels);

		var id = scheduler.labelsNames[label].id;

		if(set){
			this.labels.push({"id":id, "name":label});
			if(this.parsedLabels.length === 1 && this.parsedLabels[0] === "Unlabeled") {
				this.parsedLabels.splice(0, 1, label);
			} else {
				this.parsedLabels.push(label);
			}
			if(label === "Big"){
				this.big = true;
				this.list.bigCount += 1;
			}
			if(label === "Medium"){
				this.medium = true;
				this.list.medCount += 1;
			}
			if(label === "Small"){
				this.small = true;
				this.list.smallCount += 1;
			}
		} else {
			var index = -1;
			for (var i in this.labels){
				if(this.labels[i].id == scheduler.labelsNames[label].id) {
					index = i;
					break;
				}
			}
			console.assert(index >= 0);
			this.labels.splice(i, 1);

			index = this.parsedLabels.indexOf(label);
			if(index >= 0) {
				this.parsedLabels.splice(i, 1);
			}

			if(this.parsedLabels.length === 0) {
				this.parsedLabels.push("Unlabeled");
			}
			if(label === "Big"){
				this.big = false;
				this.list.bigCount -= 1;
			}
			if(label === "Medium"){
				this.medium = false;
				this.list.medCount -= 1;
			}
			if(label === "Small"){
				this.small = false;
				this.list.smallCount -= 1;
			}
		}
		console.log(this.labels);

		var networkLabels = this.labels.map(a => a.id);

		console.log(networkLabels);
		Trello.put('/cards/' + this.id + "/idLabels",{"value":networkLabels}, console.log, console.log);
	}

	this._parseSupporting = function (){
		var card = this;
		setTimeout(function(){
			card.supportingCards = [];
			for (var c in card.supporting){
				var cardId = card.supporting[c];
				var scard = scheduler.cards[cardId];
				if(scard === undefined){
					addWarning("Trebuie sa cureti cardul " + card.get_link());
				} else {
					var useless = function(reason) {
						addWarning("<b>supporting card " + scard.get_link() +
							" e nefolositor pentru "+card.get_link()+"</b>"
							+ ' pentru ca ' + reason
							+' <a onclick="scheduler.cards[\''+card.id+
							'\'].dropSupporting(\''+scard.id+'\')" href="#">Drop</a>');

					}
					if(scard.date >= card.date){
						useless ("too late");
					}
					if(card.big && !( scard.big || scard.medium)){
						useless ("too small");
					}
					if(card.medium && !( scard.big || scard.medium || scard.small)){
						useless ("too small");
					}
					card.supportingCards.push(scard);
				}
			}
		}, 500);
	}

	this.addSupporting = function(cid) {
		this.supporting.push(cid);
		this._parseSupporting();
		this._network_updateDesc();
	}

	this.dropSupporting = function (cid) {
		const index = this.supporting.indexOf(cid);
		if(index < 0)
			return;
		this.supporting.splice(index, 1);
		this._parseSupporting();
		this._network_updateDesc();
	}

	this.get_link = function(){
		return '<a href = "'+this.shortUrl+'" target="_blank">' + this.name + '</a>';
	}

	this.listname = list.name;
	this.list = list;
	this.inbox = inbox;
	this.done = done;
	this.parsedLabels = [];
	this.supporting = [];

	Object.assign(this, cardObject);

	this._parseLabels();

	try {
		this.auxObj = JSON.parse(cardObject.desc);
		Object.assign(this, this.auxObj);
	} catch (err) {
		this.auxObj = {};
	}

	this._parseSupporting();

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
