// src/App.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import PlayerList from './components/PlayerList';
import RotaTable from './components/RotaTable';
import PlayerManagement from './components/PlayerManagement';
import Settings from './components/Settings';
import StatsTable from './components/StatsTable';
import { generateRota } from './rotaLogic';
import { Player, Rota, Position, PositionRota, PeriodPositions } from './interfaces';
import { getSpreadsheetId, setSpreadsheetId } from './settingsStorage';
import { appendMatch, AppendMatchPayload, savePlayers, loadPlayersFromSheet, saveLineup, loadLineupFromSheet } from './sheetsApi';
import { buildDefaultPositions } from './positionLogic';

const LOCAL_STORAGE_KEY = 'basketball-rota-players';
const POSITIONS_STORAGE_KEY = 'basketball-rota-positions';

const FALLBACK_PLAYER_DATA: Player[] = [
    { id: 1, name: 'Alex', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 2, name: 'Ben', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 3, name: 'Carly', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 4, name: 'David', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 5, name: 'Ella', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 6, name: 'Finn', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 7, name: 'Grace', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 8, name: 'Hugo', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 9, name: 'Ivy', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
    { id: 10, name: 'Jack', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
];

const NUM_PERIODS = 8;
const NUM_ON_COURT = 5;

const getNextId = (currentPlayers: Player[]) => {
    const maxId = currentPlayers.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
};

const loadSavedData = (): Player[] => {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (error) {
        console.error('Error loading data from local storage:', error);
    }
    return FALLBACK_PLAYER_DATA;
};

// Fingerprint captures which players are on court each period.
// If it matches the current rota, saved positions are still valid.
const makeRotaFingerprint = (rota: Rota): string =>
    rota.map(period => period.map(p => p.id).join(',')).join('|');

const loadSavedPositions = (rotaFingerprint: string): PositionRota | null => {
    try {
        const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
        if (!saved) return null;
        const { fingerprint, positions } = JSON.parse(saved) as { fingerprint: string; positions: PositionRota };
        if (fingerprint === rotaFingerprint) return positions;
    } catch {
        // ignore
    }
    return null;
};

function App() {
    const [players, setPlayers] = useState<Player[]>(loadSavedData);
    const [spreadsheetId, setSpreadsheetIdState] = useState<string | null>(getSpreadsheetId());
    const [statsRefreshKey, setStatsRefreshKey] = useState(0);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lineupStatus, setLineupStatus] = useState<'idle' | 'saving' | 'loading' | 'saved' | 'loaded' | 'error'>('idle');
    const [lineupError, setLineupError] = useState<string | null>(null);
    const initialLoadDone = useRef(false);
    const spreadsheetIdRef = useRef(spreadsheetId);

    useEffect(() => {
        spreadsheetIdRef.current = spreadsheetId;
    }, [spreadsheetId]);

    useEffect(() => {
        if (!initialLoadDone.current) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(players));
        } catch (error) {
            console.error('Error saving data to local storage:', error);
        }
        if (spreadsheetIdRef.current) {
            savePlayers(spreadsheetIdRef.current, players).catch(err =>
                console.error('Error saving players to sheet:', err)
            );
        }
    }, [players]);

    useEffect(() => {
        initialLoadDone.current = true;
    }, []);

    const handleReorderPlayers = (startIndex: number, endIndex: number) => {
        const result = Array.from(players);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setPlayers(result);
    };

    const handleAddPlayer = (name: string) => {
        const newPlayer: Player = {
            id: getNextId(players),
            name: name || `Player ${getNextId(players)}`,
            periodsPlayed: 0,
            lastPlayedPeriod: -1,
            isPresent: true,
        };
        setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
    };

    const handleRemovePlayer = (id: number) => {
        setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== id));
    };

    const handleEditPlayerName = (id: number, newName: string) => {
        setPlayers(prevPlayers => prevPlayers.map(p =>
            p.id === id ? { ...p, name: newName } : p
        ));
    };

    const handleUpdatePreferredPosition = (id: number, position: Position | undefined) => {
        setPlayers(prev => prev.map(p =>
            p.id === id ? { ...p, preferredPosition: position } : p
        ));
    };

    const handleUpdateJerseyNumber = (id: number, number: number | undefined) => {
        setPlayers(prev => prev.map(p =>
            p.id === id ? { ...p, jerseyNumber: number } : p
        ));
    };

    const togglePresence = (id: number) => {
        setPlayers(prevPlayers => prevPlayers.map(p =>
            p.id === id ? { ...p, isPresent: !p.isPresent } : p
        ));
    };

    const rota = useMemo(() => {
        return generateRota(players, NUM_PERIODS, NUM_ON_COURT);
    }, [players]);

    const [positionRota, setPositionRota] = useState<PositionRota>(() => {
        const initialRota = generateRota(loadSavedData(), NUM_PERIODS, NUM_ON_COURT);
        return loadSavedPositions(makeRotaFingerprint(initialRota)) ?? buildDefaultPositions(initialRota);
    });

    // Save positions with a rota fingerprint so we can validate them on reload.
    useEffect(() => {
        try {
            localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({
                fingerprint: makeRotaFingerprint(rota),
                positions: positionRota,
            }));
        } catch { /* ignore */ }
    }, [positionRota]); // rota captured from closure — always current at save time

    // Reset positions when the rota changes. Fingerprint check is StrictMode-safe:
    // it reads localStorage rather than relying on a "skip first render" ref.
    useEffect(() => {
        if (loadSavedPositions(makeRotaFingerprint(rota)) !== null) return;
        setPositionRota(buildDefaultPositions(rota));
    }, [rota]);

    const handlePositionsChange = (periodIndex: number, newPositions: PeriodPositions) => {
        setPositionRota(prev => {
            const next = [...prev];
            next[periodIndex] = newPositions;
            return next;
        });
    };

    const handleSaveMatch = async () => {
        if (rota.length === 0 || !spreadsheetId) return;

        const presentPlayers = players.filter(p => p.isPresent);
        if (presentPlayers.length === 0) return;

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
            await appendMatch(spreadsheetId, payload);
            setSaveStatus('success');
            setStatsRefreshKey(k => k + 1);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            setSaveStatus('error');
            setSaveError(e instanceof Error ? e.message : 'An unknown error occurred');
        }
    };

    const handleSaveLineup = async () => {
        if (!spreadsheetId) return;
        setLineupStatus('saving');
        setLineupError(null);
        try {
            await saveLineup(spreadsheetId, players, positionRota);
            setLineupStatus('saved');
            setTimeout(() => setLineupStatus('idle'), 3000);
        } catch (e) {
            setLineupStatus('error');
            setLineupError(e instanceof Error ? e.message : 'Unknown error');
        }
    };

    const handleLoadLineup = async () => {
        if (!spreadsheetId) return;
        setLineupStatus('loading');
        setLineupError(null);
        try {
            const loaded = await loadLineupFromSheet(spreadsheetId, players);
            if (!loaded) throw new Error('No lineup found in the sheet.');
            setPositionRota(loaded);
            try {
                localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({
                    fingerprint: makeRotaFingerprint(rota),
                    positions: loaded,
                }));
            } catch { /* ignore */ }
            setLineupStatus('loaded');
            setTimeout(() => setLineupStatus('idle'), 3000);
        } catch (e) {
            setLineupStatus('error');
            setLineupError(e instanceof Error ? e.message : 'Unknown error');
        }
    };

    const handleIdChange = (id: string) => {
        setSpreadsheetId(id);
        setSpreadsheetIdState(id || null);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🏀 Junior Basketball Rota Generator</h1>

            <Settings onIdChange={handleIdChange} onConnect={() => {
                setStatsRefreshKey(k => k + 1);
                if (spreadsheetId) {
                    loadPlayersFromSheet(spreadsheetId).then(sheetPlayers => {
                        if (sheetPlayers !== null) setPlayers(sheetPlayers);
                    }).catch(err => console.error('Error loading players on connect:', err));
                }
            }} />

            <hr style={{ margin: '20px 0' }}/>

            <PlayerManagement
                players={players}
                onAdd={handleAddPlayer}
                onRemove={handleRemovePlayer}
                onEditName={handleEditPlayerName}
                onUpdatePreferredPosition={handleUpdatePreferredPosition}
                onUpdateJerseyNumber={handleUpdateJerseyNumber}
            />

            <hr style={{ margin: '20px 0' }}/>

            <PlayerList
                players={players}
                onToggle={togglePresence}
                onReorder={handleReorderPlayers}
            />

            <hr style={{ margin: '20px 0' }}/>

            <RotaTable
                rota={rota}
                allPlayers={players}
                positionRota={positionRota}
                onPositionsChange={handlePositionsChange}
            />

            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <button
                    onClick={handleSaveLineup}
                    disabled={!spreadsheetId || lineupStatus === 'saving' || lineupStatus === 'loading'}
                    style={{
                        padding: '8px 18px',
                        backgroundColor: !spreadsheetId ? '#aaa' : '#3f51b5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: !spreadsheetId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                    }}
                >
                    {lineupStatus === 'saving' ? 'Saving...' : '💾 Save Lineup'}
                </button>
                <button
                    onClick={handleLoadLineup}
                    disabled={!spreadsheetId || lineupStatus === 'saving' || lineupStatus === 'loading'}
                    style={{
                        padding: '8px 18px',
                        backgroundColor: !spreadsheetId ? '#aaa' : '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: !spreadsheetId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                    }}
                >
                    {lineupStatus === 'loading' ? 'Loading...' : '📂 Load Lineup'}
                </button>
                {lineupStatus === 'saved' && <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Lineup saved!</span>}
                {lineupStatus === 'loaded' && <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Lineup loaded!</span>}
                {lineupStatus === 'error' && <span style={{ color: 'red' }}>⚠️ {lineupError}</span>}
                {!spreadsheetId && <span style={{ color: '#888', fontSize: '13px' }}>Configure Spreadsheet ID in Settings above to enable.</span>}
            </div>

            <hr style={{ margin: '20px 0' }}/>

            <div style={{ margin: '20px 0' }}>
                <button
                    onClick={handleSaveMatch}
                    disabled={rota.length === 0 || !spreadsheetId || saveStatus === 'saving'}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: rota.length === 0 || !spreadsheetId ? '#aaa' : '#3f51b5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: rota.length === 0 || !spreadsheetId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '15px',
                    }}
                >
                    {saveStatus === 'saving' ? 'Saving...' : '💾 Save Match to Statistics'}
                </button>
                {saveStatus === 'success' && (
                    <span style={{ marginLeft: '12px', color: 'green', fontWeight: 'bold' }}>✓ Match saved!</span>
                )}
                {saveStatus === 'error' && (
                    <span style={{ marginLeft: '12px', color: 'red' }}>⚠️ {saveError}</span>
                )}
                {!spreadsheetId && (
                    <span style={{ marginLeft: '12px', color: '#888', fontSize: '13px' }}>Configure Spreadsheet ID in Settings above to enable saving.</span>
                )}
            </div>

            <StatsTable spreadsheetId={spreadsheetId} refreshKey={statsRefreshKey} />
        </div>
    );
}

export default App;
