// src/rotaLogic.ts
import { Player, Rota } from './interfaces';

/**
 * Generates the full 8-period rota.
 * - For 10 players/5 on court: Uses a fixed, alternating, sliding rotation.
 * - For all other counts: Uses fairness metrics (least played, longest rest).
 */
export const generateRota = (initialPlayers: Player[], numPeriods = 8, numOnCourt = 5): Rota => {
    // Start with only available players, maintaining a copy for mutation
    let players: Player[] = initialPlayers
        .filter(p => p.isPresent)
        .map(p => ({ ...p, periodsPlayed: 0, lastPlayedPeriod: -1 })); // Reset stats

    const rota: Rota = [];

    if (players.length < numOnCourt) {
        console.error("Not enough players to field a team!");
        return [];
    }
    
    // --- Setup for Alternating Shift Rotation ---
    const isAlternatingShiftActive = players.length === 10 && numOnCourt === 5;
    // We rely on the initial order for the fixed shift.
    let originalOrderPlayers = [...players]; 

    for (let period = 1; period <= numPeriods; period++) {
        
        let currentPeriodPlayers: Player[];

        if (isAlternatingShiftActive) {
            // --- Fixed Alternating Shift Logic (10 players, 5 on court) ---

            const playingGroupSize = 5;
            
            // The starting player index (offset) shifts every 2 periods.
            // P1/P2: block 0, P3/P4: block 1, P5/P6: block 2, etc.
            const rotationBlock = Math.floor((period - 1) / 2); 
            
            // The base starting offset is the rotation block number (0, 1, 2, 3...)
            const baseOffset = rotationBlock % 5; // Cycles 0, 1, 2, 3, 4, then repeats

            let startOffset: number;

            // If the period number is ODD (P1, P3, P5, P7...): This is the sliding group (P1-P5, P2-P6, etc.)
            if (period % 2 !== 0) {
                startOffset = baseOffset;
            } else {
                // If the period number is EVEN (P2, P4, P6, P8...): This is the complementary group
                // which starts 5 players after the odd group.
                startOffset = (baseOffset + playingGroupSize) % 10;
            }

            const selectedPlayers: Player[] = [];

            for (let i = 0; i < playingGroupSize; i++) {
                // Use modulo 10 to wrap around the full list.
                const playerIndex = (startOffset + i) % originalOrderPlayers.length;
                selectedPlayers.push(originalOrderPlayers[playerIndex]);
            }
            
            currentPeriodPlayers = selectedPlayers;
            
            // SKIP THE SORTING for the fixed rotation case
            
        } else {
            // --- Standard Fairness-Based Rotation (All Other Cases) ---

            // 1. Sort players to prioritize selection
            originalOrderPlayers.sort((a, b) => { 
                // Primary sort: Least periods played overall comes first
                if (a.periodsPlayed !== b.periodsPlayed) {
                    return a.periodsPlayed - b.periodsPlayed;
                }
                // Secondary sort: Longest rest comes first (smaller lastPlayedPeriod means older play time)
                return a.lastPlayedPeriod - b.lastPlayedPeriod;
            });

            // 2. Select the top N players for the court
            currentPeriodPlayers = originalOrderPlayers.slice(0, numOnCourt);
        }

        // 3. Update player stats for the *next* period's calculation
        let playersToUpdate = originalOrderPlayers.map(p => {
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
        
        // Update the working array for the next loop iteration.
        originalOrderPlayers = playersToUpdate;

        // Push only the playing players' data (or a simple representation) to the rota
        rota.push(currentPeriodPlayers);
    }

    return rota;
};