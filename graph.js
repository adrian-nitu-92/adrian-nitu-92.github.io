"use strict";
var Graph = function(dummy) {
	this.dummy = dummy;
	this._sumsCount = new Object();
	this.types = new Set(["Free", "Unlabeled", "DownTime", "Facultate-TA", "Social", "Work", "Health", "Facultate", "Grow"]);
	this.initCount = function (name, size) {
		this._sumsCount[name] = {};
		for(let t of this.types){
			this._sumsCount[name][t] = 0;
		}
		this._sumsCount[name]["Free"] = size;
	}
	this.add = function(name, label, size) {
		if(this._sumsCount[name][label] === undefined){
			this._sumsCount[name][label] = 0;
		}
		this._sumsCount[name][label]  += size;
		this._sumsCount[name]["Free"] -= size;

	}
	this.mergeList = function (name, next) {
		if(next !== null){
			for(let t of this.types){
				if(t !== "Free"){
					this.add(next, t, this._sumsCount[name][t]);
				}
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
