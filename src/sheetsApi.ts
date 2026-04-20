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
    if (!url) throw new Error('Apps Script URL is not configured.');
    // Apps Script rejects 'application/json' in no-cors mode; 'text/plain' is required.
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
    });
    // Note: Apps Script may return HTTP 200 with an HTML error page on redirect — the caller
    // cannot treat a resolved promise as guaranteed write confirmation.
    if (!response.ok) {
        throw new Error(`Failed to save match: ${response.status}`);
    }
};

interface SheetRow {
    PlayerName: string;
    Shortfall: string;
}

export const fetchStats = async (url: string): Promise<PlayerStats[]> => {
    if (!url) throw new Error('Apps Script URL is not configured.');
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) {
        throw new Error('Unexpected response from Apps Script — check deployment.');
    }

    const totals: Record<string, number> = {};
    for (const row of rows as SheetRow[]) {
        const name = row.PlayerName;
        const shortfall = parseInt(row.Shortfall, 10) || 0;
        totals[name] = (totals[name] ?? 0) + shortfall;
    }

    return Object.entries(totals)
        .map(([playerName, cumulativeShortfall]) => ({ playerName, cumulativeShortfall }))
        .sort((a, b) => b.cumulativeShortfall - a.cumulativeShortfall);
};
