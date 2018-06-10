"use strict";
var Graph = function(dummy) {
	this.dummy = dummy;
	this._sumsCount = new Object();
	this.initCount = function (name, size) {
		this._sumsCount[name] = {};
		this._sumsCount[name]["Free"] = size;
		this._sumsCount[name]["Daily"] = {};
		this._sumsCount[name]["Weekly"] = {};
		listsData[name]["sizes"]= this._sumsCount[name];
	}
	this.add = function(name, label, size, extra) {
		var osize = size;
		size = parseFloat("" + size);
		if(size !== size){
			console.log(label);
			console.log(osize);
			console.trace()
			return;
		}
		if( this._sumsCount[name] === undefined) {
			console.log(name + label);
			djakldjakldajlda
		}
		if(this._sumsCount[name][label] === undefined){
			this._sumsCount[name][label] = 0;
		}
		this._sumsCount[name][label]  += size;
		this._sumsCount[name]["Free"] -= size;
		if(extra !== undefined) {
			if(this._sumsCount[name][extra][label] === undefined) {
				this._sumsCount[name][extra][label] = 0;
			}
			this._sumsCount[name][extra][label] += size;
		}
	}
	this.mergeList = function (name, next) {
		var lists = scheduler.lists;
		if(next === null){
			return;
		}
		var extraAdd = lists[next].weekCount - lists[name].weekCount;
		var order = requiredLists;
		for(var t in this._sumsCount[name]){
			if (t == "Daily"){
				continue;
			}
			if (t == "Weekly"){
				continue;
			}
			this.add(next, t, this._sumsCount[name][t]);

			for (var l in this._sumsCount){
				if(order.indexOf(l) < 0){
					continue;
				}
				if(order.indexOf(l) >= order.indexOf(next)){
					continue;
				}
				if(this._sumsCount[l]["Daily"][t] === undefined) {
					this._sumsCount[l]["Daily"][t] = 0;
				}
				if(this._sumsCount[l]["Weekly"][t] === undefined) {
					this._sumsCount[l]["Weekly"][t] = 0;
				}
				this.add(next, t, 7 * extraAdd * this._sumsCount[l]["Daily"][t]);
				this.add(next, t, extraAdd * this._sumsCount[l]["Weekly"][t]);
			}
		}

		if(lists[name].end === lists[next].end){
			lists[next].sumTicks += lists[name].sumTicks;
		} else {
			lists[next].sumTicks += lists[name].ticks;
			for (var l in this._sumsCount) {
				if(order.indexOf(l) <= order.indexOf(next)){
					continue;
				}
				for(var t in this._sumsCount[name]){
					if(this._sumsCount[l]["Daily"][t] === undefined){
						continue;
					}
					lists[next].sumTicks += 7 * extraAdd * this._sumsCount[l]["Daily"][t];

					if(this._sumsCount[l]["Weekly"][t] === undefined){
						continue;
					}
					lists[next].sumTicks += extraAdd * this._sumsCount[l]["Weekly"][t];
				}
			}
		}
		lists[next].cardCount += lists[name].cardCount;
	}

	this.returnScaled = function(name, type, size) {
		return 100.0 * this._sumsCount[name][type] / size;
	}
}
