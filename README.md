# Al-Ameen Islamic Institute — Fee Management System

A local school fee management system built with Node.js, Express, SQLite and a browser-based interface.

## Run the project

1. Open the project folder in VS Code.
2. Open Terminal.
3. Run:

```bash
npm install
npm start
```

4. Open the URL printed by the server, normally:

```text
http://localhost:3000
```

Do not open `public/index.html` directly. Run the Express server instead.

## Logo

The school crest is stored at:

```text
public/logo.png
```

The website loads it with:

```html
<img src="/logo.png">
```

## Bank details on printed challans

Open **Settings** in the application and enter:

- Bank name
- Account title
- Account number
- IBAN
- Branch / Code
- School phone number

These details are saved in the SQLite `settings` table and are automatically printed on both the School Copy and Student Copy of the challan.

## Data

Student and fee records are stored in `fees.db`. Keep this file backed up.
