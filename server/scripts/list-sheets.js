const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const cred = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'google-service-account.json'), 'utf8')
);
const SPREADSHEET_ID = '11p4tMxdnq91JngFwFUFUykcy60Tqxpfyhf1amLGI2v4';

(async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: cred,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties',
  });
  console.log('Tabs:');
  for (const s of meta.data.sheets) {
    console.log(' -', JSON.stringify(s.properties.title), 'gid=', s.properties.sheetId);
  }

  const tab = process.env.GOOGLE_SHEET_TAB || 'Orders_Today NEW';
  const safe = tab.replace(/'/g, "''");
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safe}'!A1:P2`,
  });
  console.log('\nA1:P2:');
  console.log(JSON.stringify(rows.data.values, null, 2));
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
