"use strict";

var Time = function(dummy) {
	this.dummy = dummy;
	this.hourLengthInMs = (1000 * 60 * 60);
	this.dayLenghtInMs = (this.hourLengthInMs * 24);
	this.weekLengthInMs = (this.dayLenghtInMs * 7);
	this.timezoneOffset = 3*60*60*1000; // We need 3 extra hours for the timezone setting
	this.today = {};
	this.yesterday = {};
	this.tomorrow = {};
	this.week = {};
	this.month = {};
	this._3month = {};
	this._6month = {};
	this.year = {};
	this._3year = {};

	var nowDate = new Date();
	var now = nowDate.getTime() + this.timezoneOffset;

	this.today.start = now - now % this.dayLenghtInMs;

	var currentHour = (now - this.today.start) / this.hourLengthInMs;
	currentHour = Math.round(Number(currentHour*4))/4;
	if(currentHour >= 24){
		currentHour -= 24;
		this.today.start = this.today.start + this.dayLenghtInMs;
	}
	if (currentHour < 7) {
		currentHour = 7;
	}

	var auxStart = localStorage.getItem("AuxStart");
	if(auxStart > this.today.start){
		this.today.start = parseInt(auxStart);
		currentHour = 7;
	}

	var aux = (this.today.start + 3.5 * this.dayLenghtInMs);

	/* let weekStart be global */
	this.week.start = aux - aux % (7 * this.dayLenghtInMs) - 3 * this.dayLenghtInMs; /* because 1 Jan 1970 was a Thursday */

	var localStorageWeekStart = localStorage.getItem("WeekStart");
	if(localStorageWeekStart != this.week.start){
		localStorage.setItem("WeekStart", this.week.start);
		onceAWeekFlag = true;
		console.log("Working for once this week");
	} else {
		console.log("Already worked this week");
	}

	var localStorageTodayStart = localStorage.getItem("TodayStart");
	if(localStorageTodayStart != this.today.start){
		localStorage.setItem("TodayStart", this.today.start);
		onceADayFlag = true;
		console.log("Working for once today");
	} else {
		console.log("Already worked today");
	}

	var baseDay = 12;
	var normalDay = 17;
	var weekHabbitOffset = (normalDay - baseDay)*7;

	this.yesterday.start = this.today.start - this.dayLenghtInMs;
	this.tomorrow.start  = this.today.start + this.dayLenghtInMs;
	this.tomorrow.end    = this.today.start + 2 * this.dayLenghtInMs;
	this.week.end        = this.week.start  + 7 * this.dayLenghtInMs;
	if(this.week.end === this.tomorrow.start) {
		this.week.end = this.week.end + 7 * this.dayLenghtInMs;
	}
	this.month.end   = this.today.start +          31 * this.dayLenghtInMs;
	this._3month.end = this.today.start +      3 * 31 * this.dayLenghtInMs;
	this._6month.end = this.today.start +      6 * 31 * this.dayLenghtInMs;
	this.year.end    = this.today.start +     12 * 31 * this.dayLenghtInMs;
	this._3year.end  = this.today.start + 3 * 12 * 31 * this.dayLenghtInMs;

	this.daysInThisWeek = (this.week.end - this.today.start) / this.dayLenghtInMs;

	this.today.len    = 24 - currentHour;
	this.tomorrow.len = normalDay;
	this.week.len     = normalDay * (this.daysInThisWeek -1);
	// add 30 hours as an overlap buffer -- this should protect from the need to push out a ww prematurely
	this.month.len    = baseDay * 31 + weekHabbitOffset + 30;
	this._3month.len  = this.month.len * 3 + weekHabbitOffset;
	this._6month.len  = this.month.len * 6 + weekHabbitOffset;
	this.year.len     = baseDay * 365 + weekHabbitOffset;
	this._3year.len   = this.year.len * 3 + weekHabbitOffset;

	if(true) {
		var baseMonthInt = 7;
		var baseYearInt = 17;

		var monEndInt;
		var _3monEndInt;
		var _6monthInt;
		var yearInt;
		var _3yearEnd;

		var computeDate = function (monthInt, yearInt, monthPush, min)
		{;
			var ret;
			ret = new Date(0);
			while(ret < min) {
				monthInt = monthInt + monthPush;
				while(monthInt > 12){
					yearInt = yearInt + 1;
					monthInt = monthInt - 12;
				}
				ret = new Date(monthInt+"/1/"+yearInt+" GMT");
			}
			return ret;
		}
		var getDays = function(stop, start, time){
			return (stop - start)/time.dayLenghtInMs -1;
		}
		var max = function(a,b){
			if (a>b)
				return a;
			return b;
		}
		this.month.end = computeDate(baseMonthInt, baseYearInt, 1, this.week.end).getTime();

		if(this.month.end - this.week.end < 7 * this.dayLenghtInMs) {
			this.mon.len = this.week.len;
		}
		var aux = this.week.end;
		while(aux < this.month.end) {
			aux = aux + 7 * this.dayLenghtInMs;
		}
		this.month.end = aux;

		this._3month.end = computeDate(baseMonthInt, baseYearInt, 3,  this.week.end).getTime();
		this._6month.end = computeDate(baseMonthInt, baseYearInt, 6,  this.week.end).getTime();
		this.year.end    = computeDate(baseMonthInt, baseYearInt, 12, this.week.end).getTime();
		this._3year.end  = computeDate(baseMonthInt, baseYearInt, 36, this.week.end).getTime();

		this._3month.end = max(this._3month.end,   this.month.end);
		this._6month.end = max(this._3month.end, this._6month.end);
		this.year.end    = max(   this.year.end, this._6month.end);
		this._3year.end  = max( this._3year.end,    this.year.end);

		this.month.len    = baseDay * getDays(   this.month.end, this.today.start, this) + weekHabbitOffset;
		this._3month.len  = baseDay * getDays( this._3month.end, this.today.start, this) + weekHabbitOffset;
		this._6month.len  = baseDay * getDays( this._6month.end, this.today.start, this) + weekHabbitOffset;
		this.year.len   = baseDay * getDays(    this.year.end, this.today.start, this) + weekHabbitOffset;
		this._3year.len = baseDay * getDays(  this._3year.end, this.today.start, this) + weekHabbitOffset;
	}
}