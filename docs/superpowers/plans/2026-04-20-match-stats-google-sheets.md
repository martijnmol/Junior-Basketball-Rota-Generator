# Match Stats & Google Sheets Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let coaches save match results (shortfall + full rota) to their own Google Sheet, and display cumulative shortfall per player inside the app.

**Architecture:** A Google Apps Script web app (one per coach, self-hosted in their Google Sheet) acts as the backend. The React app POSTs match data and GETs stats via fetch — no OAuth, no server. Settings (the script URL) live in localStorage. Five new files, one modified file.

**Tech Stack:** React 19, TypeScript, Google Apps Script (doGet/doPost), localStorage

---

## Files

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/settingsStorage.ts` | Read/write Apps Script URL in localStorage |
| Create | `src/sheetsApi.ts` | `appendMatch` (POST) and `fetchStats` (GET) |
| Create | `src/components/Settings.tsx` | Collapsible URL input panel with setup guide |
| Create | `src/components/StatsTable.tsx` | Cumulative shortfall table |
| Create | `docs/apps-script.gs` | Apps Script source to paste into Google Sheets |
| Modify | `src/App.tsx` | Wire Save Match button + new components |

---

### Task 1: settingsStorage.ts

**Files:**
- Create: `src/settingsStorage.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/settingsStorage.ts

const SCRIPT_URL_KEY = 'basketball-rota-script-url';

export const getScriptUrl = (): string | null => {
    return localStorage.getItem(SCRIPT_URL_KEY);
};

export const setScriptUrl = (url: string): void => {
    localStorage.setItem(SCRIPT_URL_KEY, url);
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd c:/Development/-Junior-Basketball-Rota-Generator
npm run build 2>&1 | grep -E "error|warning|success" | tail -5
```

Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/settingsStorage.ts
git commit -m "feat: add settings storage for Apps Script URL"
```

---

### Task 2: sheetsApi.ts

**Files:**
- Create: `src/sheetsApi.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/sheetsApi.ts

export interface ShortfallRow {
    playerName: string;
    periodsPlayed: number;
    shortfall: number;
}

export interface HistoryRow {
    playerName: string;
    periods: boolean[]; // index 0 = P1, index 7 = P8
    total: number;
}

export interface AppendMatchPayload {
    date: string; // YYYY-MM-DD
    shortfallRows: ShortfallRow[];
    historyRows: HistoryRow[];
}

export interface PlayerStats {
    playerName: string;
    cumulativeShortfall: number;
}

export const appendMatch = async (url: string, payload: AppendMatchPayload): Promise<void> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to save match: ${response.status}`);
    }
};

export const fetchStats = async (url: string): Promise<PlayerStats[]> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    const rows: { PlayerName: string; Shortfall: string }[] = await response.json();

    const totals: Record<string, number> = {};
    for (const row of rows) {
        const name = row.PlayerName;
        const shortfall = parseInt(row.Shortfall, 10) || 0;
        totals[name] = (totals[name] ?? 0) + shortfall;
    }

    return Object.entries(totals)
        .map(([playerName, cumulativeShortfall]) => ({ playerName, cumulativeShortfall }))
        .sort((a, b) => b.cumulativeShortfall - a.cumulativeShortfall);
};
```

Note: Apps Script returns JSON with header names as keys (`PlayerName`, `Shortfall`). The `Content-Type: text/plain` header is required — Apps Script rejects `application/json` in no-cors mode.

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | grep -E "error|warning|success" | tail -5
```

Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/sheetsApi.ts
git commit -m "feat: add sheetsApi for appendMatch and fetchStats"
```

---

### Task 3: Apps Script source

**Files:**
- Create: `docs/apps-script.gs`

- [ ] **Step 1: Create the file**

```javascript
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
    historySheet.appendRow(['Date', 'Player', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'Total']);
  }
  payload.historyRows.forEach(function(row) {
    var periodCells = row.periods.map(function(played) { return played ? '🏀' : '—'; });
    historySheet.appendRow([payload.date, row.playerName].concat(periodCells).concat([row.total]));
  });

  return jsonResponse({ status: 'ok' });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/apps-script.gs
git commit -m "docs: add Apps Script source for Google Sheets backend"
```

---

### Task 4: Settings component

**Files:**
- Create: `src/components/Settings.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/Settings.tsx

import React, { useState } from 'react';
import { getScriptUrl, setScriptUrl } from '../settingsStorage';

const Settings: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [url, setUrl] = useState(getScriptUrl() ?? '');

    const handleSave = () => {
        setScriptUrl(url.trim());
    };

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
            <h2
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ margin: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>⚙️ Stats Settings</span>
                <span>{isCollapsed ? '🔽 Show' : '🔼 Hide'}</span>
            </h2>

            {!isCollapsed && (
                <>
                    <hr style={{ margin: '10px 0' }} />

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                            Apps Script URL
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onBlur={handleSave}
                                placeholder="https://script.google.com/macros/s/..."
                                style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <button
                                onClick={handleSave}
                                style={{ padding: '8px 15px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                            How to set up your Google Sheet
                        </summary>
                        <ol style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                            <li>Create a new Google Sheet at <a href="https://sheets.google.com" target="_blank" rel="noreferrer">sheets.google.com</a></li>
                            <li>Open <strong>Extensions → Apps Script</strong></li>
                            <li>Delete any existing code and paste in the contents of <code>docs/apps-script.gs</code> from this project</li>
                            <li>Click <strong>Deploy → New deployment</strong>, choose <em>Web app</em>, set <em>Execute as: Me</em> and <em>Who has access: Anyone</em></li>
                            <li>Copy the web app URL and paste it into the field above</li>
                        </ol>
                    </details>
                </>
            )}
        </div>
    );
};

export default Settings;
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | grep -E "error|warning|success" | tail -5
```

Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: add Settings component for Apps Script URL"
```

---

### Task 5: StatsTable component

**Files:**
- Create: `src/components/StatsTable.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/StatsTable.tsx

import React, { useEffect, useState } from 'react';
import { fetchStats, PlayerStats } from '../sheetsApi';

interface StatsTableProps {
    scriptUrl: string | null;
    refreshKey: number; // increment to trigger a refresh
}

const StatsTable: React.FC<StatsTableProps> = ({ scriptUrl, refreshKey }) => {
    const [stats, setStats] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scriptUrl) return;
        setLoading(true);
        setError(null);
        fetchStats(scriptUrl)
            .then(setStats)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [scriptUrl, refreshKey]);

    if (!scriptUrl) {
        return <p style={{ color: '#888' }}>Configure your Apps Script URL in Settings to see cumulative stats.</p>;
    }

    return (
        <div style={{ marginBottom: '20px' }}>
            <h2>📊 Cumulative Shortfall</h2>
            {loading && <p>Loading stats...</p>}
            {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}
            {!loading && !error && stats.length === 0 && (
                <p style={{ color: '#888' }}>No match data saved yet.</p>
            )}
            {!loading && stats.length > 0 && (
                <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Player</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Cumulative Shortfall</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(s => (
                            <tr key={s.playerName}>
                                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{s.playerName}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{s.cumulativeShortfall}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default StatsTable;
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | grep -E "error|warning|success" | tail -5
```

Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsTable.tsx
git commit -m "feat: add StatsTable component for cumulative shortfall"
```

---

### Task 6: Wire everything into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Read the current App.tsx**

Read `src/App.tsx` in full before editing. The current file has:
- `players` state (Player[])
- `rota` computed via `useMemo`
- `handleReorderPlayers`, `handleAddPlayer`, `handleRemovePlayer`, `handleEditPlayerName`, `togglePresence`
- Renders: `PlayerManagement`, `PlayerList`, `RotaTable`

- [ ] **Step 2: Add imports and new state at the top of App.tsx**

Add these imports after the existing imports:

```tsx
import Settings from './components/Settings';
import StatsTable from './components/StatsTable';
import { getScriptUrl, setScriptUrl } from './settingsStorage';
import { appendMatch, AppendMatchPayload } from './sheetsApi';
```

Add these state variables inside `function App()`, after the `players` state:

```tsx
const [scriptUrl, setScriptUrlState] = useState<string | null>(getScriptUrl());
const [statsRefreshKey, setStatsRefreshKey] = useState(0);
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
const [saveError, setSaveError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the handleSaveMatch function**

Add this function inside `function App()`, after the existing handlers:

```tsx
const handleSaveMatch = async () => {
    if (rota.length === 0 || !scriptUrl) return;

    const presentPlayers = players.filter(p => p.isPresent);
    const maxPeriods = Math.max(...presentPlayers.map(p =>
        rota.reduce((count, period) => count + (period.some(pp => pp.id === p.id) ? 1 : 0), 0)
    ));

    const date = new Date().toISOString().split('T')[0];

    const payload: AppendMatchPayload = {
        date,
        shortfallRows: presentPlayers.map(p => {
            const periodsPlayed = rota.reduce((count, period) =>
                count + (period.some(pp => pp.id === p.id) ? 1 : 0), 0);
            return {
                playerName: p.name,
                periodsPlayed,
                shortfall: maxPeriods - periodsPlayed,
            };
        }),
        historyRows: presentPlayers.map(p => {
            const periods = rota.map(period => period.some(pp => pp.id === p.id));
            return {
                playerName: p.name,
                periods,
                total: periods.filter(Boolean).length,
            };
        }),
    };

    setSaveStatus('saving');
    setSaveError(null);
    try {
        await appendMatch(scriptUrl, payload);
        setSaveStatus('success');
        setStatsRefreshKey(k => k + 1);
        setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e: any) {
        setSaveStatus('error');
        setSaveError(e.message);
    }
};
```

- [ ] **Step 4: Add handleUrlChange function**

Add this function inside `function App()`, after `handleSaveMatch`:

```tsx
const handleUrlChange = (url: string) => {
    setScriptUrl(url);
    setScriptUrlState(url || null);
};
```

Wait — `setScriptUrl` is the imported function from `settingsStorage`. To avoid name collision with React's setter, the import in Step 2 already names it `setScriptUrl` (from settingsStorage). The React state setter is `setScriptUrlState`. Confirm the import line reads:
```tsx
import { getScriptUrl, setScriptUrl } from './settingsStorage';
```
This is correct as written in Step 2.

- [ ] **Step 5: Update the JSX in App.tsx**

Replace the return statement's JSX to add the new components. The full updated return block:

```tsx
return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>🏀 Junior Basketball Rota Generator</h1>

        <Settings />

        <hr style={{ margin: '20px 0' }}/>

        <PlayerManagement
            players={players}
            onAdd={handleAddPlayer}
            onRemove={handleRemovePlayer}
            onEditName={handleEditPlayerName}
        />

        <hr style={{ margin: '20px 0' }}/>

        <PlayerList
            players={players}
            onToggle={togglePresence}
            onReorder={handleReorderPlayers}
        />

        <hr style={{ margin: '20px 0' }}/>

        <RotaTable rota={rota} allPlayers={players} />

        <div style={{ margin: '20px 0' }}>
            <button
                onClick={handleSaveMatch}
                disabled={rota.length === 0 || !scriptUrl || saveStatus === 'saving'}
                style={{
                    padding: '10px 24px',
                    backgroundColor: rota.length === 0 || !scriptUrl ? '#aaa' : '#3f51b5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: rota.length === 0 || !scriptUrl ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '15px',
                }}
            >
                {saveStatus === 'saving' ? 'Saving...' : '💾 Save Match'}
            </button>
            {saveStatus === 'success' && (
                <span style={{ marginLeft: '12px', color: 'green', fontWeight: 'bold' }}>✓ Match saved!</span>
            )}
            {saveStatus === 'error' && (
                <span style={{ marginLeft: '12px', color: 'red' }}>⚠️ {saveError}</span>
            )}
            {!scriptUrl && (
                <span style={{ marginLeft: '12px', color: '#888', fontSize: '13px' }}>Configure Apps Script URL in Settings above to enable saving.</span>
            )}
        </div>

        <hr style={{ margin: '20px 0' }}/>

        <StatsTable scriptUrl={scriptUrl} refreshKey={statsRefreshKey} />
    </div>
);
```

- [ ] **Step 6: Verify the app compiles**

```bash
cd c:/Development/-Junior-Basketball-Rota-Generator
npm run build 2>&1 | tail -20
```

Expected: `Compiled successfully.`

- [ ] **Step 7: Smoke-test in browser**

```bash
npm start
```

Verify:
- "⚙️ Stats Settings" panel appears at the top — expand it, paste any URL, click Save, collapse it, re-expand it — the URL should still be there
- "💾 Save Match" button is greyed out with "Configure Apps Script URL in Settings" hint if no URL is set
- After setting a URL, the button becomes active once the rota generates
- 📊 Cumulative Shortfall table appears below the button (will show "No match data saved yet." or a fetch error if the URL isn't a real Apps Script)

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Save Match button and stats components into App"
```
