import React, { useState } from 'react';
import { Rota, Player, PeriodPositions, PositionRota, POSITION_COLORS } from '../interfaces';
import { useRotaPreferences, CellDisplayMode } from '../rotaPreferences';
import { getPlayerPosition } from '../positionLogic';
import { Position } from '../interfaces';
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
    const { showJerseys, cellDisplay, showScore } = prefs;
    const CELL_MODES: CellDisplayMode[] = ['ball', 'position', 'name'];
    const CELL_LABELS: Record<CellDisplayMode, string> = { ball: '🏀 Ball', position: '📍 Position', name: '👤 Name' };

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
                <button
                    onClick={() => updatePref('cellDisplay', CELL_MODES[(CELL_MODES.indexOf(cellDisplay) + 1) % CELL_MODES.length])}
                    style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1px solid #3f51b5',
                        background: '#3f51b5',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    {CELL_LABELS[cellDisplay]}
                </button>
                <ToggleButton on={showScore} onToggle={() => updatePref('showScore', !showScore)} label="📊 Score" />
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
                                    P{period}
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
                                        const assignedPos: Position | undefined =
                                            isPlaying && periodPositions
                                                ? getPlayerPosition(periodPositions, player.id)
                                                : undefined;

                                        let cellContent: React.ReactNode;
                                        if (!isPlaying) {
                                            cellContent = '—';
                                        } else if (cellDisplay === 'name') {
                                            cellContent = <span style={{ fontSize: 11 }}>{player.name}</span>;
                                        } else if (cellDisplay === 'position' && assignedPos) {
                                            cellContent = (
                                                <div
                                                    onClick={() => setModalPeriod(periodIndex + 1)}
                                                    title={`${assignedPos} — click to edit formation`}
                                                    style={{ display: 'inline-block', cursor: 'pointer' }}
                                                >
                                                    <CourtSvg
                                                        width={56}
                                                        dots={[{ position: assignedPos, color: POSITION_COLORS[assignedPos] }]}
                                                    />
                                                </div>
                                            );
                                        } else {
                                            cellContent = '🏀';
                                        }

                                        if (isPlaying && showScore) {
                                            const w = assignedPos ? (player.positionWeights?.[assignedPos] ?? 0) : 0;
                                            cellContent = (
                                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                                    {cellContent}
                                                    <span style={{ fontSize: 10, color: '#555' }}>{w}</span>
                                                </div>
                                            );
                                        }

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
                                                {cellContent}
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
                        {showScore && (
                            <tr>
                                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', backgroundColor: '#ede7f6', whiteSpace: 'nowrap' }}>
                                    Total Weight
                                </td>
                                {rota.map((periodPlayers, periodIndex) => {
                                    const periodPositions = positionRota[periodIndex];
                                    const total = periodPlayers.reduce((sum, p) => {
                                        if (!periodPositions) return sum;
                                        const pos = getPlayerPosition(periodPositions, p.id);
                                        const fullPlayer = availablePlayers.find(ap => ap.id === p.id);
                                        return sum + (pos && fullPlayer ? (fullPlayer.positionWeights?.[pos] ?? 0) : 0);
                                    }, 0);
                                    return (
                                        <td key={`wt_P${periodIndex}`} style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#ede7f6', textAlign: 'center', fontWeight: 'bold' }}>
                                            {total}
                                        </td>
                                    );
                                })}
                                <td style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#d1c4e9', fontWeight: 'bold', textAlign: 'center' }}>
                                    {rota.reduce((grand, periodPlayers, periodIndex) => {
                                        const periodPositions = positionRota[periodIndex];
                                        return grand + periodPlayers.reduce((sum, p) => {
                                            if (!periodPositions) return sum;
                                            const pos = getPlayerPosition(periodPositions, p.id);
                                            const fullPlayer = availablePlayers.find(ap => ap.id === p.id);
                                            return sum + (pos && fullPlayer ? (fullPlayer.positionWeights?.[pos] ?? 0) : 0);
                                        }, 0);
                                    }, 0)}
                                </td>
                            </tr>
                        )}
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
