// src/components/PlayerManagement.tsx
import React, { useState } from 'react';
import { Player } from '../interfaces';

interface PlayerManagementProps {
  players: Player[];
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
  onEditName: (id: number, newName: string) => void;
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({ players, onAdd, onRemove, onEditName }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true); // <<-- CHANGED TO TRUE

  // Handler for adding a new player
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      onAdd(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

  const saveEdit = (id: number) => {
    if (editName.trim()) {
      onEditName(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };
    
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
        setEditingId(null);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
      <h2 
        onClick={toggleCollapse} 
        style={{ margin: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>⚙️ Manage Roster ({players.length} Players)</span>
        <span>{isCollapsed ? '🔽 Show' : '🔼 Hide'}</span>
      </h2>
      
      {!isCollapsed && (
        <>
          <hr style={{ margin: '10px 0' }}/>
          {/* --- Add Player Form --- */}
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="New Player Name"
              style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ➕ Add Player
            </button>
          </form>

          {/* --- Player List for Editing/Removing --- */}
          <ul style={{ listStyleType: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
            {players.map(player => (
              <li key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dotted #eee' }}>
                {editingId === player.id ? (
                  <div style={{ display: 'flex', flexGrow: 1, gap: '5px' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ flexGrow: 1, padding: '5px', border: '1px solid #aaa', borderRadius: '3px' }}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(player.id); }}
                    />
                    <button 
                      onClick={() => saveEdit(player.id)} 
                      style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <span style={{ flexGrow: 1 }}>{player.name} (ID: {player.id})</span>
                )}

                <div style={{ display: 'flex', gap: '5px' }}>
                  {editingId !== player.id && (
                    <button 
                      onClick={() => startEdit(player)} 
                      style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                  <button 
                    onClick={() => onRemove(player.id)} 
                    style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default PlayerManagement;