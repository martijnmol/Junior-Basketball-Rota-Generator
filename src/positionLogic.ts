import { Player, Rota, PeriodPositions, PositionRota, POSITION_ORDER, Position } from './interfaces';

export const getPositionScore = (player: Player, position: Position): number =>
    player.positionWeights?.[position] ?? 0;

// Brute-force optimal assignment for one period (5! = 120 permutations).
// Ties broken by first permutation found (natural POSITION_ORDER order).
export const buildOptimalPeriodPositions = (periodPlayers: Player[]): PeriodPositions => {
    let bestScore = -1;
    let bestAssignment = {} as PeriodPositions;

    const recurse = (remaining: Position[], current: Array<[Position, Player]>): void => {
        if (current.length === periodPlayers.length) {
            const score = current.reduce((s, [pos, pl]) => s + getPositionScore(pl, pos), 0);
            if (score > bestScore) {
                bestScore = score;
                bestAssignment = {} as PeriodPositions;
                for (const [pos, pl] of current) bestAssignment[pos] = pl.id;
            }
            return;
        }
        const depth = current.length;
        for (let i = 0; i < remaining.length; i++) {
            const pos = remaining[i];
            remaining.splice(i, 1);
            current.push([pos, periodPlayers[depth]]);
            recurse(remaining, current);
            current.pop();
            remaining.splice(i, 0, pos);
        }
    };

    recurse([...POSITION_ORDER], []);
    return bestAssignment;
};

export const buildOptimalPositions = (rota: Rota): PositionRota =>
    rota.map(periodPlayers => buildOptimalPeriodPositions(periodPlayers));

// Kept for backward compatibility (same algorithm).
export const buildDefaultPositions = buildOptimalPositions;

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
