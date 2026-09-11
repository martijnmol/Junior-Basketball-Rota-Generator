import { Rota, PeriodPositions, PositionRota, POSITION_ORDER, Position } from './interfaces';

export const buildDefaultPositions = (rota: Rota): PositionRota =>
    rota.map(periodPlayers => {
        const available = [...POSITION_ORDER];
        const result = {} as PeriodPositions;
        const unassigned: typeof periodPlayers = [];

        // First pass: honour preferred positions (first-come, first-served)
        for (const player of periodPlayers) {
            const pref = player.preferredPosition;
            const idx = pref ? available.indexOf(pref) : -1;
            if (idx !== -1) {
                result[pref!] = player.id;
                available.splice(idx, 1);
            } else {
                unassigned.push(player);
            }
        }

        // Second pass: fill remaining slots in POSITION_ORDER order
        for (const player of unassigned) {
            result[available.shift()!] = player.id;
        }

        return result;
    });

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
