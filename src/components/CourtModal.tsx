import React, { useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    Player,
    Position,
    PeriodPositions,
    POSITION_COORDS,
    POSITION_COLORS,
    POSITION_LABELS,
    POSITION_ORDER,
} from '../interfaces';
import { swapPositions } from '../positionLogic';
import CourtSvg from './CourtSvg';

interface PositionSlotProps {
    position: Position;
    playerId: number;
    players: Player[];
}

const PositionSlot: React.FC<PositionSlotProps> = ({ position, playerId, players }) => {
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: position });
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        transform,
        isDragging,
    } = useDraggable({ id: position });

    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            setDropRef(node);
            setDragRef(node);
        },
        [setDropRef, setDragRef],
    );

    const player = players.find(p => p.id === playerId);
    const coords = POSITION_COORDS[position];
    const color = POSITION_COLORS[position];

    return (
        <div
            ref={setRefs}
            {...attributes}
            {...listeners}
            style={{
                transform: CSS.Translate.toString(transform),
                position: 'absolute',
                left: `calc(${coords.x}% - 44px)`,
                top: `calc(${coords.y}% - 20px)`,
                width: 88,
                textAlign: 'center',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : 1,
                userSelect: 'none',
            }}
        >
            <div
                style={{
                    background: isOver ? `${color}22` : isDragging ? `${color}18` : 'white',
                    border: `2px solid ${color}`,
                    borderRadius: 8,
                    padding: '3px 6px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    opacity: isDragging ? 0.7 : 1,
                    boxShadow: `0 2px 8px ${color}88`,
                    transition: 'background 0.1s, border-color 0.1s',
                }}
            >
                <div style={{ fontSize: 9, color: '#666', lineHeight: 1.2 }}>
                    {POSITION_LABELS[position]}
                </div>
                <div style={{ lineHeight: 1.4 }}>{player?.name ?? '?'}</div>
            </div>
        </div>
    );
};

interface CourtModalProps {
    period: number;
    positions: PeriodPositions;
    players: Player[];
    onPositionsChange: (positions: PeriodPositions) => void;
    onClose: () => void;
}

const CourtModal: React.FC<CourtModalProps> = ({
    period,
    positions,
    players,
    onPositionsChange,
    onClose,
}) => {
    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            onPositionsChange(swapPositions(positions, active.id as Position, over.id as Position));
        },
        [positions, onPositionsChange],
    );

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    maxWidth: '90vw',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                    }}
                >
                    <h3 style={{ margin: 0 }}>🏀 Period {period} — Court Formation</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 22,
                            cursor: 'pointer',
                            lineHeight: 1,
                        }}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>
                    Drag player chips to swap their court positions.
                </p>
                <DndContext onDragEnd={handleDragEnd}>
                    <div style={{ position: 'relative', width: 400, height: 320 }}>
                        <CourtSvg width={400} dots={[]} />
                        {POSITION_ORDER.map(pos => (
                            <PositionSlot
                                key={pos}
                                position={pos}
                                playerId={positions[pos]}
                                players={players}
                            />
                        ))}
                    </div>
                </DndContext>
            </div>
        </div>
    );
};

export default CourtModal;
