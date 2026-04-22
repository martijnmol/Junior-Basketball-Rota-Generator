// src/components/Settings.tsx

import React, { useState } from 'react';
import { getSpreadsheetId, setSpreadsheetId } from '../settingsStorage';
import { ensureSheetSetup } from '../sheetsApi';

interface SettingsProps {
    onIdChange: (id: string) => void;
    onConnect?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onIdChange, onConnect }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [spreadsheetId, setSpreadsheetIdLocal] = useState(getSpreadsheetId() ?? '');
    const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');
    const [setupError, setSetupError] = useState<string | null>(null);

    const handleSave = () => {
        const trimmed = spreadsheetId.trim();
        setSpreadsheetId(trimmed);
        onIdChange(trimmed);
    };

    const handleConnect = async () => {
        const trimmed = spreadsheetId.trim();
        if (!trimmed) {
            alert('Enter a Spreadsheet ID first.');
            return;
        }
        setSetupStatus('running');
        setSetupError(null);
        try {
            await ensureSheetSetup(trimmed);
            setSetupStatus('ok');
            onConnect?.();
        } catch (e) {
            setSetupStatus('error');
            setSetupError(e instanceof Error ? e.message : 'Unknown error');
        }
    };

    return (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
            <h2
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ margin: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>⚙️ Stats Settings</span>
                <span>{isCollapsed ? '🔽 Show' : '🔼 Hide'}</span>
            </h2>

            {!isCollapsed && (
                <>
                    <hr style={{ margin: '10px 0' }} />

                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="spreadsheet-id-input" style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                            Google Spreadsheet ID
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                id="spreadsheet-id-input"
                                type="text"
                                value={spreadsheetId}
                                onChange={e => setSpreadsheetIdLocal(e.target.value)}
                                onBlur={handleSave}
                                placeholder="1fhf_r_ciuaeGqpHo9Zk-LwT7Y58lB-ePVZliCIM30LY"
                                style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <button
                                onClick={handleSave}
                                style={{ padding: '8px 15px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Save
                            </button>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#666' }}>
                            Copy from your sheet URL: docs.google.com/spreadsheets/d/<strong>THIS-PART</strong>/edit
                        </p>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={handleConnect}
                            disabled={setupStatus === 'running'}
                            style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: setupStatus === 'running' ? 'not-allowed' : 'pointer' }}
                        >
                            {setupStatus === 'running' ? 'Setting up...' : '🔗 Connect & set up sheet'}
                        </button>
                        {setupStatus === 'ok' && (
                            <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold' }}>✓ Sheet is ready</span>
                        )}
                        {setupStatus === 'error' && (
                            <span style={{ marginLeft: '10px', color: 'red' }}>⚠️ {setupError}</span>
                        )}
                        {setupStatus === 'idle' && (
                            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                                Creates missing tabs and headers automatically.
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Settings;
