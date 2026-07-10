// src/App.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import * as sheetsApi from './sheetsApi';
import * as settingsStorage from './settingsStorage';

jest.mock('./components/StatsTable', () => () => <div data-testid="stats-table" />);
jest.mock('./components/PlayerManagement', () => ({ players, onAdd, onRemove, onEditName }: any) => (
  <ul data-testid="player-management">
    {players.map((p: any) => <li key={p.id}>{p.name}</li>)}
  </ul>
));
jest.mock('./components/PlayerList', () => ({ players }: any) => (
  <div data-testid="player-list" data-count={players.length} />
));
jest.mock('./sheetsApi', () => ({
  appendMatch: jest.fn(),
  ensureSheetSetup: jest.fn(),
  savePlayers: jest.fn().mockResolvedValue(undefined),
  loadPlayersFromSheet: jest.fn().mockResolvedValue(null),
}));

beforeAll(() => {
  (window as any).google = {
    accounts: { oauth2: { initTokenClient: jest.fn() } },
  };
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  (sheetsApi.savePlayers as jest.Mock).mockResolvedValue(undefined);
  (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);
});

describe('App — player persistence', () => {
  it('loads from localStorage when no spreadsheetId is set', () => {
    localStorage.setItem('basketball-rota-players', JSON.stringify([
      { id: 99, name: 'TestPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ]));
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue(null);

    render(<App />);

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(sheetsApi.loadPlayersFromSheet).not.toHaveBeenCalled();
  });

  it('calls loadPlayersFromSheet on mount when spreadsheetId is set', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.loadPlayersFromSheet).toHaveBeenCalledWith('my-sheet-id');
    });
  });

  it('replaces players with sheet data when loadPlayersFromSheet returns a non-null array', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    const sheetPlayers = [
      { id: 7, name: 'SheetPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ];
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(sheetPlayers);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SheetPlayer')).toBeInTheDocument();
    });
  });

  it('keeps localStorage players when loadPlayersFromSheet returns null', async () => {
    localStorage.setItem('basketball-rota-players', JSON.stringify([
      { id: 3, name: 'LocalPlayer', periodsPlayed: 0, lastPlayedPeriod: -1, isPresent: true },
    ]));
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.loadPlayersFromSheet).toHaveBeenCalled();
    });
    expect(screen.getByText('LocalPlayer')).toBeInTheDocument();
  });

  it('calls savePlayers when spreadsheetId is set and players change', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue('my-sheet-id');
    (sheetsApi.loadPlayersFromSheet as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(sheetsApi.savePlayers).toHaveBeenCalledWith('my-sheet-id', expect.any(Array));
    });
  });

  it('does NOT call savePlayers when no spreadsheetId is set', async () => {
    jest.spyOn(settingsStorage, 'getSpreadsheetId').mockReturnValue(null);

    render(<App />);

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    expect(sheetsApi.savePlayers).not.toHaveBeenCalled();
  });
});
