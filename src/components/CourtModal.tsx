import React, { useCallback, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
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
                left: `calc(${coords.x}% - 55px)`,
                top: `calc(${coords.y}% - 25px)`,
                width: 110,
                textAlign: 'center',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : 1,
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            <div
                style={{
                    background: isOver ? `${color}22` : isDragging ? `${color}18` : 'white',
                    border: `2px solid ${color}`,
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 15,
                    fontWeight: 'bold',
                    opacity: isDragging ? 0.7 : 1,
                    boxShadow: `0 2px 8px ${color}88`,
                    transition: 'background 0.1s, border-color 0.1s',
                }}
            >
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.2 }}>
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
    // Lock body scroll so the page doesn't steal touch events during drag.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor),
    );

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
                    padding: '12px 0',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    width: '100%',
                    boxSizing: 'border-box' as const,
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
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} autoScroll={false}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '200 / 160' }}>
                        <CourtSvg width="100%" dots={[]} />
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
