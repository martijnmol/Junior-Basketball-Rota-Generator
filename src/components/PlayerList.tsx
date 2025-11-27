// src/components/PlayerList.tsx (Updated Imports)
import React, { useState } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult, 
  DroppableProvided,       
  DraggableProvided       
} from '@hello-pangea/dnd'; // <-- CHANGE IS HERE!
import { Player } from '../interfaces'; 

// ... (rest of the code remains exactly the same) ...

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

  // Handler required by DragDropContext
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    onReorder(
      result.source.index,
      result.destination.index
    );
  };

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
          
          {/* --- Drag and Drop Implementation --- */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="player-list">
              {/* Added explicit type to fix TS7006 */}
              {(droppableProvided: DroppableProvided) => (
                <div 
                  {...droppableProvided.droppableProps}
                  ref={droppableProvided.innerRef}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                >
                  {players.map((player, index) => (
                    <Draggable key={player.id} draggableId={player.id.toString()} index={index}>
                      {/* Added explicit type to fix TS7006 */}
                      {(draggableProvided: DraggableProvided) => (
                        <button
                          key={player.id}
                          onClick={() => onToggle(player.id)}
                          // Dragging props
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          style={{
                            ...draggableProvided.draggableProps.style,
                            padding: '10px 15px',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            cursor: 'grab', 
                            backgroundColor: player.isPresent ? '#4CAF50' : '#f44336',
                            color: 'white',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s',
                            userSelect: 'none', 
                          }}
                        >
                          {player.name}
                        </button>
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