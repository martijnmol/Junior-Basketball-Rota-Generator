// src/components/Settings.tsx

import React, { useState } from 'react';
import { getScriptUrl, setScriptUrl } from '../settingsStorage';

const Settings: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [url, setUrl] = useState(getScriptUrl() ?? '');

    const handleSave = () => {
        setScriptUrl(url.trim());
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
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                            Apps Script URL
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onBlur={handleSave}
                                placeholder="https://script.google.com/macros/s/..."
                                style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <button
                                onClick={handleSave}
                                style={{ padding: '8px 15px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                            How to set up your Google Sheet
                        </summary>
                        <ol style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                            <li>Create a new Google Sheet at <a href="https://sheets.google.com" target="_blank" rel="noreferrer">sheets.google.com</a></li>
                            <li>Open <strong>Extensions → Apps Script</strong></li>
                            <li>Delete any existing code and paste in the contents of <code>docs/apps-script.gs</code> from this project</li>
                            <li>Click <strong>Deploy → New deployment</strong>, choose <em>Web app</em>, set <em>Execute as: Me</em> and <em>Who has access: Anyone</em></li>
                            <li>Copy the web app URL and paste it into the field above</li>
                        </ol>
                    </details>
                </>
            )}
        </div>
    );
};

export default Settings;
