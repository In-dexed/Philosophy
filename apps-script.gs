// Replace this with your actual Google Sheet ID (the long ID in the sheet URL)
var SHEET_ID = 'AKfycby9z2WFEZ4jp0_zZrG4jbrF11yTwNZPW8Ar_6r9hhmlCe2vqmvSTjPZbmGo0Pvp8wvH';
var SHEET_NAME = 'Sheet1';

/**
 * doPost - handles incoming POST requests from the frontend and appends a row.
 * It accepts either form-encoded fields (e.parameter) or a JSON body
 * (e.postData.contents) with fields. If the sheet has no headers, it will
 * create a default header row matching the expected fields.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    Logger.log('Received POST: ' + JSON.stringify(e));

    var doc = SpreadsheetApp.openById(SHEET_ID);
    var sheet = doc.getSheetByName(SHEET_NAME) || doc.insertSheet(SHEET_NAME);

    // Expected headers (adjust if you want different order)
    var expectedHeaders = [
      'timestamp', 'userName', 'userLocation',
      'birds','wolves','squirrels','raccoons','cats','dogs','rabbits','mice','society',
      'values','settings'
    ];

    // Ensure headers exist: if sheet is empty or has only 0 rows
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1 || sheet.getLastRow() < 1) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      lastCol = expectedHeaders.length;
    }

    // Read actual headers from sheet (to respect user's header arrangement)
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Parse incoming data: support both form fields and JSON body
    var incoming = {};
    if (e.postData && e.postData.type === 'application/json' && e.postData.contents) {
      try {
        incoming = JSON.parse(e.postData.contents);
      } catch (err) {
        Logger.log('Failed to parse JSON body: ' + err);
      }
    }

    // Merge form parameters if present (they take precedence)
    if (e.parameter) {
      for (var p in e.parameter) {
        incoming[p] = e.parameter[p];
      }
    }

    // Ensure values/settings are serialized strings (they may be objects)
    if (incoming.values && typeof incoming.values !== 'string') incoming.values = JSON.stringify(incoming.values);
    if (incoming.settings && typeof incoming.settings !== 'string') incoming.settings = JSON.stringify(incoming.settings);

    // Build new row matching headers
    var nextRow = sheet.getLastRow() + 1;
    var newRow = headers.map(function(header) {
      if (header === 'timestamp') return new Date();
      // Map incoming fields; fallback to empty string
      return incoming[header] !== undefined ? incoming[header] : '';
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', row: nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('Error in doPost: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (e) { /* ignore */ }
  }
}
