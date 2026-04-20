// src/settingsStorage.ts

const SCRIPT_URL_KEY = 'basketball-rota-script-url';

export const getScriptUrl = (): string | null => {
    return localStorage.getItem(SCRIPT_URL_KEY);
};

export const setScriptUrl = (url: string): void => {
    localStorage.setItem(SCRIPT_URL_KEY, url);
};
