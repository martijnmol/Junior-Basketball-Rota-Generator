// src/components/RotaTable.tsx
import React from 'react';
import { Rota, Player } from '../interfaces';

interface RotaTableProps {
  rota: Rota;
  allPlayers: Player[];
}

const RotaTable: React.FC<RotaTableProps> = ({ rota, allPlayers }) => {
  const availablePlayers = allPlayers.filter(p => p.isPresent);
  const numPeriods = 8; 

  if (rota.length === 0) {
    return <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Rota cannot be generated. Check player availability (need at least 5).</p>;
  }
    
  return (
    <div>
      <h2>🗓️ Game Rota (Transposed View)</h2>
      
      {/* 1. Scrolling Container with CSS Class */}
      <div className="rota-container">
        
        {/* 2. Table with CSS Class */}
        <table className="rota-table" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              {/* Corner Cell: Player Name Header */}
              <th style={{ padding: '8px' }}>Player</th>
              
              {/* Period Headers */}
              {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
                <th key={`P${period}`} style={{ padding: '8px' }}>P{period}</th>
              ))}
              
              {/* Total Column Header */}
              <th style={{ padding: '8px', backgroundColor: '#e0e0e0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {availablePlayers.map(player => {
              let totalPlayed = 0; 

              return (
                <tr key={player.id}>
                  {/* Player Name Column */}
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{player.name}</td>
                  
                  {rota.map((periodPlayers, periodIndex) => {
                    const isPlaying = periodPlayers.some(p => p.id === player.id);
                    
                    if (isPlaying) {
                      totalPlayed++; 
                    }

                    return (
                      <td
                        key={`P${periodIndex + 1}_${player.id}`}
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          backgroundColor: isPlaying ? '#e6ffe6' : '#fff0f0', 
                        }}
                      >
                        {isPlaying ? '🏀' : '—'} 
                      </td>
                    );
                  })}

                  <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', backgroundColor: '#ccffcc' }}>
                    {totalPlayed}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RotaTable;