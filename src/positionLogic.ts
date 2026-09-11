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
