// src/sheetsApi.ts

const CLIENT_ID = '942845479443-lvci36nuggtd2scc7r231fakf4vb3tr7.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let accessToken: string | null = null;

const getAccessToken = (): Promise<string> =>
    new Promise((resolve, reject) => {
        if (accessToken) {
            resolve(accessToken);
            return;
        }
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
            reject(new Error('Google Identity Services not loaded yet. Please wait a moment and try again.'));
            return;
        }
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (response: any) => {
                if (response.error) {
                    reject(new Error(`OAuth error: ${response.error}`));
                    return;
                }
                accessToken = response.access_token;
                // Clear the token 60 seconds before it expires so the next call re-authenticates
                const ttl = ((response.expires_in ?? 3600) - 60) * 1000;
                setTimeout(() => { accessToken = null; }, ttl);
                resolve(accessToken!);
            },
        });
        client.requestAccessToken();
    });

// ---- Public interfaces ----

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

// ---- Sheet setup ----

const SHORTFALL_HEADERS = ['Date', 'PlayerName', 'PeriodsPlayed', 'Shortfall'];
const HISTORY_HEADERS = ['Date', 'Player', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'Total'];

export const ensureSheetSetup = async (spreadsheetId: string): Promise<void> => {
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not configured.');
    const token = await getAccessToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Fetch existing sheet titles
    const metaRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
        { headers }
    );
    if (!metaRes.ok) throw new Error(`Could not read spreadsheet: ${metaRes.status}`);
    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets ?? []).map((s: any) => s.properties.title as string);

    // 2. Create any missing tabs via batchUpdate
    const addRequests = [];
    if (!existingTitles.includes('Shortfall')) {
        addRequests.push({ addSheet: { properties: { title: 'Shortfall' } } });
    }
    if (!existingTitles.includes('Match History')) {
        addRequests.push({ addSheet: { properties: { title: 'Match History' } } });
    }
    if (addRequests.length > 0) {
        const batchRes = await fetch(
            `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
            { method: 'POST', headers, body: JSON.stringify({ requests: addRequests }) }
        );
        if (!batchRes.ok) throw new Error(`Failed to create sheet tabs: ${batchRes.status}`);
    }

    // 3. Read current row 1 of both tabs and overwrite if headers are wrong or missing
    const [shortfallRow1Res, historyRow1Res] = await Promise.all([
        fetch(`${SHEETS_BASE}/${spreadsheetId}/values/Shortfall!A1:D1`, { headers }),
        fetch(`${SHEETS_BASE}/${spreadsheetId}/values/Match%20History!A1:K1`, { headers }),
    ]);

    const shortfallRow1: string[] = ((await shortfallRow1Res.json()).values?.[0] ?? []);
    const historyRow1: string[] = ((await historyRow1Res.json()).values?.[0] ?? []);

    const writePromises: Promise<Response>[] = [];

    if (JSON.stringify(shortfallRow1) !== JSON.stringify(SHORTFALL_HEADERS)) {
        writePromises.push(fetch(
            `${SHEETS_BASE}/${spreadsheetId}/values/Shortfall!A1:D1?valueInputOption=RAW`,
            { method: 'PUT', headers, body: JSON.stringify({ values: [SHORTFALL_HEADERS] }) }
        ));
    }
    if (JSON.stringify(historyRow1) !== JSON.stringify(HISTORY_HEADERS)) {
        writePromises.push(fetch(
            `${SHEETS_BASE}/${spreadsheetId}/values/Match%20History!A1:K1?valueInputOption=RAW`,
            { method: 'PUT', headers, body: JSON.stringify({ values: [HISTORY_HEADERS] }) }
        ));
    }

    if (writePromises.length > 0) {
        const results = await Promise.all(writePromises);
        for (const res of results) {
            if (!res.ok) throw new Error(`Failed to write headers: ${res.status}`);
        }
    }
};

// ---- API calls ----

export const appendMatch = async (spreadsheetId: string, payload: AppendMatchPayload): Promise<void> => {
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not configured.');
    await ensureSheetSetup(spreadsheetId);
    const token = await getAccessToken();

    const shortfallValues = payload.shortfallRows.map(row => [
        payload.date,
        row.playerName,
        row.periodsPlayed,
        row.shortfall,
    ]);

    const historyValues = payload.historyRows.map(row => {
        const periodCells = row.periods.map(played => (played ? '🏀' : '—'));
        return [payload.date, row.playerName, ...periodCells, row.total];
    });

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch numeric sheet IDs needed for batchUpdate appendCells (the only reliable way to append a truly blank row)
    const metaRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`,
        { headers }
    );
    if (!metaRes.ok) throw new Error(`Could not read spreadsheet metadata: ${metaRes.status}`);
    const meta = await metaRes.json();
    const sheetIdByTitle: Record<string, number> = {};
    for (const s of meta.sheets ?? []) {
        sheetIdByTitle[s.properties.title] = s.properties.sheetId;
    }

    const [shortfallRes, historyRes] = await Promise.all([
        fetch(
            `${SHEETS_BASE}/${spreadsheetId}/values/Shortfall!A:D:append?valueInputOption=USER_ENTERED`,
            { method: 'POST', headers, body: JSON.stringify({ values: shortfallValues }) }
        ),
        fetch(
            `${SHEETS_BASE}/${spreadsheetId}/values/Match%20History!A:K:append?valueInputOption=USER_ENTERED`,
            { method: 'POST', headers, body: JSON.stringify({ values: historyValues }) }
        ),
    ]);

    if (!shortfallRes.ok) throw new Error(`Shortfall write failed: ${shortfallRes.status}`);
    if (!historyRes.ok) throw new Error(`Match History write failed: ${historyRes.status}`);

    // Append a genuinely blank row using batchUpdate appendCells — the values API skips empty rows entirely
    const blankRowRequest = (sheetId: number) => ({
        appendCells: {
            sheetId,
            rows: [{ values: [{ userEnteredValue: {} }] }],
            fields: 'userEnteredValue',
        },
    });

    const blankRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                requests: [
                    blankRowRequest(sheetIdByTitle['Shortfall']),
                    blankRowRequest(sheetIdByTitle['Match History']),
                ],
            }),
        }
    );
    if (!blankRes.ok) throw new Error(`Failed to append blank rows: ${blankRes.status}`);
};

export const fetchStats = async (spreadsheetId: string, signal?: AbortSignal): Promise<PlayerStats[]> => {
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not configured.');
    const token = await getAccessToken();

    const response = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}/values/Shortfall!A:D`,
        { headers: { 'Authorization': `Bearer ${token}` }, signal }
    );

    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);

    const data = await response.json();
    const rows: string[][] = data.values ?? [];

    if (rows.length <= 1) return []; // Only headers or empty

    // rows[0] = headers: Date, PlayerName, PeriodsPlayed, Shortfall
    const dataRows = rows.slice(1);
    const totals: Record<string, number> = {};
    for (const row of dataRows) {
        const name = row[1];
        const shortfall = Number(row[3]) || 0;
        if (name) totals[name] = (totals[name] ?? 0) + shortfall;
    }

    return Object.entries(totals)
        .map(([playerName, cumulativeShortfall]) => ({ playerName, cumulativeShortfall }))
        .sort((a, b) => b.cumulativeShortfall - a.cumulativeShortfall);
};
