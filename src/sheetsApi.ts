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
