"use strict";
var Graph = function(dummy) {

	this.getLabels = function(){
		return scheduler.lists["3 Year"].graphData.sumsCount;
	}
	this.returnScaled = function(name, type, size) {
		return 100.0 * scheduler.lists[name].graphData.sumsCount[type] / size;
	}
	this.buildListData = function(lists){
		var ret = {};
		for (var l in lists) {
			ret[lists[l]] = scheduler.lists[lists[l]].graphData;
		}
		return ret;
	}
}
