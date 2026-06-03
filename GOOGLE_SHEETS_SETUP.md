# Step 1: Create a Google Apps Script

To connect this app directly to your Google Sheet without Firebase, we'll use a simple Google Apps Script as the bridge.

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Vz7uSHlPKeGWYRcv9dW6wEElxtvWxxegzqp36PdeUIQ/edit
2. Click on **Extensions > Apps Script** from the top menu.
3. Replace all the code in the editor with the code below:

```javascript
const SPREADSHEET_ID = '1Vz7uSHlPKeGWYRcv9dW6wEElxtvWxxegzqp36PdeUIQ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'clockIn') {
      return handleClockIn(data.payload);
    } else if (action === 'clockOut') {
      return handleClockOut(data.payload);
    } else if (action === 'getJobs') {
      return getJobs();
    } else if (action === 'getContractors') {
      return getContractors();
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleClockIn(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TimeLogs');
  // LogID | ContractorEmail | JobID | StartJobTime | EndJobTime | HoursWorked | ClaimPerDiem | Invoiced | InvoiceRef
  const logId = Utilities.getUuid();
  sheet.appendRow([
    logId, 
    payload.contractorEmail, 
    payload.jobId, 
    new Date().toISOString(), 
    '', 
    '', 
    payload.claimPerDiem || false, 
    false, 
    ''
  ]);
  return ContentService.createTextOutput(JSON.stringify({ success: true, logId: logId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleClockOut(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TimeLogs');
  const data = sheet.getDataRange().getValues();
  const endTime = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.logId && !data[i][4]) { // Match ID and end time must be empty
      const startTime = new Date(data[i][3]);
      const hours = Math.abs(endTime - startTime) / 36e5; // Convert ms to hours
      
      sheet.getRange(i + 1, 5).setValue(endTime.toISOString());
      sheet.getRange(i + 1, 6).setValue(hours.toFixed(2));
      return ContentService.createTextOutput(JSON.stringify({ success: true, hours: hours.toFixed(2) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Active log not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ensure CORS for browser requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
```

# Step 2: Publish the Script
1. Click the blue **Deploy** button (top right), then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Under "Execute as", select **Me**.
4. Under "Who has access", select **Anyone**.
5. Click **Deploy**. (You may need to authorize access – click "Review Permissions", select your Google account, click "Advanced", and "Go to project (unsafe)").
6. **Copy the "Web app URL"** displayed on the final screen.

# Step 3: Connect the App
Once you have the Web App URL, paste it here in our chat, and I will connect the Sunbelt Sports app directly to it!
