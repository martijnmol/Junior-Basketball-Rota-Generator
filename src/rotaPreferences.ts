import { useState } from 'react';

export interface RotaPreferences {
    showJerseys: boolean;
    showPositions: boolean;
    // Add future toggles here — supply a default in DEFAULTS below.
}

const DEFAULTS: RotaPreferences = {
    showJerseys: false,
    showPositions: true,
};

const STORAGE_KEY = 'basketball-rota-display-prefs';

const load = (): RotaPreferences => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...DEFAULTS };
};

const save = (prefs: RotaPreferences): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
};

export const useRotaPreferences = () => {
    const [prefs, setPrefs] = useState<RotaPreferences>(load);

    const updatePref = <K extends keyof RotaPreferences>(key: K, value: RotaPreferences[K]) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            save(next);
            return next;
        });
    };

    return { prefs, updatePref };
};
