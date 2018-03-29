function makeApiCall() {
      var params = {
        // The ID of the spreadsheet to update.
        spreadsheetId: '1etj9bAvW_Nb9NtRHyYPkX9zmNc16IEOy19BNuC6Z_yU',  // TODO: Update placeholder value.

        // The A1 notation of a range to search for a logical table of data.
        // Values will be appended after the last row of the table.
        range: 'A1',  // TODO: Update placeholder value.

        // How the input data should be interpreted.
        valueInputOption: 'RAW',  // TODO: Update placeholder value.

        // How the input data should be inserted.
        insertDataOption: 'INSERT_ROWS',  // TODO: Update placeholder value.
      };

      var valueRangeBody = {
        "values": [[new Date().toLocaleString("en-US"), document.getElementById('airea').value]]
        // TODO: Add desired properties to the request body.
      };

      var request = gapi.client.sheets.spreadsheets.values.append(params, valueRangeBody);
      request.then(function(response) {
        // TODO: Change code below to process the `response` object:
        console.log(response.result);
      }, function(reason) {
        console.error('error: ' + reason.result.error.message);
      });
    }


var Sheet = function(){
	this.add = makeApiCall;
};


var sheets = new Sheet();
