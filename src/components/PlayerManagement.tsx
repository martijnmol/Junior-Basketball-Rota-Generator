// src/components/PlayerManagement.tsx
import React, { useState } from 'react';
import { Player, Position, POSITION_ORDER, POSITION_COLORS } from '../interfaces';

interface PlayerManagementProps {
  players: Player[];
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
  onEditName: (id: number, newName: string) => void;
  onUpdatePositionWeights: (id: number, weights: Partial<Record<Position, number>>) => void;
  onUpdateJerseyNumber: (id: number, number: number | undefined) => void;
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({
  players, onAdd, onRemove, onEditName, onUpdatePositionWeights, onUpdateJerseyNumber,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    if (editName.trim()) onEditName(id, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) setEditingId(null);
  };

  const handleWeightChange = (player: Player, pos: Position, raw: string) => {
    const val = raw === '' ? undefined : Math.min(100, Math.max(0, Number(raw)));
    const current = player.positionWeights ?? {};
    const next: Partial<Record<Position, number>> = { ...current };
    if (val === undefined || Number.isNaN(val)) {
      delete next[pos];
    } else {
      next[pos] = val;
    }
    onUpdatePositionWeights(player.id, next);
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
          <hr style={{ margin: '10px 0' }} />
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="New Player Name"
              style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ➕ Add Player
            </button>
          </form>

          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666' }}>
            Enter 0–100 position weights per player. Higher = stronger preference. Used by Auto Lineup.
          </p>

          <ul style={{ listStyleType: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
            {players.map(player => (
              <li key={player.id} style={{ padding: '6px 0', borderBottom: '1px dotted #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  {editingId === player.id ? (
                    <div style={{ display: 'flex', flexGrow: 1, gap: '5px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ flexGrow: 1, padding: '5px', border: '1px solid #aaa', borderRadius: '3px' }}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(player.id); }}
                      />
                      <button onClick={() => saveEdit(player.id)} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <span style={{ flexGrow: 1, fontWeight: 'bold', minWidth: 80 }}>{player.name}</span>
                  )}

                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={player.jerseyNumber ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateJerseyNumber(player.id, val === '' ? undefined : Number(val));
                      }}
                      placeholder="#"
                      title="Jersey number"
                      style={{ width: 40, padding: '4px 4px', borderRadius: '3px', border: '1px solid #ccc', fontSize: 12, textAlign: 'center' }}
                    />

                    {/* Position weight inputs */}
                    {POSITION_ORDER.map(pos => (
                      <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: 9, fontWeight: 'bold', color: POSITION_COLORS[pos] }}>{pos}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={player.positionWeights?.[pos] ?? ''}
                          onChange={e => handleWeightChange(player, pos, e.target.value)}
                          placeholder="0"
                          title={`${pos} weight (0–100)`}
                          style={{ width: 36, padding: '3px 2px', borderRadius: '3px', border: `1px solid ${POSITION_COLORS[pos]}`, fontSize: 11, textAlign: 'center' }}
                        />
                      </div>
                    ))}

                    {editingId !== player.id && (
                      <button onClick={() => startEdit(player)} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
                        ✏️
                      </button>
                    )}
                    <button onClick={() => onRemove(player.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
                      🗑️
                    </button>
                  </div>
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
