# Court Position Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each player's basketball court position per period — mini court icons in the rota table and a full-screen draggable court view per period.

**Architecture:** New `Position` union type and `PeriodPositions` map live in `interfaces.ts`; `positionLogic.ts` auto-assigns default positions from the rota and exposes a swap helper; `CourtSvg.tsx` is a pure SVG half-court diagram; `CourtModal.tsx` wraps it with @dnd-kit drag-and-drop; `RotaTable.tsx` shows mini court icons (one orange dot per playing cell) and a 🏟️ button per period that opens the modal; `App.tsx` holds `positionRota` state and resets it whenever the rota regenerates.

**Tech Stack:** React 19, TypeScript, inline SVG (viewBox 200×160), `@dnd-kit/core` + `@dnd-kit/utilities` (already installed), Jest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/interfaces.ts` | Add `Position`, `POSITION_LABELS`, `POSITION_COORDS`, `POSITION_ORDER`, `PeriodPositions`, `PositionRota` |
| Create | `src/positionLogic.ts` | `buildDefaultPositions`, `swapPositions`, `getPlayerPosition` |
| Create | `src/positionLogic.test.ts` | Unit tests for position logic |
| Create | `src/components/CourtSvg.tsx` | Static SVG half-court diagram with optional position dots |
| Create | `src/components/CourtModal.tsx` | Full-screen modal with DnD position swapping |
| Modify | `src/components/RotaTable.tsx` | Mini court icons in playing cells + 🏟️ button per period header |
| Modify | `src/App.tsx` | `positionRota` state, auto-init from rota, `handlePositionsChange` handler |

---

### Task 1: Add Position types to interfaces.ts

**Files:**
- Modify: `src/interfaces.ts`

- [ ] **Step 1: Replace interfaces.ts content**

```typescript
// src/interfaces.ts

export interface Player {
    id: number;
    name: string;
    periodsPlayed: number;
    lastPlayedPeriod: number;
    isPresent: boolean;
}

export type Rota = Player[][];

export type Position = 'PG' | 'LF' | 'RF' | 'LC' | 'RC';

export const POSITION_LABELS: Record<Position, string> = {
    PG: 'Point Guard',
    LF: 'Left Forward',
    RF: 'Right Forward',
    LC: 'Left Center',
    RC: 'Right Center',
};

// Percentages (0–100) of the SVG viewBox (200×160). Basket at top-center.
// Used by CourtSvg (converted to absolute units) and CourtModal (as CSS left/top).
export const POSITION_COORDS: Record<Position, { x: number; y: number }> = {
    PG: { x: 50, y: 82 },
    LF: { x: 15, y: 56 },
    RF: { x: 85, y: 56 },
    LC: { x: 38, y: 28 },
    RC: { x: 62, y: 28 },
};

export const POSITION_ORDER: Position[] = ['PG', 'LF', 'RF', 'LC', 'RC'];

// Maps each court position to the player ID occupying it for one period.
export interface PeriodPositions {
    PG: number;
    LF: number;
    RF: number;
    LC: number;
    RC: number;
}

export type PositionRota = PeriodPositions[];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/interfaces.ts
git commit -m "feat: add Position types, POSITION_COORDS, PeriodPositions to interfaces

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create positionLogic.ts with tests (TDD)

**Files:**
- Create: `src/positionLogic.test.ts`
- Create: `src/positionLogic.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/positionLogic.test.ts`:

```typescript
import { buildDefaultPositions, swapPositions, getPlayerPosition } from './positionLogic';
import { Player, Rota } from './interfaces';

const makePlayer = (id: number): Player => ({
    id, name: `P${id}`, periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true,
});

describe('buildDefaultPositions', () => {
    it('assigns 5 players to PG/LF/RF/LC/RC in order', () => {
        const rota: Rota = [
            [makePlayer(1), makePlayer(2), makePlayer(3), makePlayer(4), makePlayer(5)],
        ];
        const result = buildDefaultPositions(rota);
        expect(result[0]).toEqual({ PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 });
    });

    it('handles multiple periods independently', () => {
        const rota: Rota = [
            [makePlayer(1), makePlayer(2), makePlayer(3), makePlayer(4), makePlayer(5)],
            [makePlayer(6), makePlayer(7), makePlayer(8), makePlayer(9), makePlayer(10)],
        ];
        const result = buildDefaultPositions(rota);
        expect(result).toHaveLength(2);
        expect(result[1]).toEqual({ PG: 6, LF: 7, RF: 8, LC: 9, RC: 10 });
    });

    it('returns empty array for empty rota', () => {
        expect(buildDefaultPositions([])).toEqual([]);
    });
});

describe('swapPositions', () => {
    it('swaps two positions', () => {
        const positions = { PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 };
        expect(swapPositions(positions, 'PG', 'LF')).toEqual({ PG: 2, LF: 1, RF: 3, LC: 4, RC: 5 });
    });

    it('does not mutate the original', () => {
        const positions = { PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 };
        swapPositions(positions, 'PG', 'RF');
        expect(positions.PG).toBe(1);
        expect(positions.RF).toBe(3);
    });

    it('is a no-op when swapping a position with itself', () => {
        const positions = { PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 };
        expect(swapPositions(positions, 'PG', 'PG')).toEqual(positions);
    });
});

describe('getPlayerPosition', () => {
    it('returns the position for a player on court', () => {
        const positions = { PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 };
        expect(getPlayerPosition(positions, 3)).toBe('RF');
    });

    it('returns undefined for a player not on court', () => {
        const positions = { PG: 1, LF: 2, RF: 3, LC: 4, RC: 5 };
        expect(getPlayerPosition(positions, 99)).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx react-scripts test --watchAll=false --testPathPattern="positionLogic"
```
Expected: FAIL — `Cannot find module './positionLogic'`

- [ ] **Step 3: Create positionLogic.ts**

Create `src/positionLogic.ts`:

```typescript
import { Rota, PeriodPositions, PositionRota, POSITION_ORDER, Position } from './interfaces';

export const buildDefaultPositions = (rota: Rota): PositionRota =>
    rota.map(periodPlayers =>
        POSITION_ORDER.reduce((acc, pos, i) => {
            acc[pos] = periodPlayers[i]?.id ?? -1;
            return acc;
        }, {} as PeriodPositions)
    );

export const swapPositions = (
    positions: PeriodPositions,
    pos1: Position,
    pos2: Position,
): PeriodPositions => ({
    ...positions,
    [pos1]: positions[pos2],
    [pos2]: positions[pos1],
});

export const getPlayerPosition = (
    positions: PeriodPositions,
    playerId: number,
): Position | undefined =>
    POSITION_ORDER.find(pos => positions[pos] === playerId);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx react-scripts test --watchAll=false --testPathPattern="positionLogic"
```
Expected: PASS — 7 tests, all green

- [ ] **Step 5: Commit**

```bash
git add src/positionLogic.ts src/positionLogic.test.ts
git commit -m "feat: add position logic with default assignment, swap, and lookup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Create CourtSvg.tsx

**Files:**
- Create: `src/components/CourtSvg.tsx`

This component draws a static basketball half-court SVG (basket at top-center, viewBox 200×160) and renders optional colored dots at position coordinates.

- [ ] **Step 1: Create CourtSvg.tsx**

Create `src/components/CourtSvg.tsx`:

```tsx
import React from 'react';
import { Position, POSITION_COORDS } from '../interfaces';

export interface CourtDot {
    position: Position;
    color?: string;
    label?: string;
}

interface CourtSvgProps {
    width: number;
    dots?: CourtDot[];
}

// viewBox is always 200×160. width controls rendered size; height scales proportionally.
const CourtSvg: React.FC<CourtSvgProps> = ({ width, dots = [] }) => {
    const height = Math.round(width * 0.8); // 160/200 = 0.8

    // Convert POSITION_COORDS percentages to SVG units (viewBox 200×160)
    const toSvg = (pct: { x: number; y: number }) => ({
        cx: (pct.x / 100) * 200,
        cy: (pct.y / 100) * 160,
    });

    const isLarge = width > 100;
    const dotR = isLarge ? 7 : 4;
    const labelFontSize = isLarge ? 9 : 0; // hide labels in mini mode

    return (
        <svg width={width} height={height} viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
            {/* Court surface */}
            <rect x="2" y="2" width="196" height="156" rx="2" fill="#f5d76e" stroke="#8B4513" strokeWidth="2" />

            {/* Paint / Key rectangle */}
            <rect x="76" y="2" width="48" height="56" fill="#e8c86a" stroke="#8B4513" strokeWidth="1.5" />

            {/* Backboard */}
            <line x1="88" y1="7" x2="112" y2="7" stroke="#333" strokeWidth="3" />

            {/* Basket (hoop) */}
            <circle cx="100" cy="16" r="5" fill="none" stroke="#e84c00" strokeWidth="2" />

            {/* Free throw line */}
            <line x1="76" y1="58" x2="124" y2="58" stroke="#8B4513" strokeWidth="1.5" />

            {/* Free throw circle (upper half) */}
            <path d="M 76 58 A 24 24 0 0 1 124 58" fill="none" stroke="#8B4513" strokeWidth="1.5" />

            {/* Three-point arc */}
            <path d="M 16 158 A 92 92 0 0 1 184 158" fill="none" stroke="#8B4513" strokeWidth="1.5" />

            {/* Corner three-point lines */}
            <line x1="16" y1="110" x2="16" y2="158" stroke="#8B4513" strokeWidth="1.5" />
            <line x1="184" y1="110" x2="184" y2="158" stroke="#8B4513" strokeWidth="1.5" />

            {/* Position dots */}
            {dots.map(({ position, color = '#e84c00', label }) => {
                const { cx, cy } = toSvg(POSITION_COORDS[position]);
                return (
                    <g key={position}>
                        <circle cx={cx} cy={cy} r={dotR} fill={color} opacity={0.9} />
                        {label && labelFontSize > 0 && (
                            <text
                                x={cx}
                                y={cy + dotR + 8}
                                textAnchor="middle"
                                fontSize={labelFontSize}
                                fill="#333"
                                fontWeight="bold"
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default CourtSvg;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/CourtSvg.tsx
git commit -m "feat: add CourtSvg static half-court SVG with position dots

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Create CourtModal.tsx

**Files:**
- Create: `src/components/CourtModal.tsx`

This is the full-screen modal. Each of the 5 positions is both draggable (the player name chip) and droppable (the zone). Dragging a chip to another position swaps the two player assignments.

- [ ] **Step 1: Create CourtModal.tsx**

Create `src/components/CourtModal.tsx`:

```tsx
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
    POSITION_LABELS,
    POSITION_ORDER,
} from '../interfaces';
import { swapPositions } from '../positionLogic';
import CourtSvg from './CourtSvg';

// --- PositionSlot ---
// Absolutely positioned over the court SVG. Acts as both draggable source
// and droppable target so two slots can be swapped by dragging one onto the other.

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

    // Merge both refs onto the same DOM node
    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            setDropRef(node);
            setDragRef(node);
        },
        [setDropRef, setDragRef],
    );

    const player = players.find(p => p.id === playerId);
    const coords = POSITION_COORDS[position];

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
                    background: isOver ? '#ffa500' : isDragging ? '#ffcc66' : 'white',
                    border: `2px solid ${isOver ? '#e84c00' : '#555'}`,
                    borderRadius: 8,
                    padding: '3px 6px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    opacity: isDragging ? 0.7 : 1,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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

// --- CourtModal ---

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/CourtModal.tsx
git commit -m "feat: add CourtModal with drag-and-drop position swapping

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Update RotaTable.tsx

**Files:**
- Modify: `src/components/RotaTable.tsx`

- [ ] **Step 1: Replace RotaTable.tsx**

Replace `src/components/RotaTable.tsx` entirely:

```tsx
import React, { useState } from 'react';
import { Rota, Player, PeriodPositions, PositionRota } from '../interfaces';
import { getPlayerPosition } from '../positionLogic';
import CourtSvg from './CourtSvg';
import CourtModal from './CourtModal';

interface RotaTableProps {
    rota: Rota;
    allPlayers: Player[];
    positionRota: PositionRota;
    onPositionsChange: (periodIndex: number, positions: PeriodPositions) => void;
}

const RotaTable: React.FC<RotaTableProps> = ({
    rota,
    allPlayers,
    positionRota,
    onPositionsChange,
}) => {
    const [modalPeriod, setModalPeriod] = useState<number | null>(null);

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
            <h2>🗓️ Game Rota (Transposed View)</h2>
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
                                    {positionRota[period - 1] && (
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
                            return (
                                <tr key={player.id}>
                                    <td
                                        style={{
                                            border: '1px solid #ddd',
                                            padding: '8px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {player.name}
                                    </td>
                                    {rota.map((periodPlayers, periodIndex) => {
                                        const isPlaying = periodPlayers.some(p => p.id === player.id);
                                        if (isPlaying) totalPlayed++;

                                        const periodPositions = positionRota[periodIndex];
                                        const position =
                                            isPlaying && periodPositions
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
                                                            dots={[{ position, color: '#e84c00' }]}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: errors only in App.tsx (missing props) — those are fixed in Task 6

- [ ] **Step 3: Commit**

```bash
git add src/components/RotaTable.tsx
git commit -m "feat: update RotaTable with mini court icons and period modal buttons

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Update App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

Replace `src/App.tsx` with:

```tsx
// src/App.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import PlayerList from './components/PlayerList';
import RotaTable from './components/RotaTable';
import PlayerManagement from './components/PlayerManagement';
import Settings from './components/Settings';
import StatsTable from './components/StatsTable';
import { generateRota } from './rotaLogic';
import { Player, PositionRota, PeriodPositions } from './interfaces';
import { getSpreadsheetId, setSpreadsheetId } from './settingsStorage';
import { appendMatch, AppendMatchPayload, savePlayers, loadPlayersFromSheet } from './sheetsApi';
import { buildDefaultPositions } from './positionLogic';

const LOCAL_STORAGE_KEY = 'basketball-rota-players';

const FALLBACK_PLAYER_DATA: Player[] = [
    { id: 1, name: 'Alex', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 2, name: 'Ben', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 3, name: 'Carly', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 4, name: 'David', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 5, name: 'Ella', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 6, name: 'Finn', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 7, name: 'Grace', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 8, name: 'Hugo', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    { id: 9, name: 'Ivy', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
    { id: 10, name: 'Jack', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
];

const NUM_PERIODS = 8;
const NUM_ON_COURT = 5;

const getNextId = (currentPlayers: Player[]) =>
    currentPlayers.reduce((max, p) => Math.max(max, p.id), 0) + 1;

const loadSavedData = (): Player[] => {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (error) {
        console.error('Error loading data from local storage:', error);
    }
    return FALLBACK_PLAYER_DATA;
};

function App() {
    const [players, setPlayers] = useState<Player[]>(loadSavedData);
    const [spreadsheetId, setSpreadsheetIdState] = useState<string | null>(getSpreadsheetId());
    const [statsRefreshKey, setStatsRefreshKey] = useState(0);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const initialLoadDone = useRef(false);
    const spreadsheetIdRef = useRef(spreadsheetId);

    useEffect(() => {
        spreadsheetIdRef.current = spreadsheetId;
    }, [spreadsheetId]);

    useEffect(() => {
        if (!initialLoadDone.current) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(players));
        } catch (error) {
            console.error('Error saving data to local storage:', error);
        }
        if (spreadsheetIdRef.current) {
            savePlayers(spreadsheetIdRef.current, players).catch(err =>
                console.error('Error saving players to sheet:', err)
            );
        }
    }, [players]);

    useEffect(() => {
        initialLoadDone.current = true;
    }, []);

    const rota = useMemo(
        () => generateRota(players, NUM_PERIODS, NUM_ON_COURT),
        [players],
    );

    const [positionRota, setPositionRota] = useState<PositionRota>(() =>
        buildDefaultPositions(generateRota(FALLBACK_PLAYER_DATA, NUM_PERIODS, NUM_ON_COURT))
    );

    // Reset positions when the rota changes (player presence / roster changes).
    useEffect(() => {
        setPositionRota(buildDefaultPositions(rota));
    }, [rota]);

    const handlePositionsChange = (periodIndex: number, newPositions: PeriodPositions) => {
        setPositionRota(prev => {
            const next = [...prev];
            next[periodIndex] = newPositions;
            return next;
        });
    };

    const handleReorderPlayers = (startIndex: number, endIndex: number) => {
        const result = Array.from(players);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setPlayers(result);
    };

    const handleAddPlayer = (name: string) => {
        const newPlayer: Player = {
            id: getNextId(players),
            name: name || `Player ${getNextId(players)}`,
            periodsPlayed: 0,
            lastPlayedPeriod: -1,
            isPresent: true,
        };
        setPlayers(prev => [...prev, newPlayer]);
    };

    const handleRemovePlayer = (id: number) => {
        setPlayers(prev => prev.filter(p => p.id !== id));
    };

    const handleEditPlayerName = (id: number, newName: string) => {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, name: newName } : p)));
    };

    const togglePresence = (id: number) => {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, isPresent: !p.isPresent } : p)));
    };

    const handleSaveMatch = async () => {
        if (rota.length === 0 || !spreadsheetId) return;
        const presentPlayers = players.filter(p => p.isPresent);
        if (presentPlayers.length === 0) return;

        const maxPeriods = Math.max(
            ...presentPlayers.map(p =>
                rota.reduce((count, period) => count + (period.some(pp => pp.id === p.id) ? 1 : 0), 0)
            )
        );
        const date = new Date().toISOString().split('T')[0];
        const payload: AppendMatchPayload = {
            date,
            shortfallRows: presentPlayers.map(p => {
                const periodsPlayed = rota.reduce(
                    (count, period) => count + (period.some(pp => pp.id === p.id) ? 1 : 0),
                    0,
                );
                return { playerName: p.name, periodsPlayed, shortfall: maxPeriods - periodsPlayed };
            }),
            historyRows: presentPlayers.map(p => {
                const periods = rota.map(period => period.some(pp => pp.id === p.id));
                return { playerName: p.name, periods, total: periods.filter(Boolean).length };
            }),
        };

        setSaveStatus('saving');
        setSaveError(null);
        try {
            await appendMatch(spreadsheetId, payload);
            setSaveStatus('success');
            setStatsRefreshKey(k => k + 1);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            setSaveStatus('error');
            setSaveError(e instanceof Error ? e.message : 'An unknown error occurred');
        }
    };

    const handleIdChange = (id: string) => {
        setSpreadsheetId(id);
        setSpreadsheetIdState(id || null);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🏀 Junior Basketball Rota Generator</h1>

            <Settings
                onIdChange={handleIdChange}
                onConnect={() => {
                    setStatsRefreshKey(k => k + 1);
                    if (spreadsheetId) {
                        loadPlayersFromSheet(spreadsheetId)
                            .then(sheetPlayers => {
                                if (sheetPlayers !== null) setPlayers(sheetPlayers);
                            })
                            .catch(err => console.error('Error loading players on connect:', err));
                    }
                }}
            />

            <hr style={{ margin: '20px 0' }} />

            <PlayerManagement
                players={players}
                onAdd={handleAddPlayer}
                onRemove={handleRemovePlayer}
                onEditName={handleEditPlayerName}
            />

            <hr style={{ margin: '20px 0' }} />

            <PlayerList
                players={players}
                onToggle={togglePresence}
                onReorder={handleReorderPlayers}
            />

            <hr style={{ margin: '20px 0' }} />

            <RotaTable
                rota={rota}
                allPlayers={players}
                positionRota={positionRota}
                onPositionsChange={handlePositionsChange}
            />

            <div style={{ margin: '20px 0' }}>
                <button
                    onClick={handleSaveMatch}
                    disabled={rota.length === 0 || !spreadsheetId || saveStatus === 'saving'}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: rota.length === 0 || !spreadsheetId ? '#aaa' : '#3f51b5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: rota.length === 0 || !spreadsheetId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '15px',
                    }}
                >
                    {saveStatus === 'saving' ? 'Saving...' : '💾 Save Match'}
                </button>
                {saveStatus === 'success' && (
                    <span style={{ marginLeft: '12px', color: 'green', fontWeight: 'bold' }}>✓ Match saved!</span>
                )}
                {saveStatus === 'error' && (
                    <span style={{ marginLeft: '12px', color: 'red' }}>⚠️ {saveError}</span>
                )}
                {!spreadsheetId && (
                    <span style={{ marginLeft: '12px', color: '#888', fontSize: '13px' }}>
                        Configure Spreadsheet ID in Settings above to enable saving.
                    </span>
                )}
            </div>

            <hr style={{ margin: '20px 0' }} />

            <StatsTable spreadsheetId={spreadsheetId} refreshKey={statsRefreshKey} />
        </div>
    );
}

export default App;
```

- [ ] **Step 2: Run all tests**

```bash
npx react-scripts test --watchAll=false
```
Expected: all tests pass (no regressions)

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Start the dev server and verify visually**

```bash
npm start
```

Check the following golden path:
1. The rota table loads — playing cells show a small half-court SVG with an orange dot instead of 🏀
2. Hovering a mini court icon shows a tooltip with the position name (PG, LF, etc.)
3. Each period column header has a 🏟️ button
4. Clicking a 🏟️ button opens a modal with a full 400×320 court diagram and 5 player name chips at their positions
5. Dragging a player chip to another position swaps their labels — confirm by closing and reopening the modal
6. Mini court icons in the table reflect the swapped positions after closing the modal
7. Clicking outside the modal (on the dark overlay) closes it
8. Toggling a player's presence resets all position assignments to default

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire positionRota state and handlers into App

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ 5 positions: PG, LF, RF, LC, RC — `POSITION_ORDER`, `POSITION_LABELS` in `interfaces.ts`
- ✅ Visually see player positions each quarter — mini `CourtSvg` in every playing cell
- ✅ Icon of basketball bucket area with clear dot — `CourtSvg` half-court + orange dot
- ✅ Click button per quarter for full-frame court view — 🏟️ button in period header, `CourtModal`
- ✅ Player names at correct spots — `PositionSlot` name chips in `CourtModal`
- ✅ Drag and drop to change positions — `@dnd-kit` DnD in `CourtModal`

**Placeholder check:** No placeholders, TODOs, or "similar to" references found.

**Type consistency:**
- `PeriodPositions` defined once in `interfaces.ts`, used by `positionLogic.ts`, `CourtModal.tsx`, `RotaTable.tsx`, `App.tsx` ✅
- `POSITION_COORDS` used by `CourtSvg.tsx` (via `toSvg` helper converting % to SVG units) and `CourtModal.tsx` (as `left`/`top` CSS percentages) — same source of truth ✅
- `swapPositions` imported in `CourtModal.tsx`, tested in `positionLogic.test.ts` ✅
- `getPlayerPosition` imported in `RotaTable.tsx`, tested in `positionLogic.test.ts` ✅
- `buildDefaultPositions` imported in `App.tsx`, tested in `positionLogic.test.ts` ✅
