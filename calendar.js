
/**
*  On load, called to load the auth2 library and API client library.
*/
function GclientInit() {
	gapi.load('client:auth2', initClient);
}

/**
*  Initializes the API client library and sets up sign-in state
*  listeners.
*/
function initClient() {
	gapi.client.init({
	  discoveryDocs: DISCOVERY_DOCS,
	  clientId: CLIENT_ID,
	  scope: SCOPE
	}).then(function () {

	  cur = false;
	  // Listen for sign-in state changes.
	  gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

	  // Handle the initial sign-in state.
	  updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
	  console.log(gapi.auth2.getAuthInstance().isSignedIn.get());
	  authorizeButton.onclick = handleSignInClick;
	});
}

var _deleteGoogleEvent = function(eventId){
	var request = gapi.client.calendar.events.delete({
        'calendarId': 'qmo9nhu10p91olod32spqmjts8@group.calendar.google.com',
        'eventId': eventId
    });

    request.execute(console.log);
}

var ceva = function(eventId, e, start, end, card){
	if( start.getTime() != new Date(e.start.dateTime).getTime() ||
		  end.getTime() != new Date(e.end.dateTime).getTime()   ||
		 e.status === "cancelled" ) {
		e.start.dateTime = start;
		e.end.dateTime = end;
		e.reminder = {"useDefault":true};
		e.description = card.id;
		e.summary = card.name;
		e.status = "confirmed";
		var request = gapi.client.calendar.events.patch({
            'calendarId': 'qmo9nhu10p91olod32spqmjts8@group.calendar.google.com',
            'eventId': eventId,
            'resource': e,
        });

        request.execute(function (ee) {
           //console.log(ee);
        });
    }
};

var addToGcal = function(card){
	if(card.due){
		var start = new Date(new Date(card.due).getTime());
		var end = new Date(new Date(card.due).getTime()+card.calendarTick*60*60*1000);
		var lists = scheduler.lists;
		var lc = lists[card.listname];
		// we call add to Gcal in a reschedule :D
		if(card.listname === "Inbox"){
			card.deleteGoogleEvent();
			addWarning("No event for:<b>" + card.name + "</b>. If you want it, then prioritize it<br/>")
			return;
		}
		if(card.eventId != "undefined"  && card.eventId !== undefined) {
			var event = gapi.client.calendar.events.get(
				{"calendarId": 'qmo9nhu10p91olod32spqmjts8@group.calendar.google.com', "eventId": card.eventId});
			event.execute(function(e){
				if(e.code === undefined) {
					ceva(card.eventId, e, start, end, card);
				} else {
					console.log(e);
					if(event.code === 404) {
						addWarning("Card " + card.name + " might not be in cal");
					}
					// we probably got rate limited :/
				}
			});
			return;
		} else {
			var event = {
		          'summary': card.name,
		          'description': card.id,
		          'start': {
		            'dateTime': start,
		            'timeZone': 'Europe/Bucharest'
		          },
		          'end': {
		            'dateTime': end,
		            'timeZone': 'Europe/Bucharest'
		          },
		          'reminder' :{
			"useDefault" : "true"
		          }
		        };

	        var request = gapi.client.calendar.events.insert({
	          'calendarId': 'qmo9nhu10p91olod32spqmjts8@group.calendar.google.com',
	          'resource': event
	        });

	        request.execute(function(event) {
	          console.log("created for " + card.name);
	         //console.log(event);
	         card.auxObj.eventId = event.id;
	         card.eventId = event.id;
	         card.updateDesc();
	         });
		}
	}

 }
