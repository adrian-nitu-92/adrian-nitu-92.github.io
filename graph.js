"use strict";
var Graph = function(dummy) {
	this.dummy = dummy;
	this._sumsCount = new Object();
	this.initCount = function (name, size) {
		this._sumsCount[name] = {};
		this._sumsCount[name]["Free"] = size;
		listsData[name]["sizes"]= this._sumsCount[name];
	}
	this.add = function(name, label, size) {
		if( this._sumsCount[name] === undefined) {
			console.log(name + label);
			djakldjakldajlda
		}
		if(this._sumsCount[name][label] === undefined){
			this._sumsCount[name][label] = 0;
		}
		this._sumsCount[name][label]  += size;
		this._sumsCount[name]["Free"] -= size;
	}
	this.mergeList = function (name, next) {
		if(next !== null){
			for(var t in this._sumsCount[name]){
				this.add(next, t, this._sumsCount[name][t]);
			}
			if(lists[name].end === lists[next].end){
				lists[next].sumTicks += lists[name].sumTicks;
			} else {
				lists[next].sumTicks += lists[name].ticks;
			}
			lists[next].cardCount += lists[name].cardCount;
		}
	}

	this.returnScaled = function(name, type, size) {
		return 100.0 * this._sumsCount[name][type] / size;
	}
}
