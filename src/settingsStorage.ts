// src/settingsStorage.ts

const SPREADSHEET_ID_KEY = 'basketball-rota-spreadsheet-id';

export const getSpreadsheetId = (): string | null => {
    return localStorage.getItem(SPREADSHEET_ID_KEY);
};

export const setSpreadsheetId = (id: string): void => {
    localStorage.setItem(SPREADSHEET_ID_KEY, id);
};
