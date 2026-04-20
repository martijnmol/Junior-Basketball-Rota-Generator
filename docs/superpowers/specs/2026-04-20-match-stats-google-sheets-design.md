# Design: Match Stats & Google Sheets Integration

**Date:** 2026-04-20  
**Status:** Approved

## Problem

The app generates a rota per match but has no cross-match memory. Coaches need to track cumulative shortfall — how much less each player has played compared to the best-played player across all matches they attended — persisted across sessions and shared between coaches who each maintain their own record.

## Shortfall Definition

```
match_shortfall = max_periods_played_by_present_players − this_player_periods_played
```

- Only present players are included in the calculation.
- The player(s) who played the most always get shortfall 0 for that match.
- Cumulative shortfall = sum of all match shortfalls across all matches.

## Storage: Google Apps Script Web App

Each coach creates their own Google Sheet with a published Apps Script web app. The React app talks to this URL directly — no OAuth, no server, no credentials in code. The URL is stored in `localStorage` and entered once via a Settings panel.

The sheet has two tabs:

### "Shortfall" tab

One row per present player per match.

| Column | Value |
|---|---|
| Date | ISO date string (YYYY-MM-DD) |
| PlayerName | Player's name |
| PeriodsPlayed | Integer |
| Shortfall | Integer (0 or positive) |

### "Match History" tab

One block of rows per match, with each present player on their own row.

| Column | Value |
|---|---|
| Date | ISO date string (YYYY-MM-DD) |
| Player | Player's name |
| P1–P8 | "🏀" if played, "—" if not |
| Total | Integer |

Each match appends a new block. No blank-row separator — the Date column identifies which rows belong together.

## Architecture

### New files

| File | Responsibility |
|---|---|
| `src/sheetsApi.ts` | `appendMatch(url, payload)` — POST to Apps Script; `fetchStats(url)` — GET all Shortfall rows, aggregate cumulative shortfall per player |
| `src/settingsStorage.ts` | `getScriptUrl(): string \| null` and `setScriptUrl(url: string): void` — read/write to localStorage |
| `src/components/Settings.tsx` | Collapsible panel with URL input field and setup instructions |
| `src/components/StatsTable.tsx` | Table showing each player's cumulative shortfall, fetched on mount and after each save |
| `docs/apps-script.gs` | The Apps Script source to paste into Google Sheets |

### Modified files

| File | Change |
|---|---|
| `src/App.tsx` | Add "Save Match" button; wire `appendMatch` on click; add `Settings` and `StatsTable` components |

### Untouched files

`rotaLogic.ts`, `PlayerList.tsx`, `RotaTable.tsx`, `interfaces.ts`, `PlayerManagement.tsx`

## Data Flow

### Save Match (POST)

1. Coach clicks "Save Match" button (only enabled when rota has been generated and script URL is set)
2. App computes for each present player:
   - `periodsPlayed` from the generated rota
   - `shortfall = max(periodsPlayed across present players) − this player's periodsPlayed`
3. App builds:
   - `shortfallRows`: one entry per present player for the Shortfall tab
   - `historyRows`: one entry per present player for the Match History tab (P1–P8 booleans)
4. Single POST to Apps Script URL with `{ date, shortfallRows, historyRows }`
5. Apps Script appends to both tabs atomically
6. On success: `StatsTable` refreshes

### Fetch Stats (GET)

- GET to Apps Script URL returns all rows from the Shortfall tab as JSON
- Client aggregates: `{ [playerName]: cumulativeShortfall }`
- `StatsTable` renders sorted by cumulative shortfall descending

## Apps Script (`docs/apps-script.gs`)

Handles two methods:

- `doGet()` — reads all rows from the Shortfall tab, returns JSON array
- `doPost(e)` — parses `{ date, shortfallRows, historyRows }`, appends to both tabs

Deployment settings: **Execute as: Me**, **Who has access: Anyone**

## UI

### Settings panel

- Same collapsible style as existing panels
- Single text input: "Apps Script URL"
- Short numbered setup guide (1–5 steps) linking to the `docs/apps-script.gs` file
- Saves to localStorage on blur/enter

### Save Match button

- Lives below `RotaTable`
- Disabled if: no rota generated, or no script URL configured
- Shows a brief success/error message after attempt

### StatsTable

- Lives below Save Match button
- Columns: Player | Cumulative Shortfall
- Sorted: highest shortfall first
- Loaded on app start (if URL is set) and refreshed after each successful save
- Shows a loading state and graceful error if fetch fails

## Out of Scope

- Authentication / shared secret
- Multiple coaches writing to the same sheet
- Editing or deleting past match records from the app
- Any changes to rota generation logic
