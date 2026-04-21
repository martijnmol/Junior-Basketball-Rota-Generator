# Design: Replace Apps Script with Google Sheets API + OAuth

**Date:** 2026-04-21  
**Status:** Approved

## Problem

The existing Apps Script backend requires a Google Cloud project with OAuth consent screen configuration, which triggers a hard "This app is blocked" error for users without test-user access. The coach has an OAuth client ID already created and wants to write directly to a Google Sheet using the Sheets API v4.

## Approach

Use **Google Identity Services (GIS)** to obtain a short-lived OAuth access token in the browser. Use that token to call the **Google Sheets API v4** directly for both reads and writes. No Apps Script, no server, no credentials in code.

## Auth

- Library: `https://accounts.google.com/gsi/client` (loaded via `<script>` tag in `public/index.html`)
- OAuth client ID: `942845479443-lvci36nuggtd2scc7r231fakf4vb3tr7.apps.googleusercontent.com` (hardcoded as a constant — it is public/safe)
- Scope: `https://www.googleapis.com/auth/spreadsheets`
- Token lives **in memory only** (never stored in localStorage — tokens expire after 1 hour)
- When a write is attempted and no token exists (or it has expired), `google.accounts.oauth2.initTokenClient` triggers the Google popup automatically
- Token is requested on-demand (when Save Match is clicked), not at app startup

## Data Model

Unchanged from the previous design. Two tabs in the Google Sheet:

### "Shortfall" tab

| Column | Value |
|---|---|
| Date | YYYY-MM-DD |
| PlayerName | string |
| PeriodsPlayed | integer |
| Shortfall | integer |

### "Match History" tab

| Column | Value |
|---|---|
| Date | YYYY-MM-DD |
| Player | string |
| P1–P8 | "🏀" or "—" |
| Total | integer |

The user creates both tabs manually in their sheet before first use (the app does not create them).

## Read (fetchStats)

```
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Shortfall!A:D
Authorization: Bearer {accessToken}
```

Parses the response `values` array (first row = headers, remaining rows = data). Aggregates `Shortfall` column by `PlayerName` into cumulative totals. Returns `PlayerStats[]` sorted descending.

## Write (appendMatch)

Two sequential API calls, both authenticated:

```
POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Shortfall!A:D:append?valueInputOption=USER_ENTERED
POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Match History!A:K:append?valueInputOption=USER_ENTERED
Authorization: Bearer {accessToken}
```

Body shape: `{ values: [[row1col1, row1col2, ...], [row2col1, ...]] }`

## Settings

The user enters their **Spreadsheet ID** (the long string from their sheet URL, e.g. `1fhf_r_ciuaeGqpHo9Zk-LwT7Y58lB-ePVZliCIM30LY`). This is stored in localStorage. The OAuth client ID is hardcoded — no user input needed for it.

The Settings panel also shows a "Connect Google" button which triggers auth proactively (optional — auth also triggers automatically on Save Match).

## Files Changed

| File | Change |
|---|---|
| `public/index.html` | Add `<script src="https://accounts.google.com/gsi/client" async defer></script>` |
| `src/settingsStorage.ts` | Replace `getScriptUrl`/`setScriptUrl` with `getSpreadsheetId`/`setSpreadsheetId` |
| `src/sheetsApi.ts` | Full rewrite: Google Sheets API v4 calls, GIS token management |
| `src/components/Settings.tsx` | Replace URL input with Spreadsheet ID input |
| `src/App.tsx` | Rename `scriptUrl` → `spreadsheetId` in state and props |
| `docs/apps-script.gs` | Delete — no longer needed |

## Sheet Setup (user does once)

1. Open the Google Sheet
2. Create a tab named exactly `Shortfall` with headers: `Date`, `PlayerName`, `PeriodsPlayed`, `Shortfall`
3. Create a tab named exactly `Match History` with headers: `Date`, `Player`, `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8`, `Total`
4. Copy the Spreadsheet ID from the URL and paste into the app Settings

## Out of Scope

- Token refresh / silent re-auth (user clicks Save Match again after 1 hour)
- Creating sheet tabs automatically
- Multiple spreadsheets per coach
- Any changes to rota logic, PlayerList, RotaTable, PlayerManagement
