// src/App.tsx
import React, { useState, useMemo } from 'react';
import PlayerList from './components/PlayerList';
import RotaTable from './components/RotaTable';
import PlayerManagement from './components/PlayerManagement'; 
import { generateRota } from './rotaLogic';
import { Player } from './interfaces'; // <-- CORRECTED PATH: Use './interfaces'

const INITIAL_PLAYER_DATA: Player[] = [
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

// Helper to get a new unique ID
const getNextId = (currentPlayers: Player[]) => {
    const maxId = currentPlayers.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
};

function App() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYER_DATA);

  // --- NEW: Function to handle reordering the player array (Drag-and-Drop) ---
  const handleReorderPlayers = (startIndex: number, endIndex: number) => {
    const result = Array.from(players);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    setPlayers(result);
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

  const togglePresence = (id: number) => {
    setPlayers(prevPlayers => prevPlayers.map(p => 
      p.id === id ? { ...p, isPresent: !p.isPresent } : p
    ));
  };
  
  // Recalculate the rota whenever the list of available players changes
  const rota = useMemo(() => {
    return generateRota(players, NUM_PERIODS, NUM_ON_COURT);
  }, [players]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏀 Junior Basketball Rota Generator</h1>
      
      {/* --- Player Management Section --- */}
      <PlayerManagement
        players={players}
        onAdd={handleAddPlayer}
        onRemove={handleRemovePlayer}
        onEditName={handleEditPlayerName}
      />
      
      <hr style={{ margin: '20px 0' }}/>
      
      {/* --- Availability Toggler --- */}
      <PlayerList 
        players={players} 
        onToggle={togglePresence} 
        onReorder={handleReorderPlayers} // <-- ADDED MISSING PROP
      />
      
      <hr style={{ margin: '20px 0' }}/>
      
      {/* --- Rota Table --- */}
      <RotaTable rota={rota} allPlayers={players} />
    </div>
  );
}

export default App;