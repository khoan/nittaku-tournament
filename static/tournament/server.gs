/**
 * aim:
 *   1. log user request
 *   2. record entry and allow user to keep it up to date
 *
 * usage:
 *   1. Enter meta data
 *   2. Run > setup
 *   3. Publish > Deploy as web app 
 *      - enter Project Version name and click 'Save New Version' 
 *      - set security level and enable service: execute as 'me' and access 'anyone', even anonymously
 *   4. Copy the 'Current web app URL' and post this in your form/script action
 *
 * docs:
 *   https://developers.google.com/apps-script/guides/web
 *   https://developers.google.com/apps-script/guides/support/best-practices
 *
 * credit:
 *   adapted from https://mashe.hawksey.info/2014/07/google-sheets-as-a-database-insert-with-apps-script-using-postget-methods-with-ajax-example/
 */

var META = {
  NOW: undefined // useful to test time related logic
, tournament: {
    name: "NHTTA Oct. 2019 Championship"
  , email: "tournament@nittakuaustralia.com"
  , entry: {
      startDate: "1 Sep 2019"
    , stopDate: "24 Oct 2019"
    , resourceUrl: "https://tournament.nittakuaustralia.com/201910/entries/"
    }
  }
, sheets: {
    logs: {
      name: "Logs" // form data is inserted into this sheet
    , headerRow: 1
    }
  , entries: {
      name: "Entries" // entry is updated on this sheet
    , headerRow: 2
    , idFields: ["Dust", "RatingsCentralID", "PlayerName"]
    , privateFields: ["Email", "Phone", "DateOfBirth"]
    , publicFields: ["PlayerName", "RatingsCentralID", "Rating"
      , "SinglesOpen", "SinglesDiv1", "SinglesDiv2", "SinglesDiv3", "SinglesDiv4", "SinglesDiv5"
      , "DoublesOpen", "DoublesDiv1a2", "DoublesDiv3", "DoublesDiv4a5"
      , "DoublesOpenPartner", "DoublesDiv1a2Partner", "DoublesDiv3Partner", "DoublesDiv4a5Partner"]
    }
  }
};
var ENV = PropertiesService.getScriptProperties();

var Tools = {
// services
  lock: LockService
, content: ContentService
, sheetApp: SpreadsheetApp
, resource: UrlFetchApp
, mail: MailApp
, json: JSON
, misc: Utilities

// helpers
, entry: {}
, sheet: undefined
, dust: undefined
};

var App = (function (meta, env, tools) {
  function parseDate(date, time) {
    date = new Date(Date.parse(date));
    var yyyy = date.getFullYear();
    var mm = date.getMonth()+1;
    var dd = date.getDate();
    if (mm < 10) {
      mm = '0' + mm;
    }
    if (dd < 10) {
      dd = '0' + dd;
    }
    date = yyyy+'-'+mm+'-'+dd+'T'+time;
    return Date.parse(date);
  }
  tools.parseDate = parseDate; // expose to unit test
  
  var cache = {};
  var actions = {};
  var app = {};

  app.actions = actions; // expose actions to unit test
  
  var respond = function (e) {
    var response = tools.content.createTextOutput()
      .setMimeType(tools.content.MimeType.JSON);
    var responseBody;

    try {
      var result;
      
      var action = actions[e.parameter.action || e.parameter.Action];
      if (action) {
        result = action(e);
      }
      
      if (result) {
        responseBody = tools.json.stringify({"status": result.status, "body": result.body});
      } else {
        responseBody = tools.json.stringify({"status": "400 Bad Request"});
      }
    } catch(e) {
      responseBody = tools.json.stringify({"status":"500 Internal Server Error", "body": e});
    }
    
    return response.setContent(responseBody);
  }
  app.respond = function (e, options) {
    var result;
    
    e.parameter["Method"] = options.method;
    e.parameters["Method"] = [options.method];

    var atomic = options.method === "post" && ((e.parameter.action || e.parameter.Action) != "proxy")
    if (atomic) {
      // shortly after my original solution Google announced the LockService[1]
      // this prevents concurrent access overwritting data
      // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
      // we want a public lock, one that locks for all invocations
      var lock = tools.lock.getPublicLock();
      lock.waitLock(30*1000); // wait 30 seconds before conceding defeat.
    
      try {
        result = respond(e);
      } finally {
        lock.releaseLock();
      }
    }
    
    return result || respond(e);
  }
  
  /**
   *  GET ?action=proxy&url=...
   */
  actions.proxy = function (e) {
    var result = {};
    
    var response = tools.resource.fetch(e.parameter.url);
    
    result.status = "200 OK";
    result.body = response.getContentText();
    
    return result;
  }
  /**
   *  POST ?action=update&dust=...
   */
  actions.update = function (e) {
    var result = {};
    var data = e.parameter;
    var now = meta.NOW || new Date;

    if (data["Method"] !== "post") {
      result.status = "405 Method Not Allowed";
    }
    if (parseDate(meta.tournament.entry.stopDate, '23:59:59.999+10:00') < now) {
      result.status = "423 Locked";
      result.body = {"message": "Entry is closed."};
    }
    if (result.status) {
      return result;
    }

    data["Dust"] || (data["Dust"] = data.dust);
    var row = tools.sheet("entries").find(data, ["Dust"]);
    
    if (row.ok) {      
      data["Action"] || (data["Action"] = data.action || "update");
      data["Timestamp"] = now;
      data["DateOfEntry"] = now;
      data["RatingsCentralID"] || (data["RatingsCentralID"] = "new");
      
      tools.sheet("logs").insert(data);
      
      tools.entry.audit(data);
      var fields = meta.sheets.entries.publicFields.concat(meta.sheets.entries.privateFields);
      for (var i in fields) {
        var field = fields[i];
        if (field in data) {
          row.json[field] = data[field];
        }
      }
      tools.sheet("entries").update(row);
      
      result.status = "200 OK";
      result.body = {
        "message": "Your entry has been updated.",
        "entry": data
      }
    } else {
      result.status = "404 Not Found";
      result.body = {
        "message": "Your entry is not found."
      };
    }
    
    return result;
  }
  /**
   *  POST ?action=destroy&PlayerName=Nguyen,%20Khoa&dust=...
   */
  actions.destroy = function (e) {
    var result = {};
    var data = e.parameter;
    var now = meta.NOW || new Date;

    if (data["Method"] !== "post") {
      result.status = "405 Method Not Allowed";
    }
    if (parseDate(meta.tournament.entry.stopDate, '23:59:59.999+10:00') < now) {
      result.status = "423 Locked";
      result.body = {"message": "Entry is closed."};
    }
    if (result.status) {
      return result;
    }

    data["Dust"] || (data["Dust"] = data.dust);
    var row = tools.sheet("entries").find(data);

    if (row.ok) {
      if (row.json["PlayerName"] !== data["PlayerName"]) {
        result.status = "409 Conflict";
        result.body = {"message": "Player name mismatch."};
      }
      if (result.status) { return result; }
      
      data["Action"] || (data["Action"] = data.action || "destroy");
      data["Timestamp"] = now;
      
      tools.sheet("logs").insert(data);
      tools.sheet("entries").remove(row);
      
      result.status = "200 OK";
      result.body = {
        "message": "Your entry has been deleted.",
        "entry": data
      }
    } else {
      result.status = "404 Not Found";
      result.body = {"message": "Your entry is not found"};
    }
    
    return result;
  }
  /**
   *  GET ?action=show&PlayerName=Nguyen,%20Khoa&dust=...
   */
  actions.show = function (e) {
    var result = {};    
    var data = e.parameter;

    data["Dust"] || (data["Dust"] = data.dust);
    var row = tools.sheet("entries").find(data);

    if (row.ok) {
      result.status = "200 OK";
      
      var fields = meta.sheets["entries"].publicFields;
      if (data["PlayerName"]) {
        fields = fields.concat(meta.sheets["entries"].privateFields);
      }
      result.body = {
        "entry": tools.entry.scrub(row.json, fields)
      }
    } else {
      result.status = "404 Not Found";
      result.body = {"message": "Your entry does not exist."};
    }
    
    return result;
  }
  /**
   *  POST ?action=create
   *
   * https://medium.com/@stephane.giron/build-your-own-mail-service-for-apps-script-with-glitch-gmail-smtp-relay-ddefe578fa88
   */
  var emailEntryConfirmation = function (data) {
    if (!data["Email"]) { return }
    
    var to = data["Email"];
    //var replyTo = meta.tournament.email;
    var subject = meta.tournament.name + " - Entry confirmation";
    var body = "Hi " + data["PlayerName"].split(",")[1].trim() + ",\n\n"
      + "Thank you for your entry.\n\n"
      + "To update/withdraw your entry, please visit " + data["EditLink"].replace(" ", "%20") + "\n\n"
      + "To view your entry, please visit " + meta.tournament.entry.resourceUrl + "\n\n"
      + "Regards,\nSue / Tournament Director";

    var url = "https://api.mailgun.net/v3/nittakuaustralia.com/messages";
    tools.resource.fetch(url, {
      "method": "post",
      "headers": {"Authorization": "Basic " + tools.misc.base64Encode("api:"+env.getProperty("MAILGUN_SECRET"))},
      "payload": {from: "Tournament Director <"+meta.tournament.email+">", to: to, subject: subject, text: body}
    });
    
    //tools.mail.sendEmail(to, replyTo, subject, body);
    //tools.mail.sendEmail(to, subject, body, {name: 'Tournament Director', from: replyTo, replyTo: replyTo});
    
    // FIXME not streamlined, have to get refresh token then regenerate access token
    //var url = "https://mail.zoho.com/api/accounts/<accountId>/messages";
    //tools.resource.fetch(url, {
    //  "method": "post",
    //  "payload": {fromAddress: meta.tournament.email, toAddress: to, subject: subject, content: body, mailFormat: "plaintext"}
    //});
  }
  tools.emailEntryConfirmation = emailEntryConfirmation; // test email
  actions.create = function (e) {
    var result = {};
    var data = e.parameter;
    var now = meta.NOW || new Date;
    var editLink;
    
    if (data["Method"] !== "post") {
      result.status = "405 Method Not Allowed";
    }
    if (now < parseDate(meta.tournament.entry.startDate, '00:00:00.000+10:00')) {
      result.status = "423 Locked";
      result.body = {"message": "Entry opens on "+meta.tournament.entry.startDate+"."};
    }
    if (parseDate(meta.tournament.entry.stopDate, '23:59:59.999+10:00') < now) {
      result.status = "423 Locked";
      result.body = {"message": "Entry is closed."};
    }
    if (result.status) {
      return result;
    }
    
    var row = tools.sheet("entries").find(data);

    if (row.ok) {
      result.status = "422 Unprocessable Entity";
      result.body = {"message": "Your entry has already been recorded."};
    } else {
      data["Action"] || (data["Action"] = data.action || "create");
      data["RatingsCentralID"] || (data["RatingsCentralID"] = "new");
      data["Timestamp"] = now;
      data["DateOfEntry"] = now;
      data["Dust"] = tools.dust();
      editLink = meta.tournament.entry.resourceUrl + "edit/?PlayerName=" + data["PlayerName"] + "&dust=" + data["Dust"];
      data["EditLink"] = '=HYPERLINK("' + editLink + '", "edit")';

      tools.sheet("logs").insert(data);

      tools.entry.audit(data);
      tools.sheet("entries").insert(data);
      
      data["EditLink"] = editLink;
      emailEntryConfirmation(data);
      
      result.status = "200 OK";
      result.body = {
        "message": "Your entry has been accepted.",
        "entry": data
      }
    }
    
    return result;
  }

  tools.entry.scrub = function (data, whitelistFields) {
    whitelistFields || (whitelistFields = meta.sheets["entries"].publicFields);

    return whitelistFields.reduce(function (o, k) {
      o[k] = data[k];
      return o;
    }, {});
  };
  tools.entry.audit = function (data) {
    var fields = meta.sheets["entries"].publicFields;
    
    for (var i in fields) {
      var field = fields[i];
      
      if (field.indexOf("Singles") === 0) {
        data[field] || (data[field] = "");
      }
      
      if (field.indexOf("Doubles") === 0 && field.indexOf("Partner") === -1 && !data[field]) {
        data[field] = "";
        data[field+"Partner"] = "";
      }
    }
  };

  tools.dust = function () {
    var sheet = tools.sheet("entries");
    var header = sheet.header();
    var rows = sheet.values();
    var dustColumn = header.indexOf("Dust");
    
    var match;
    var result;
    
    do {
      result = tools.misc.getUuid().replace(/-/g, "");
      match = rows.some(function (row) {
        return result === row[dustColumn];
      });
    } while (match);
      
    return result;
  };
  
  tools.sheet = function (handle) {
    var key = handle + "Sheet";
    if (!cache[key]) {
      cache[key] = new Sheet(handle);
    }
    return cache[key];
  }
  
  function Sheet(handle) {
    this.cache = {};
    
    this.handle = handle;
    this.meta = meta.sheets[handle];
    
    var key = "spreadsheetApp";
    if (!cache[key]) {
      cache[key] = tools.sheetApp.openById(env.getProperty("SHEET_ID"));
    }
    this.sheet = cache[key].getSheetByName(this.meta.name);
  }

  Sheet.prototype.find = function (data, searchFields) {
    var result = {};

    searchFields || (searchFields = this.meta.idFields);
    searchFields = searchFields.filter(function (field) {
      return !!data[field];
    });
    if (searchFields.length === 0) { return result }

    var formulas = this.formulas();
    var rows = this.values();
    var header = this.header();
    
    function parseEntry(row, formula) {
      return header.reduce(function (o, k, i) {
        o[k] = formula[i] || row[i];
        return o;
      }, {});
    }

    searchFields = searchFields.reduce(function (a, k) {
      a.push([header.indexOf(k), data[k]]);
      return a;
    }, []);

    for (var i in rows) {
      var row = rows[i];
      var match = searchFields.every(function (matching) {
        var [field, value] = matching;
        return row[field] == value;
      });
      
      if (match) {
        result.rowNumber = parseInt(i) + 1;
        result.json = parseEntry(row, formulas[i]);
        result.ok = true;
        return result;
      }
    }
    
    return result;
  }

  Sheet.prototype.insert = function (data) {
    var result = {};

    var header = this.header();
    var nextRow = this.sheet.getLastRow() + 1;

    var row = [];
    for (var i in header) {
      var value = data[header[i]];
      if (typeof value === "undefined") { value = ""; }
      row.push(value);
    }

    this.sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

    result.ok = true;
    return result;
  }
  
  Sheet.prototype.remove = function (row) {
    var result = {};
    
    this.sheet.deleteRow(row.rowNumber);
    
    result.ok = true;
    return result;
  }

  Sheet.prototype.update = function (row) {
    var result = {};
    
    var header = this.header();
    var rowUpdate = [];
    
    for (var i in header) {
      rowUpdate.push(row.json[header[i]] || "");
    }
    
    this.sheet.getRange(row.rowNumber, 1, 1, rowUpdate.length).setValues([rowUpdate]);
    
    result.ok = true;
    return result;
  }
  
  Sheet.prototype.header = function () {
    var key = "header";
    if (!this.cache[key]) {
      this.cache[key] = this.values()[this.meta.headerRow - 1];
    }
    return this.cache[key];
  }

  Sheet.prototype.values = function () {
    var key = "values";
    if (!this.cache[key]) {
      this.cache[key] = this.sheet.getDataRange().getValues();
    }
    return this.cache[key];
  }
  
  Sheet.prototype.formulas = function () {
    var key = "formulas";
    if (!this.cache[key]) {
      this.cache[key] = this.sheet.getDataRange().getFormulas();
    }
    return this.cache[key];
  }
  
  return app;
})(META, ENV, Tools);




function doGet(e) { return App.respond(e, {method: "get"}) }
function doPost(e) { return App.respond(e, {method: "post"}) }




function setup() {
  ENV.setProperty("SHEET_ID", SpreadsheetApp.getActiveSpreadsheet().getId());
  ENV.setProperty("MAILGUN_SECRET", "");
}




function testSetup() {
  for (var handle in META.sheets) {
    META.sheets[handle].name = "Test" + META.sheets[handle].name;
  }
  var breakpoint = {};
}

function testFindEntry() {
  testSetup();
  
  var row = Tools.sheet("entries").find({"RatingsCentralID": "91213"});
  row = Tools.sheet("entries").find({"PlayerName": "Bae, Won"});
  row = Tools.sheet("entries").find({"PlayerName": "Antioquia, Gino", "RatingsCentralID": "", "Dust": ""});
  row = Tools.sheet("entries").find({"Dust": "f8cc20b254f14f8eb31da3bebcb5ca23"});
  row = Tools.sheet("entries").find({"RatingsCentralID": "91213", "Dust": ""}, ["Dust"]);
  var breakpoint = {};
}

function testActionEntryCreate() {
  testSetup();
  
  var result = App.actions.create({"parameter": {
    "PlayerName": "Nguyen, Khoa",
    "RatingsCentralID": "",
    "Rating": "",
    "DateOfBirth": "14 Sep 1983",
    "Phone": "0435 999 999",
    "Email": "khoa@nittakuaustralia.com",
    "SinglesDiv1": true,
    "SinglesDiv2": false,
    "SinglesDiv3": false,
    "SinglesDiv4": false,
    "SinglesDiv5": false,
    "Singles6": false,
    "DoublesDiv1": true,
    "DoublesDiv2a3": false,
    "DoublesDiv4": false,
    "DoublesDiv5a6": false,
    "DoublesDiv1Partner": "Nguyen, Khoi",
    "DoublesDiv2a3Partner": "",
    "DoublesDiv4Partner": "",
    "DoublesDiv5a6Partner": ""
  }});
  
  var breakpoint = {};
}

function testEndpointCreateEntry() {
  /**doPost({
    "parameter": {},
    "parameters": {
      "action": ["view"],
      "page": ["3"]
    },
    "contextPath": "",
    "contentLength": -1,
    "queryString": "action=view&page=3"
  });*/
  
  /**
  var url = ScriptApp.getService().getUrl();
  var payload = {
    "Action": "create"
  , "PlayerName": "Nguyen, Khoa",
    "RatingsCentralID": "",
    "Rating": "",
    "DateOfBirth": "",
    "Phone": "",
    "Email": "khoa@nittakuaustralia.com",
    "SinglesDiv1": true,
    "SinglesDiv2": false,
    "SinglesDiv3": false,
    "SinglesDiv4": false,
    "SinglesDiv5": false,
    "SinglesDiv6": false,
    "DoublesDiv1": true,
    "DoublesDiv2a3": false,
    "DoublesDiv4": false,
    "DoublesDiv5a6": false,
    "DoublesDiv1Partner": "Nguyen, Khoi",
    "DoublesDiv2a3Partner": "",
    "DoublesDiv4Partner": "",
    "DoublesDiv5a6Partner": ""
  };
  var options = {
    "method": "POST",
    "payload": payload,
    "followRedirects": true,
    "muteHttpExceptions": true
  };
  var result = UrlFetchApp.fetch(url, options);
  //var responseStatus = result.getResponseCode();
  var responseHeaders = result.getAllHeaders();
  var responseBody = result.getContentText();
  */
  var breakpoint = {};
}

function testActionEntryUpdate() {
  testSetup();
  
  // update with partial entry
  var result = App.actions.update({"parameter": {
    "Method": "post",
    "Dust": "32326051df9b444f97257b15788997fc",
    "PlayerName": "Nguyen, Khoa",
    "RatingsCentralID": "12345",
    "Rating": "",
    "DateOfBirth": "23 July 1990",
    "Phone": "0415 230 430",
    "Email": "khoan@nittakuaustralia.com",
    "SinglesDiv2": true,
    "DoublesDiv1Partner": "Nguyen, Khoi",
    "DoublesDiv2a3": true,
    "DoublesDiv2a3Partner": "Nguyen, Khoi",
  }});

  var breakpoint = {};
}

function testDustGenerate() {
  var dust = [
    Tools.dust()
  , Tools.dust()
  ]
  var breakpoint = {};
}

function testActionEntryShow() {
  testSetup();
  
  var result = App.actions.show({"parameter": {
    "PlayerName": "Nguyen, Khoa",
    "Dust": "32326051df9b444f97257b15788997fc"
  }});
  
  var breakpoint = {};
}

function testActionEntryWithdraw() {
  testSetup();
}

function testEntryBeforeOpenDate() {
  testSetup();
  
  META.NOW = Date.parse('2019-09-15T23:59:59.999+10:00');
  var result = App.actions.create({"parameter": {
    "Method": "post",
    "PlayerName": "Nguyen, Khoa",
    "RatingsCentralID": "",
    "Rating": "",
    "DateOfBirth": "14 Sep 1983",
    "Phone": "0435 999 999",
    "Email": "khoa@nittakuaustralia.com",
    "SinglesDiv1": true,
    "SinglesDiv2": false,
    "SinglesDiv3": false,
    "SinglesDiv4": false,
    "SinglesDiv5": false,
    "SinglesDiv6": false,
    "DoublesDiv1": true,
    "DoublesDiv2a3": false,
    "DoublesDiv4": false,
    "DoublesDiv5a6": false,
    "DoublesDiv1Partner": "Nguyen, Khoi",
    "DoublesDiv2a3Partner": "",
    "DoublesDiv4Partner": "",
    "DoublesDiv5a6Partner": ""
  }});
  Logger.log('should be locked', result.status === '423 Locked');

  var breakpoint = {};
}

function testEntryAfterEndDate() {
  testSetup();
  META.NOW = Date.parse('2019-10-18T00:00:00.000+10:00');
  
  var result = App.actions.create({"parameter": {
    "Method": "post",
    "PlayerName": "Nguyen, Khoa",
    "RatingsCentralID": "",
    "Rating": "",
    "DateOfBirth": "14 Sep 1983",
    "Phone": "0435 999 999",
    "Email": "khoa@nittakuaustralia.com",
    "SinglesDiv1": true,
    "SinglesDiv2": false,
    "SinglesDiv3": false,
    "SinglesDiv4": false,
    "SinglesDiv5": false,
    "SinglesDiv6": false,
    "DoublesDiv1": true,
    "DoublesDiv2a3": false,
    "DoublesDiv4": false,
    "DoublesDiv5a6": false,
    "DoublesDiv1Partner": "Nguyen, Khoi",
    "DoublesDiv2a3Partner": "",
    "DoublesDiv4Partner": "",
    "DoublesDiv5a6Partner": ""
  }});
  Logger.log('should be locked', result.status === '423 Locked');
  
  result = App.actions.update({"parameter": {
    "Method": "post",
    "DoublesDiv1Partner": "Nguyen, Khoi"
  }});
  Logger.log('should be locked', result.status === '423 Locked');
  
  result = App.actions.destroy({"parameter": {
    "Method": "post",
    "PlayerName": "Nguyen, Khoa",
    "Dust": "32326051df9b444f97257b15788997fc"
  }});
  Logger.log('should be locked', result.status === '423 Locked');
  
  var breakpoint = {};
}

function testEntryWithMismatchedDust() {
  testSetup();
}

function testEmailEntryConfirmation () {
  testSetup();
  Tools.emailEntryConfirmation({"Email": "huukhoanguyen@hotmail.com", "PlayerName": "Nguyen, Khoa", "EditLink": "editlink.com"});
}

function testParseDate() {
  var start = Tools.parseDate('16 Sep 2019', '00:00:00.000+10:00');
  var realStart = Date.parse('2019-09-16T00:00:00.000+10:00');
  Logger.log('should equal', start === realStart);
  var breakpoint = {};
}
