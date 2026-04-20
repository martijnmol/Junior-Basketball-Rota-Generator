// src/components/PlayerList.tsx

import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player } from '../interfaces';

interface PlayerListProps {
    players: Player[];
    onToggle: (id: number) => void;
    onReorder: (startIndex: number, endIndex: number) => void;
}

interface SortableChipProps {
    player: Player;
    onToggle: (id: number) => void;
}

const SortableChip: React.FC<SortableChipProps> = ({ player, onToggle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: player.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <div
                role="button"
                tabIndex={0}
                onClick={() => onToggle(player.id)}
                style={{
                    padding: '10px 15px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    backgroundColor: player.isPresent ? '#4CAF50' : '#f44336',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'grab',
                    userSelect: 'none',
                    transition: 'background-color 0.2s',
                }}
            >
                {player.name}
            </div>
        </div>
    );
};

const PlayerList: React.FC<PlayerListProps> = ({ players, onToggle, onReorder }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const availableCount = players.filter(p => p.isPresent).length;

    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: { delay: 500, tolerance: 8 },
        }),
        useSensor(MouseSensor, {
            activationConstraint: { distance: 5 },
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = players.findIndex(p => p.id === active.id);
        const newIndex = players.findIndex(p => p.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
            onReorder(oldIndex, newIndex);
        }
    };

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
            <h2
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ margin: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>📋 Game Availability Toggler ({availableCount} / {players.length})</span>
                <span>{isCollapsed ? '🔽 Show' : '🔼 Hide'}</span>
            </h2>

            {!isCollapsed && (
                <>
                    <hr style={{ margin: '10px 0' }} />
                    <p>Drag and drop names to set the preferred team order. Tap names to toggle availability.</p>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={players.map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {players.map(player => (
                                    <SortableChip
                                        key={player.id}
                                        player={player}
                                        onToggle={onToggle}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </>
            )}
        </div>
    );
};

export default PlayerList;
