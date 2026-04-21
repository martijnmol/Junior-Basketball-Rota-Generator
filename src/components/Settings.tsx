// src/components/Settings.tsx

import React, { useState } from 'react';
import { getSpreadsheetId, setSpreadsheetId } from '../settingsStorage';

interface SettingsProps {
    onIdChange: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onIdChange }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [spreadsheetId, setSpreadsheetIdLocal] = useState(getSpreadsheetId() ?? '');

    const handleSave = () => {
        const trimmed = spreadsheetId.trim();
        setSpreadsheetId(trimmed);
        onIdChange(trimmed);
    };

    const handleConnect = () => {
        // Trigger OAuth proactively (GIS will open a popup)
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
            alert('Google Identity Services not loaded yet. Please wait a moment.');
            return;
        }
        const client = google.accounts.oauth2.initTokenClient({
            client_id: '942845479443-lvci36nuggtd2scc7r231fakf4vb3tr7.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response: any) => {
                if (!response.error) {
                    alert('Connected to Google! You can now save matches.');
                }
            },
        });
        client.requestAccessToken();
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
                            style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            🔗 Connect Google
                        </button>
                        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                            Optional — auth also triggers automatically when you save a match.
                        </span>
                    </div>

                    <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                            How to set up your Google Sheet
                        </summary>
                        <ol style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                            <li>Open your Google Sheet at <a href="https://sheets.google.com" target="_blank" rel="noreferrer">sheets.google.com</a></li>
                            <li>Create a tab named exactly <code>Shortfall</code> with headers in row 1: <code>Date</code>, <code>PlayerName</code>, <code>PeriodsPlayed</code>, <code>Shortfall</code></li>
                            <li>Create a tab named exactly <code>Match History</code> with headers in row 1: <code>Date</code>, <code>Player</code>, <code>P1</code>, <code>P2</code>, <code>P3</code>, <code>P4</code>, <code>P5</code>, <code>P6</code>, <code>P7</code>, <code>P8</code>, <code>Total</code></li>
                            <li>Copy the Spreadsheet ID from the URL and paste it into the field above</li>
                        </ol>
                    </details>
                </>
            )}
        </div>
    );
};

export default Settings;
