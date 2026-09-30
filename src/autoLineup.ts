import { Player, POSITION_ORDER, PeriodPositions } from './interfaces';
import { generateRota } from './rotaLogic';
import { buildOptimalPeriodPositions, getPositionScore } from './positionLogic';

const scorePeriod = (periodPlayers: Player[], allPlayers: Player[]): number => {
    const full = periodPlayers.map(p => allPlayers.find(pl => pl.id === p.id) ?? p);
    const assignment: PeriodPositions = buildOptimalPeriodPositions(full);
    let total = 0;
    for (const pos of POSITION_ORDER) {
        const player = full.find(p => p.id === assignment[pos]);
        if (player) total += getPositionScore(player, pos);
    }
    return total;
};

const scoreOrder = (orderedPlayers: Player[], numPeriods: number, numOnCourt: number): number => {
    const rota = generateRota(orderedPlayers, numPeriods, numOnCourt);
    return rota.reduce((sum, periodPlayers) => sum + scorePeriod(periodPlayers, orderedPlayers), 0);
};

/**
 * Returns a reordered copy of `players` (present players first, then absent) that
 * maximises the total position-weight score across all periods.  Uses pairwise
 * hill-climbing on the present-player subset.
 */
export const findOptimalPlayerOrder = (
    players: Player[],
    numPeriods = 8,
    numOnCourt = 5,
): Player[] => {
    const present = players.filter(p => p.isPresent);
    const absent = players.filter(p => !p.isPresent);

    let best = [...present];
    let bestScore = scoreOrder(best, numPeriods, numOnCourt);

    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < best.length - 1; i++) {
            for (let j = i + 1; j < best.length; j++) {
                const candidate = [...best];
                [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
                const score = scoreOrder(candidate, numPeriods, numOnCourt);
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                    improved = true;
                }
            }
        }
    }

    return [...best, ...absent];
};
