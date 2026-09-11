import React, { useState } from 'react';
import { Rota, Player, PeriodPositions, PositionRota, POSITION_COLORS } from '../interfaces';
import { useRotaPreferences } from '../rotaPreferences';
import { getPlayerPosition } from '../positionLogic';
import CourtSvg from './CourtSvg';
import CourtModal from './CourtModal';

interface RotaTableProps {
    rota: Rota;
    allPlayers: Player[];
    positionRota: PositionRota;
    onPositionsChange: (periodIndex: number, positions: PeriodPositions) => void;
}

const ToggleButton: React.FC<{ on: boolean; onToggle: () => void; label: string }> = ({ on, onToggle, label }) => (
    <button
        onClick={onToggle}
        style={{
            padding: '4px 10px',
            fontSize: 12,
            borderRadius: 4,
            border: `1px solid ${on ? '#3f51b5' : '#bbb'}`,
            background: on ? '#3f51b5' : '#f5f5f5',
            color: on ? 'white' : '#555',
            cursor: 'pointer',
            fontWeight: on ? 'bold' : 'normal',
        }}
    >
        {label}
    </button>
);

const RotaTable: React.FC<RotaTableProps> = ({
    rota,
    allPlayers,
    positionRota,
    onPositionsChange,
}) => {
    const [modalPeriod, setModalPeriod] = useState<number | null>(null);
    const { prefs, updatePref } = useRotaPreferences();
    const { showJerseys, showPositions } = prefs;

    const availablePlayers = allPlayers.filter(p => p.isPresent);
    const numPeriods = 8;

    if (rota.length === 0) {
        return (
            <p style={{ color: 'red', fontWeight: 'bold' }}>
                ⚠️ Rota cannot be generated. Check player availability (need at least 5).
            </p>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>🗓️ Game Rota (Transposed View)</h2>
                <ToggleButton on={showJerseys} onToggle={() => updatePref('showJerseys', !showJerseys)} label="# Jerseys" />
                <ToggleButton on={showPositions} onToggle={() => updatePref('showPositions', !showPositions)} label="🏀 Positions" />
            </div>
            <div className="rota-container">
                <table
                    className="rota-table"
                    style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center' }}
                >
                    <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={{ padding: '8px' }}>Player</th>
                            {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
                                <th key={`P${period}`} style={{ padding: '6px 8px' }}>
                                    <div>P{period}</div>
                                    {showPositions && positionRota[period - 1] && (
                                        <button
                                            onClick={() => setModalPeriod(period)}
                                            style={{
                                                marginTop: 4,
                                                padding: '2px 6px',
                                                fontSize: 13,
                                                background: '#3f51b5',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                            }}
                                            title={`View court formation for Period ${period}`}
                                        >
                                            🏟️
                                        </button>
                                    )}
                                </th>
                            ))}
                            <th style={{ padding: '8px', backgroundColor: '#e0e0e0' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availablePlayers.map(player => {
                            let totalPlayed = 0;
                            const nameLabel = showJerseys && player.jerseyNumber != null
                                ? `${player.name} (#${player.jerseyNumber})`
                                : player.name;

                            return (
                                <tr key={player.id}>
                                    <td
                                        style={{
                                            border: '1px solid #ddd',
                                            padding: '8px',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {nameLabel}
                                    </td>
                                    {rota.map((periodPlayers, periodIndex) => {
                                        const isPlaying = periodPlayers.some(p => p.id === player.id);
                                        if (isPlaying) totalPlayed++;

                                        const periodPositions = positionRota[periodIndex];
                                        const position =
                                            showPositions && isPlaying && periodPositions
                                                ? getPlayerPosition(periodPositions, player.id)
                                                : undefined;

                                        return (
                                            <td
                                                key={`P${periodIndex + 1}_${player.id}`}
                                                style={{
                                                    border: '1px solid #ddd',
                                                    padding: '4px',
                                                    backgroundColor: isPlaying ? '#e6ffe6' : '#fff0f0',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {isPlaying && position ? (
                                                    <div
                                                        title={`${position} — click 🏟️ to edit`}
                                                        style={{ display: 'inline-block' }}
                                                    >
                                                        <CourtSvg
                                                            width={56}
                                                            dots={[{ position, color: POSITION_COLORS[position] }]}
                                                        />
                                                    </div>
                                                ) : isPlaying ? (
                                                    '🏀'
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td
                                        style={{
                                            border: '1px solid #ddd',
                                            padding: '8px',
                                            fontWeight: 'bold',
                                            backgroundColor: '#ccffcc',
                                        }}
                                    >
                                        {totalPlayed}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalPeriod !== null && positionRota[modalPeriod - 1] && (
                <CourtModal
                    period={modalPeriod}
                    positions={positionRota[modalPeriod - 1]}
                    players={allPlayers}
                    onPositionsChange={newPositions => onPositionsChange(modalPeriod - 1, newPositions)}
                    onClose={() => setModalPeriod(null)}
                />
            )}
        </div>
    );
};

export default RotaTable;
