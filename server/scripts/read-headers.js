require('dotenv').config({ path: require('path').join(__dirname, '../../.env.development.local') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

(async () => {
  const cred = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'google-service-account.json'), 'utf8')
  );
  const auth = new google.auth.GoogleAuth({
    credentials: cred,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || 'Orders_Today NEW';
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `'${tab.replace(/'/g, "''")}'!A1:AZ1`,
  });
  console.log(res.data.values?.[0] || '(empty)');
})();
