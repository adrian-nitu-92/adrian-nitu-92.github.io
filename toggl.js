"use strict";
var Toggl = function() {

	this.setToken = function(token) {
		this.token = token;
		this.init = true;
	}

	this.getMe = function (callback)
	{
	    var xmlHttp = new XMLHttpRequest();
	    xmlHttp.onreadystatechange = function() {
	        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
	            callback(xmlHttp.responseText);
	    }
	    xmlHttp.open("GET", "https://www.toggl.com/api/v8/me", true); // true for asynchronous
	    xmlHttp.setRequestHeader("Authorization", "Basic " + btoa(this.token + ":api_token"));

	    xmlHttp.send(null);
	}


	this.init = false;

}
