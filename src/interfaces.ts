// src/interfaces.ts

export interface Player {
    id: number;
    name: string;
    periodsPlayed: number;
    lastPlayedPeriod: number;
    isPresent: boolean;
    preferredPosition?: Position;
    jerseyNumber?: number;
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
    PG: { x: 50, y: 72 },
    LF: { x: 15, y: 46 },
    RF: { x: 85, y: 46 },
    LC: { x: 38, y: 18 },
    RC: { x: 62, y: 18 },
};

export const POSITION_ORDER: Position[] = ['PG', 'LF', 'RF', 'LC', 'RC'];

export const POSITION_COLORS: Record<Position, string> = {
    PG: '#1976D2', // blue
    LF: '#388E3C', // green
    RF: '#388E3C', // green
    LC: '#D32F2F', // red
    RC: '#D32F2F', // red
};

// Maps each court position to the player ID occupying it for one period.
export interface PeriodPositions {
    PG: number;
    LF: number;
    RF: number;
    LC: number;
    RC: number;
}

export type PositionRota = PeriodPositions[];
