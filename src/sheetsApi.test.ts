// src/sheetsApi.test.ts
import { Player } from './interfaces';

// We re-require sheetsApi in each test to reset the module-level accessToken
let savePlayers: (spreadsheetId: string, players: Player[]) => Promise<void>;

beforeEach(async () => {
  jest.resetModules();
  savePlayers = (await import('./sheetsApi')).savePlayers;

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
  it('creates the Players tab if missing and writes JSON to A1', async () => {
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
    expect(body.values[0][0]).toBe(JSON.stringify(PLAYERS));
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
