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

    it('honours a single player preferred position', () => {
        const rota: Rota = [
            [
                { ...makePlayer(1), preferredPosition: 'RC' },
                makePlayer(2), makePlayer(3), makePlayer(4), makePlayer(5),
            ],
        ];
        const result = buildDefaultPositions(rota);
        expect(result[0].RC).toBe(1);
    });

    it('all players get their preferred positions when no conflicts', () => {
        const rota: Rota = [
            [
                { ...makePlayer(1), preferredPosition: 'RC' },
                { ...makePlayer(2), preferredPosition: 'PG' },
                { ...makePlayer(3), preferredPosition: 'LF' },
                { ...makePlayer(4), preferredPosition: 'RF' },
                { ...makePlayer(5), preferredPosition: 'LC' },
            ],
        ];
        const result = buildDefaultPositions(rota);
        expect(result[0]).toEqual({ PG: 2, LF: 3, RF: 4, LC: 5, RC: 1 });
    });

    it('falls back gracefully when two players prefer the same position', () => {
        const rota: Rota = [
            [
                { ...makePlayer(1), preferredPosition: 'PG' },
                { ...makePlayer(2), preferredPosition: 'PG' },
                makePlayer(3), makePlayer(4), makePlayer(5),
            ],
        ];
        const result = buildDefaultPositions(rota);
        // First player wins the preferred slot; all 5 positions filled exactly once
        expect(result[0].PG).toBe(1);
        const assigned = Object.values(result[0]);
        expect(assigned.sort()).toEqual([1, 2, 3, 4, 5].sort());
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
