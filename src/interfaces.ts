// src/interfaces.ts

export interface Player {
    id: number;
    name: string;
    periodsPlayed: number;
    lastPlayedPeriod: number; // The period number (1-8) they last played in. -1 initially.
    isPresent: boolean;
  }
  
  // A Rota is an array of 8 periods. Each period is an array of 5 playing players.
  export type Rota = Player[][];