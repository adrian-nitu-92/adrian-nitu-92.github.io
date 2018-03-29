// Client ID and API key from the Developer Console
var CLIENT_ID = '560434486699-5kfv7u66e8sndr5ob1ud63ha43ianb3d.apps.googleusercontent.com';
var API_KEY = 'AIzaSyB_lgpNA96HltN6DwDb0peyHTcx5yobasQ';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
'https://sheets.googleapis.com/$discovery/rest?version=v4'];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPE = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets";

function handleSignInClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
*  Called when the signed in status changes, to update the UI
*  appropriately. After a sign-in, the API is called.
*/
var updateSigninStatus = function(isSignedIn) {
if (isSignedIn) {
  done();
} else {
      authorizeButton.style.display = 'block';
    }
}
