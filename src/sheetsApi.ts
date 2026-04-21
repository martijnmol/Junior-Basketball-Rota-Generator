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

// ---- API calls ----

export const appendMatch = async (spreadsheetId: string, payload: AppendMatchPayload): Promise<void> => {
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not configured.');
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
