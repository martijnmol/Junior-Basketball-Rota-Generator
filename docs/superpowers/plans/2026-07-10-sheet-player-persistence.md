# Sheet Player Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a Google Sheet is connected, persist the player roster (`Player[]`) to a `Players` tab in the sheet in addition to localStorage; on page load, prefer the sheet data over localStorage when a sheet is configured.

**Architecture:** Add two new functions to `sheetsApi.ts` (`savePlayers` / `loadPlayersFromSheet`) that read/write a `Players` sheet tab as JSON. `App.tsx` keeps its synchronous localStorage init (so the app renders immediately), then fires an async effect on mount to replace the players state with sheet data when a `spreadsheetId` exists. The existing `useEffect` that writes to localStorage is extended to also call `savePlayers` when connected.

**Tech Stack:** React 19, TypeScript, Google Sheets REST API v4 (already used in `sheetsApi.ts`), Jest + React Testing Library (CRA defaults).

---

## File Map

| File | Change |
|---|---|
| `src/sheetsApi.ts` | Add `savePlayers(spreadsheetId, players)` and `loadPlayersFromSheet(spreadsheetId)` |
| `src/App.tsx` | Add async load-from-sheet effect on mount; extend save effect to also write to sheet |
| `src/sheetsApi.test.ts` | New — unit tests for `savePlayers` and `loadPlayersFromSheet` (mocking `fetch` and `getAccessToken`) |
| `src/App.test.tsx` | New — integration tests for the dual-persist and sheet-first-load behaviour |

---

## Task 1: Add `savePlayers` to `sheetsApi.ts`

**Files:**
- Modify: `src/sheetsApi.ts`
- Test: `src/sheetsApi.test.ts` (create)

The tab name is `Players`. The entire player array is stored as a single JSON string in cell `A1`. This is the simplest approach — the array is small (never more than ~20 players) and avoids dealing with header rows or cell-per-field mapping.

- [ ] **Step 1: Write the failing test**

Create `src/sheetsApi.test.ts`:

```typescript
// src/sheetsApi.test.ts
import { savePlayers } from './sheetsApi';
import { Player } from './interfaces';

// sheetsApi uses module-level state for accessToken and calls window.google.
// We need to mock getAccessToken indirectly by patching fetch and window.google.
// The simplest approach: mock the whole module except the function under test,
// and use jest.spyOn on the module-private getAccessToken by extracting it via
// a manual mock of the token flow.

// Instead: we expose getAccessToken for testing via a re-export, OR we mock
// fetch so that it never needs a real token. We'll stub window.google to return
// a fake token synchronously.

beforeEach(() => {
  (window as any).google = {
    accounts: {
      oauth2: {
        initTokenClient: (_opts: any) => ({
          requestAccessToken: () => {
            _opts.callback({ access_token: 'fake-token', expires_in: 3600 });
          },
        }),
      },
    },
  };
});

afterEach(() => {
  jest.resetAllMocks();
  // Reset the module-level accessToken between tests by re-importing fresh
  jest.resetModules();
});

const PLAYERS: Player[] = [
  { id: 1, name: 'Alex', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
  { id: 2, name: 'Ben', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
];

describe('savePlayers', () => {
  it('creates the Players tab if missing and writes JSON to A1', async () => {
    const fetchMock = jest.fn();

    // GET spreadsheet metadata — no Players tab
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Shortfall' } }] }),
    });
    // POST batchUpdate — create Players tab
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // PUT A1 with JSON
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    global.fetch = fetchMock as any;

    await savePlayers('sheet-id-123', PLAYERS);

    // Third call should be the PUT to Players!A1
    const putCall = fetchMock.mock.calls[2];
    expect(putCall[0]).toContain('Players!A1');
    expect(putCall[1].method).toBe('PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.values[0][0]).toBe(JSON.stringify(PLAYERS));
  });

  it('skips tab creation if Players tab already exists', async () => {
    const fetchMock = jest.fn();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Players' } }] }),
    });
    // PUT A1
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    global.fetch = fetchMock as any;

    await savePlayers('sheet-id-123', PLAYERS);

    expect(fetchMock).toHaveBeenCalledTimes(2); // GET meta + PUT A1 only
  });

  it('throws when the PUT fails', async () => {
    const fetchMock = jest.fn();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Players' } }] }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });

    global.fetch = fetchMock as any;

    await expect(savePlayers('sheet-id-123', PLAYERS)).rejects.toThrow('Failed to save players: 403');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern=sheetsApi --watchAll=false
```

Expected: `Cannot find module './sheetsApi' export 'savePlayers'` or similar compile error.

- [ ] **Step 3: Implement `savePlayers` in `src/sheetsApi.ts`**

Add after the `fetchStats` export at the bottom of the file:

```typescript
export const savePlayers = async (spreadsheetId: string, players: Player[]): Promise<void> => {
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not configured.');
    const token = await getAccessToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Ensure the Players tab exists
    const metaRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
        { headers }
    );
    if (!metaRes.ok) throw new Error(`Could not read spreadsheet: ${metaRes.status}`);
    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets ?? []).map((s: any) => s.properties.title as string);

    if (!existingTitles.includes('Players')) {
        const batchRes = await fetch(
            `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
            { method: 'POST', headers, body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Players' } } }] }) }
        );
        if (!batchRes.ok) throw new Error(`Failed to create Players tab: ${batchRes.status}`);
    }

    // Write entire player array as JSON string in A1
    const putRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}/values/Players!A1?valueInputOption=RAW`,
        { method: 'PUT', headers, body: JSON.stringify({ values: [[JSON.stringify(players)]] }) }
    );
    if (!putRes.ok) throw new Error(`Failed to save players: ${putRes.status}`);
};
```

Also add the `Player` import at the top of `sheetsApi.ts` (it currently has no imports):

```typescript
import { Player } from './interfaces';
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm test -- --testPathPattern=sheetsApi --watchAll=false
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sheetsApi.ts src/sheetsApi.test.ts
git commit -m "feat: add savePlayers to sheetsApi — persists player roster to Players tab"
```

---

## Task 2: Add `loadPlayersFromSheet` to `sheetsApi.ts`

**Files:**
- Modify: `src/sheetsApi.ts`
- Modify: `src/sheetsApi.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/sheetsApi.test.ts`:

```typescript
import { loadPlayersFromSheet } from './sheetsApi';

describe('loadPlayersFromSheet', () => {
  it('returns parsed players when A1 contains valid JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [[JSON.stringify(PLAYERS)]] }),
    });
    global.fetch = fetchMock as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toEqual(PLAYERS);
    expect(fetchMock.mock.calls[0][0]).toContain('Players!A1');
  });

  it('returns null when the Players tab is empty (no values key)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('returns null when A1 is an empty string', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [['']] }),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('returns null when the fetch fails (sheet does not exist yet)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('returns null when JSON.parse fails (corrupt data)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [['not-valid-json{']] }),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --testPathPattern=sheetsApi --watchAll=false
```

Expected: 5 new tests fail with `loadPlayersFromSheet is not a function` or similar.

- [ ] **Step 3: Implement `loadPlayersFromSheet` in `src/sheetsApi.ts`**

Add after `savePlayers`:

```typescript
export const loadPlayersFromSheet = async (spreadsheetId: string): Promise<Player[] | null> => {
    if (!spreadsheetId) return null;
    try {
        const token = await getAccessToken();
        const res = await fetch(
            `${SHEETS_BASE}/${spreadsheetId}/values/Players!A1`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const cell: string = data.values?.[0]?.[0] ?? '';
        if (!cell) return null;
        return JSON.parse(cell) as Player[];
    } catch {
        return null;
    }
};
```

- [ ] **Step 4: Run tests to confirm they all pass**

```
npm test -- --testPathPattern=sheetsApi --watchAll=false
```

Expected: all 8 tests in `sheetsApi.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sheetsApi.ts src/sheetsApi.test.ts
git commit -m "feat: add loadPlayersFromSheet to sheetsApi — reads player roster from Players tab"
```

---

## Task 3: Wire dual-persist and sheet-first load into `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (create)

The plan:
1. `useState` initialiser stays as `loadSavedData()` (synchronous localStorage read — app renders immediately with no blank flash).
2. New `useEffect` runs once on mount: if `spreadsheetId` is set, call `loadPlayersFromSheet`; if it returns a non-null array, replace `players` state.
3. The existing persist `useEffect` is extended: if `spreadsheetId` is set, also call `savePlayers` (fire-and-forget — errors are logged, not surfaced to the user to avoid disrupting normal use).

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.tsx`:

```typescript
// src/App.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import * as sheetsApi from './sheetsApi';
import * as settingsStorage from './settingsStorage';

// Mock child components that have heavy deps or make fetch calls
jest.mock('./components/StatsTable', () => () => <div data-testid="stats-table" />);
jest.mock('./sheetsApi', () => ({
  appendMatch: jest.fn(),
  ensureSheetSetup: jest.fn(),
  savePlayers: jest.fn().mockResolvedValue(undefined),
  loadPlayersFromSheet: jest.fn().mockResolvedValue(null),
}));

// Stub window.google so Settings component doesn't crash
beforeAll(() => {
  (window as any).google = {
    accounts: { oauth2: { initTokenClient: jest.fn() } },
  };
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  (sheetsApi.savePlayers as jest.Mock).mockResolvedValue(undefined);
  (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);
});

describe('App — player persistence', () => {
  it('loads from localStorage when no spreadsheetId is set', () => {
    localStorage.setItem('basketball-rota-players', JSON.stringify([
      { id: 99, name: 'TestPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ]));
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue(null);

    render(<App />);

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(sheetsApi.loadPlayersFromSheet).not.toHaveBeenCalled();
  });

  it('calls loadPlayersFromSheet on mount when spreadsheetId is set', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.loadPlayersFromSheet).toHaveBeenCalledWith('my-sheet-id');
    });
  });

  it('replaces players with sheet data when loadPlayersFromSheet returns a non-null array', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    const sheetPlayers = [
      { id: 7, name: 'SheetPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ];
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(sheetPlayers);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SheetPlayer')).toBeInTheDocument();
    });
  });

  it('keeps localStorage players when loadPlayersFromSheet returns null', async () => {
    localStorage.setItem('basketball-rota-players', JSON.stringify([
      { id: 3, name: 'LocalPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ]));
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.loadPlayersFromSheet).toHaveBeenCalled();
    });
    expect(screen.getByText('LocalPlayer')).toBeInTheDocument();
  });

  it('calls savePlayers when spreadsheetId is set and players change', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.savePlayers).toHaveBeenCalledWith('my-sheet-id', expect.any(Array));
    });
  });

  it('does NOT call savePlayers when no spreadsheetId is set', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue(null);

    render(<App />);

    // Let any async effects settle
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(sheetsApi.savePlayers).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --testPathPattern=App --watchAll=false
```

Expected: most tests fail because `App.tsx` does not yet call `savePlayers` or `loadPlayersFromSheet`.

- [ ] **Step 3: Update `src/App.tsx`**

Add the import at the top (alongside existing `sheetsApi` import):

```typescript
import { appendMatch, AppendMatchPayload, savePlayers, loadPlayersFromSheet } from './sheetsApi';
```

Replace the existing persist `useEffect` (lines 53–59 in the original):

```typescript
useEffect(() => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(players));
    } catch (error) {
        console.error('Error saving data to local storage:', error);
    }
    if (spreadsheetId) {
        savePlayers(spreadsheetId, players).catch(err =>
            console.error('Error saving players to sheet:', err)
        );
    }
}, [players, spreadsheetId]);
```

Add a new `useEffect` for the async sheet load, directly after the persist effect:

```typescript
useEffect(() => {
    if (!spreadsheetId) return;
    loadPlayersFromSheet(spreadsheetId).then(sheetPlayers => {
        if (sheetPlayers !== null) {
            setPlayers(sheetPlayers);
        }
    }).catch(err => {
        console.error('Error loading players from sheet:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // intentionally empty — only run once on mount
```

- [ ] **Step 4: Run all tests**

```
npm test -- --watchAll=false
```

Expected: all tests in `App.test.tsx` and `sheetsApi.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: dual-persist players to sheet and localStorage; load from sheet first on mount"
```

---

## Task 4: Manual smoke test

The tests verify logic but not the OAuth flow. This task confirms the feature works end-to-end in the browser.

- [ ] **Step 1: Start the app**

```
npm start
```

- [ ] **Step 2: Connect a sheet**

Open Settings, enter a real Google Spreadsheet ID you own, click "Connect & set up sheet", complete the OAuth popup. Confirm "✓ Sheet is ready" appears.

- [ ] **Step 3: Verify save on change**

Add a new player (e.g. "SmokeTest"). Open the connected Google Sheet. Confirm a `Players` tab exists and cell A1 contains JSON with "SmokeTest" in it.

- [ ] **Step 4: Verify load on reload**

Hard-reload the page (Ctrl+Shift+R). The "SmokeTest" player should still appear after the brief moment for the sheet fetch to complete.

- [ ] **Step 5: Verify fallback**

Clear the spreadsheet ID from Settings (blank it out, save). Hard-reload. The players should load from localStorage — no `loadPlayersFromSheet` call should happen (confirm with browser DevTools → Network: no request to `sheets.googleapis.com/…/values/Players!A1`).

- [ ] **Step 6: Commit if any fixes were needed**

If the smoke test revealed a bug, fix it, then:

```bash
git add -p
git commit -m "fix: <describe what was wrong>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Persist to both localStorage and sheet when connected → Task 1 + Task 3
- ✅ On load, prefer sheet when connected → Task 2 + Task 3
- ✅ Fall back to localStorage when sheet unavailable/empty → `loadPlayersFromSheet` returns null → no state replacement
- ✅ No disruption to existing behaviour when no sheet is connected → `savePlayers` only called when `spreadsheetId` set; load effect early-returns when `spreadsheetId` is null

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `savePlayers(spreadsheetId: string, players: Player[]): Promise<void>` — consistent across Task 1 and Task 3
- `loadPlayersFromSheet(spreadsheetId: string): Promise<Player[] | null>` — consistent across Task 2 and Task 3
- `Player` type from `src/interfaces.ts` used throughout
