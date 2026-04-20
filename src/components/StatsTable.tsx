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
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setStats([]);
        fetchStats(scriptUrl, controller.signal)
            .then(setStats)
            .catch(e => {
                if (e.name !== 'AbortError') setError(e.message);
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
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
