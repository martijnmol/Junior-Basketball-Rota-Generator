// src/App.tsx
import React, { useState, useMemo, useEffect } from 'react';
import PlayerList from './components/PlayerList';
import RotaTable from './components/RotaTable';
import PlayerManagement from './components/PlayerManagement';
import Settings from './components/Settings';
import StatsTable from './components/StatsTable';
import { generateRota } from './rotaLogic';
import { Player } from './interfaces';
import { getScriptUrl, setScriptUrl } from './settingsStorage';
import { appendMatch, AppendMatchPayload } from './sheetsApi';

// --- Local Storage Configuration ---
const LOCAL_STORAGE_KEY = 'basketball-rota-players';

// Define the fallback data structure
const FALLBACK_PLAYER_DATA: Player[] = [
    // Create 10 default players
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
// Note: We use the FALLBACK data now, not the old INITIAL_PLAYER_DATA constant

const NUM_PERIODS = 8;
const NUM_ON_COURT = 5;

// Helper to get a new unique ID
const getNextId = (currentPlayers: Player[]) => {
    const maxId = currentPlayers.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
};

// --- Function to load state from local storage or use the fallback ---
const loadSavedData = (): Player[] => {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            // Note: periodsPlayed and lastPlayedPeriod will be preserved from the save, 
            // but the rotaLogic should reset them on calculation if needed.
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error("Error loading data from local storage:", error);
    }
    // Return the fallback data if nothing is saved or an error occurs
    return FALLBACK_PLAYER_DATA;
};


function App() {
    // 1. Initialize state using the loading function
    const [players, setPlayers] = useState<Player[]>(loadSavedData);
    const [scriptUrl, setScriptUrlState] = useState<string | null>(getScriptUrl());
    const [statsRefreshKey, setStatsRefreshKey] = useState(0);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);

    // 2. Use useEffect to save playerData whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(players));
        } catch (error) {
            console.error("Error saving data to local storage:", error);
        }
    }, [players]); // Save whenever the 'players' state changes

    // --- NEW: Function to handle reordering the player array (Drag-and-Drop) ---
    const handleReorderPlayers = (startIndex: number, endIndex: number) => {
        const result = Array.from(players);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        setPlayers(result); // Triggers saving via useEffect
    };

    // --- State Handlers for Player CRUD ---

    const handleAddPlayer = (name: string) => {
        const newPlayer: Player = {
            id: getNextId(players),
            name: name || `Player ${getNextId(players)}`,
            periodsPlayed: 0,
            lastPlayedPeriod: -1,
            isPresent: true, // New players start as present
        };
        setPlayers(prevPlayers => [...prevPlayers, newPlayer]); // Triggers saving
    };

    const handleRemovePlayer = (id: number) => {
        setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== id)); // Triggers saving
    };

    const handleEditPlayerName = (id: number, newName: string) => {
        setPlayers(prevPlayers => prevPlayers.map(p => 
            p.id === id ? { ...p, name: newName } : p
        )); // Triggers saving
    };

    const togglePresence = (id: number) => {
        setPlayers(prevPlayers => prevPlayers.map(p =>
            p.id === id ? { ...p, isPresent: !p.isPresent } : p
        )); // Triggers saving
    };

    // Recalculate the rota whenever the list of available players changes
    const rota = useMemo(() => {
        return generateRota(players, NUM_PERIODS, NUM_ON_COURT);
    }, [players]);

    const handleSaveMatch = async () => {
        if (rota.length === 0 || !scriptUrl) return;

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
            await appendMatch(scriptUrl, payload);
            setSaveStatus('success');
            setStatsRefreshKey(k => k + 1);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            setSaveStatus('error');
            setSaveError(e instanceof Error ? e.message : 'An unknown error occurred');
        }
    };

    const handleUrlChange = (url: string) => {
        setScriptUrl(url);
        setScriptUrlState(url || null);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🏀 Junior Basketball Rota Generator</h1>

            <Settings onUrlChange={handleUrlChange} />

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
}

export default App;