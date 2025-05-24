import React, { useState, useEffect } from 'react';

// Use the preload-exposed ipcRenderer for secure IPC
const ipcRenderer = window.electronAPI?.ipcRenderer;

interface Viewer {
  id: string;
  name: string;
  platform: string;
  lastActive: string;
}

interface Setting {
  id: string;
  name: string;
  description: string;
  type: string;
  default_value: string | null;
}

interface ViewerSetting {
  id: string;
  setting_id: string;
  value: string | null;
}

const Viewers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState<Viewer | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [viewerSettings, setViewerSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  // Fetch viewers and settings on mount
  useEffect(() => {
    console.log('[Viewers Debug] ipcRenderer:', ipcRenderer); // Debug log
    if (!ipcRenderer) return;
    const fetchViewersAndSettings = () => {
      ipcRenderer.invoke('fetchViewers').then((data: any[]) => {
        console.log('[Viewers Debug] fetchViewers result:', data); // Debug log
        setViewers(data.map(v => ({
          id: v.id,
          name: v.name, // This is platform_key in the DB, but mapped as name in the backend
          platform: v.platform,
          lastActive: v.lastActive,
        })));
      });
      ipcRenderer.invoke('fetchSettings').then((data: Setting[]) => setSettings(data));
    };
    fetchViewersAndSettings();
  }, []);

  // When opening modal, fetch viewer's settings
  const openEditModal = (viewer: Viewer) => {
    setSelectedViewer(viewer);
    setModalOpen(true);
    setLoading(true);
    if (!ipcRenderer) return;
    ipcRenderer.invoke('fetchViewerSettings', viewer.id).then((data: ViewerSetting[]) => {
      const map: Record<string, string | null> = {};
      data.forEach(vs => { map[vs.setting_id] = vs.value; });
      setViewerSettings(map);
      setLoading(false);
    });
  };

  // Save handler (now wired to backend)
  const handleSave = async () => {
    if (!ipcRenderer || !selectedViewer) return;
    setLoading(true);
    await ipcRenderer.invoke('updateViewerSettings', selectedViewer.id, viewerSettings);
    setLoading(false);
    setModalOpen(false);
    // Optionally, refresh viewers/settings if needed
  };

  // Delete a viewer and their settings
  const handleDelete = async (viewerId: string) => {
    if (!ipcRenderer) return;
    if (!window.confirm('Are you sure you want to delete this viewer and all their settings?')) return;
    setLoading(true);
    await ipcRenderer.invoke('deleteViewer', viewerId);
    setViewers(viewers.filter(v => v.id !== viewerId));
    setLoading(false);
  };

  const filteredViewers = viewers.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.id?.toLowerCase().includes(search.toLowerCase()) ||
    v.platform?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', color: '#fff' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 16 }}>Viewer Management</h2>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Search by name, ID, or platform..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #444', background: '#181c20', color: '#fff' }}
        />
      </div>
      <table style={{ width: '100%', background: '#23272b', borderRadius: 8, borderCollapse: 'collapse' }}>
        <thead style={{ background: '#181c20' }}>
          <tr>
            <th style={{ padding: 8, textAlign: 'left' }}>Name</th>
            <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Platform</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Last Active</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredViewers.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: 16 }}>No viewers found</td></tr>
          ) : (
            filteredViewers.map(viewer => (
              <tr key={viewer.id}>
                <td style={{ padding: 8 }}>{viewer.name}</td>
                <td style={{ padding: 8 }}>{viewer.id}</td>
                <td style={{ padding: 8 }}>{viewer.platform}</td>
                <td style={{ padding: 8 }}>{viewer.lastActive}</td>
                <td style={{ padding: 8 }}>
                  <button
                    style={{ padding: '4px 12px', borderRadius: 4, background: '#3a8dde', color: '#fff', border: 'none', cursor: 'pointer', marginRight: 8 }}
                    onClick={() => openEditModal(viewer)}
                  >
                    Edit Settings
                  </button>
                  <button
                    style={{ padding: '4px 12px', borderRadius: 4, background: '#c0392b', color: '#fff', border: 'none', cursor: 'pointer' }}
                    onClick={() => handleDelete(viewer.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal for editing viewer settings */}
      {modalOpen && selectedViewer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#23272b', borderRadius: 8, padding: 32, minWidth: 350, maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>Edit Settings for {selectedViewer.name}</h3>
            <div style={{ margin: '24px 0', color: '#aaa' }}>
              {loading ? <div>Loading...</div> : (
                <form>
                  {settings.map(setting => (
                    <div key={setting.id} style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>{setting.name}</label>
                      {setting.type === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={viewerSettings[setting.id] === 'true'}
                          onChange={e => setViewerSettings({ ...viewerSettings, [setting.id]: e.target.checked ? 'true' : 'false' })}
                        />
                      ) : setting.name === 'Role' ? (
                        <select
                          value={viewerSettings[setting.id] || setting.default_value || 'Viewer'}
                          onChange={e => setViewerSettings({ ...viewerSettings, [setting.id]: e.target.value })}
                        >
                          <option value="Viewer">Viewer</option>
                          <option value="Mod">Mod</option>
                          <option value="Super Mod">Super Mod</option>
                        </select>
                      ) : setting.name === 'TTS Voice' ? (
                        <input
                          type="text"
                          placeholder="(default)"
                          value={viewerSettings[setting.id] || ''}
                          onChange={e => setViewerSettings({ ...viewerSettings, [setting.id]: e.target.value })}
                        />
                        // TODO: Replace with dropdown of voices from pollyVoiceEngines.sorted.json
                      ) : (
                        <input
                          type="text"
                          value={viewerSettings[setting.id] || ''}
                          onChange={e => setViewerSettings({ ...viewerSettings, [setting.id]: e.target.value })}
                        />
                      )}
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{setting.description}</div>
                    </div>
                  ))}
                </form>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                style={{ padding: '6px 18px', borderRadius: 4, background: '#444', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
              <button
                style={{ padding: '6px 18px', borderRadius: 4, background: '#3a8dde', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={handleSave}
                disabled={loading}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Viewers;
