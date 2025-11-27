// src/rotaLogic.ts
import { Player, Rota } from './interfaces';

/**
 * Generates the full 8-period rota based on availability and fairness metrics.
 * Prioritizes players who have played the fewest periods overall and those who
 * have rested for the longest duration (lowest lastPlayedPeriod value).
 */
export const generateRota = (initialPlayers: Player[], numPeriods = 8, numOnCourt = 5): Rota => {
  // Start with only available players, maintaining a copy for mutation
  let players: Player[] = initialPlayers
    .filter(p => p.isPresent)
    .map(p => ({ ...p, periodsPlayed: 0, lastPlayedPeriod: -1 })); // Reset stats for fresh calculation
    
  const rota: Rota = [];

  // If less than 5 players are available, we cannot generate a full rota.
  if (players.length < numOnCourt) {
    console.error("Not enough players to field a team!");
    return [];
  }

  for (let period = 1; period <= numPeriods; period++) {
    // 1. Sort players to prioritize selection
    players.sort((a, b) => {
      // Primary sort: Least periods played overall comes first
      if (a.periodsPlayed !== b.periodsPlayed) {
        return a.periodsPlayed - b.periodsPlayed;
      }
      // Secondary sort: Longest rest comes first (smaller lastPlayedPeriod means older play time)
      return a.lastPlayedPeriod - b.lastPlayedPeriod;
    });

    // 2. Select the top N players for the court
    const currentPeriodPlayers = players.slice(0, numOnCourt);
    
    // 3. Update player stats for the *next* period's calculation
    players = players.map(p => {
      const isOnCourt = currentPeriodPlayers.some(onCourtP => onCourtP.id === p.id);
      
      if (isOnCourt) {
        return {
          ...p,
          periodsPlayed: p.periodsPlayed + 1,
          lastPlayedPeriod: period, // Update last played period to the current period
        };
      }
      return p;
    });

    // Push only the playing players' data (or a simple representation) to the rota
    rota.push(currentPeriodPlayers);
  }

  return rota;
};