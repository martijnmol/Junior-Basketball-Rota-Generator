// docs/apps-script.gs
// Paste this into your Google Sheet via Extensions → Apps Script.
// Deploy as web app: Execute as "Me", Who has access "Anyone".

var SHORTFALL_SHEET = 'Shortfall';
var HISTORY_SHEET = 'Match History';

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHORTFALL_SHEET);
  if (!sheet) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);

  var headers = data[0];
  var rows = data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });

  return jsonResponse(rows);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- Shortfall tab ---
    var shortfallSheet = ss.getSheetByName(SHORTFALL_SHEET);
    if (!shortfallSheet) {
      shortfallSheet = ss.insertSheet(SHORTFALL_SHEET);
      shortfallSheet.appendRow(['Date', 'PlayerName', 'PeriodsPlayed', 'Shortfall']);
    }
    payload.shortfallRows.forEach(function(row) {
      shortfallSheet.appendRow([payload.date, row.playerName, row.periodsPlayed, row.shortfall]);
    });

    // --- Match History tab ---
    var historySheet = ss.getSheetByName(HISTORY_SHEET);
    if (!historySheet) {
      historySheet = ss.insertSheet(HISTORY_SHEET);
      var periodCount = payload.historyRows.length > 0 ? payload.historyRows[0].periods.length : 8;
      var periodHeaders = [];
      for (var i = 1; i <= periodCount; i++) { periodHeaders.push('P' + i); }
      historySheet.appendRow(['Date', 'Player'].concat(periodHeaders).concat(['Total']));
    }
    payload.historyRows.forEach(function(row) {
      var periodCells = row.periods.map(function(played) { return played ? '🏀' : '—'; });
      historySheet.appendRow([payload.date, row.playerName].concat(periodCells).concat([row.total]));
    });

    return jsonResponse({ status: 'ok' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
