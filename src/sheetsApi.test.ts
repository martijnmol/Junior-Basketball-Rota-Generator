// src/sheetsApi.test.ts
import { Player } from './interfaces';

// We re-require sheetsApi in each test to reset the module-level accessToken
let savePlayers: (spreadsheetId: string, players: Player[]) => Promise<void>;
let loadPlayersFromSheet: (spreadsheetId: string) => Promise<Player[] | null>;

beforeEach(async () => {
  jest.resetModules();
  const mod = await import('./sheetsApi');
  savePlayers = mod.savePlayers;
  loadPlayersFromSheet = mod.loadPlayersFromSheet;

  (window as any).google = {
    accounts: {
      oauth2: {
        initTokenClient: (_opts: any) => ({
          requestAccessToken: () => {
            _opts.callback({ access_token: 'fake-token', expires_in: 3600 });
          },
        }),
      },
    },
  };
});

afterEach(() => {
  jest.resetAllMocks();
});

const PLAYERS: Player[] = [
  { id: 1, name: 'Alex', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
  { id: 2, name: 'Ben', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
];

describe('savePlayers', () => {
  it('creates the Players tab if missing and writes rows to A1', async () => {
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Shortfall' } }] }),
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as any;

    await savePlayers('sheet-id-123', PLAYERS);

    const putCall = fetchMock.mock.calls[2];
    expect(putCall[0]).toContain('Players!A1');
    expect(putCall[1].method).toBe('PUT');
    const body = JSON.parse(putCall[1].body);
    // First row is headers
    expect(body.values[0]).toEqual(['id', 'name', 'periodsPlayed', 'lastPlayedPeriod', 'isPresent']);
    // Subsequent rows are player data
    expect(body.values[1]).toEqual([1, 'Alex', 0, -1, true]);
    expect(body.values[2]).toEqual([2, 'Ben', 0, -1, false]);
  });

  it('skips tab creation if Players tab already exists', async () => {
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Players' } }] }),
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as any;

    await savePlayers('sheet-id-123', PLAYERS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when the PUT fails', async () => {
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: 'Players' } }] }),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    global.fetch = fetchMock as any;

    await expect(savePlayers('sheet-id-123', PLAYERS)).rejects.toThrow('Failed to save players: 403');
  });
});

const PLAYERS_FOR_LOAD: Player[] = [
  { id: 1, name: 'Alex', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
  { id: 2, name: 'Ben', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: false },
];

describe('loadPlayersFromSheet', () => {
  it('returns parsed players from row data', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        values: [
          ['id', 'name', 'periodsPlayed', 'lastPlayedPeriod', 'isPresent'],
          ['1', 'Alex', '0', '-1', 'true'],
          ['2', 'Ben', '0', '-1', 'false'],
        ],
      }),
    });
    global.fetch = fetchMock as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toEqual(PLAYERS_FOR_LOAD);
    expect(fetchMock.mock.calls[0][0]).toContain('Players!A:E');
  });

  it('returns null when the Players tab is empty (no values key)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('returns null when only a header row exists (no player data)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [['id', 'name', 'periodsPlayed', 'lastPlayedPeriod', 'isPresent']] }),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('returns null when the fetch fails (sheet does not exist yet)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result).toBeNull();
  });

  it('parses isPresent correctly for TRUE/true/false values', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        values: [
          ['id', 'name', 'periodsPlayed', 'lastPlayedPeriod', 'isPresent'],
          ['1', 'Alex', '0', '-1', 'TRUE'],
          ['2', 'Ben', '0', '-1', 'FALSE'],
        ],
      }),
    }) as any;

    const result = await loadPlayersFromSheet('sheet-id-123');
    expect(result![0].isPresent).toBe(true);
    expect(result![1].isPresent).toBe(false);
  });
});
