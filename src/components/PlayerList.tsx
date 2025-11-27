// src/components/PlayerList.tsx

import React, { useState } from 'react';
import { 
    DragDropContext, 
    Droppable, 
    Draggable, 
    DropResult, 
    DroppableProvided,       
    DraggableProvided,      
    DragStart
} from '@hello-pangea/dnd'; 
import { Player } from '../interfaces'; 

interface PlayerListProps {
    players: Player[];
    onToggle: (id: number) => void;
    onReorder: (startIndex: number, endIndex: number) => void; 
}

const PlayerList: React.FC<PlayerListProps> = ({ players, onToggle, onReorder }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const availableCount = players.filter(p => p.isPresent).length;
    
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        onReorder(
            result.source.index,
            result.destination.index
        );
    };

    // Logging function is fine here
    const logMartijn = (e:any) => {
        console.log("Player Toggled/Clicked (Martijn log):", e);
    }
    
    const onDragStart = (result: DragStart) => {
        console.log("Drag Start Check SUCCESS:", result);
    }

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
            <h2
                onClick={toggleCollapse} 
                style={{ margin: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>📋 Game Availability Toggler ({availableCount} / {players.length})</span>
                <span>{isCollapsed ? '🔽 Show' : '🔼 Hide'}</span>
            </h2>
            
            {!isCollapsed && (
                <>
                    <hr style={{ margin: '10px 0' }}/>
                    <p>Drag and drop names to set the preferred team order. Click names to toggle availability.</p>
                    
                    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
                        <Droppable droppableId="player-list">
                            {(droppableProvided: DroppableProvided) => (
                                <div 
                                    {...droppableProvided.droppableProps}
                                    ref={droppableProvided.innerRef}
                                    style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                                >
                                    {players.map((player, index) => (
                                        <Draggable 
                                            key={player.id.toString()} 
                                            draggableId={player.id.toString()} 
                                            index={index}
                                        >
                                            {(draggableProvided: DraggableProvided) => (
                                                // 1. OUTER DIV: Carries ALL DND props. This is the element that moves.
                                                <div
                                                    ref={draggableProvided.innerRef}
                                                    {...draggableProvided.draggableProps} 
                                                    {...draggableProvided.dragHandleProps} 
                                                    style={{
                                                        display: 'inline-block',
                                                        userSelect: 'none',
                                                        cursor: 'grab', // Drag cursor over the entire area
                                                        ...draggableProvided.draggableProps.style,
                                                    }}
                                                >
                                                    {/* 2. INNER DIV (styled as button): Handles click/toggle, not DND. */}
                                                    <div
                                                        role="button" // Accessibility: Treat this div like a button
                                                        tabIndex={0} // Make it keyboard focusable
                                                        onClick={() => onToggle(player.id)}
                                                        onMouseDown={logMartijn} // Log on mousedown for testing
                                                        style={{
                                                            padding: '10px 15px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '5px',
                                                            backgroundColor: player.isPresent ? '#4CAF50' : '#f44336',
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            transition: 'background-color 0.2s',
                                                            // The cursor is handled by the parent div's drag handle prop
                                                        }}
                                                    >
                                                        {player.name}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {droppableProvided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </>
            )}
        </div>
    );
};

export default PlayerList;