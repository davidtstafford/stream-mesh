import React, { useState, useEffect, useMemo } from 'react';
import voicesJson from '../../shared/assets/pollyVoiceEngines.sorted.json';

// Use the preload-exposed ipcRenderer for secure IPC
const ipcRenderer = window.electronAPI?.ipcRenderer;

interface Viewer {
  id: string;
  name: string;
  platform: string;
  lastActive: string;
}

// Fix Setting type to match backend: id, viewer_id, key, value
interface Setting {
  id: string;
  viewer_id: string;
  key: string;
  value: string;
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
  const [roleFilter, setRoleFilter] = useState('');
  const [ttsFilter, setTtsFilter] = useState('');

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
    ipcRenderer.invoke('fetchViewerSettings', viewer.id).then((data: any[]) => {
      const map: Record<string, string | null> = {};
      data.forEach(vs => { map[vs.key] = vs.value; });
      setViewerSettings(map);
      setLoading(false);
    });
  };

  // Save handler (now wired to backend)
  const handleSave = async () => {
    if (!ipcRenderer || !selectedViewer) return;
    setLoading(true);
    // Always upsert all settings in the model, not just those that exist in DB
    const allSettings = [
      { key: 'tts_disabled', value: viewerSettings['tts_disabled'] ?? 'false' },
      { key: 'role', value: viewerSettings['role'] ?? 'viewer' },
      { key: 'voice', value: viewerSettings['voice'] ?? '' },
    ];
    for (const s of allSettings) {
      await ipcRenderer.invoke('updateViewerSettings', selectedViewer.id, { [s.key]: s.value });
    }
    setLoading(false);
    setModalOpen(false);
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

  // Prepare voices for dropdown, ensure only one Not Set
  const voices = voicesJson.filter(v => v.Name).map(v => ({ Name: v.Name, LanguageName: v.LanguageName }));
  voices.unshift({ Name: '', LanguageName: 'Not Set' });

  const filteredViewers = useMemo(() => {
    // Build a map of settings for each viewer
    const settingsMap: Record<string, Record<string, string>> = {};
    settings.forEach(s => {
      if (!settingsMap[s.viewer_id]) settingsMap[s.viewer_id] = {};
      settingsMap[s.viewer_id][s.key] = s.value;
    });
    return viewers.filter(v => {
      // Text search (name, platform, etc.)
      const matchesText = v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.platform.toLowerCase().includes(search.toLowerCase()) ||
        v.id.toLowerCase().includes(search.toLowerCase());
      // Get settings for this viewer
      const viewerSettings = settingsMap[v.id] || {};
      // Role filter
      const matchesRole = !roleFilter || viewerSettings['role'] === roleFilter;
      // TTS Disabled filter
      const matchesTts = !ttsFilter || viewerSettings['tts_disabled'] === ttsFilter;
      return matchesText && matchesRole && matchesTts;
    });
  }, [viewers, settings, search, roleFilter, ttsFilter]);

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="viewer">Viewer</option>
          <option value="moderator">Moderator</option>
          <option value="super_moderator">Super Moderator</option>
        </select>
        <select value={ttsFilter} onChange={e => setTtsFilter(e.target.value)}>
          <option value="">All TTS</option>
          <option value="false">TTS Enabled</option>
          <option value="true">TTS Disabled</option>
        </select>
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
                settings.length > 0 && (
                  <form>
                    {/* TTS Disabled */}
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>TTS Disabled</label>
                      <input
                        type="checkbox"
                        checked={viewerSettings['tts_disabled'] === 'true'}
                        onChange={e => setViewerSettings({ ...viewerSettings, ['tts_disabled']: e.target.checked ? 'true' : 'false' })}
                      />
                    </div>
                    {/* Role */}
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Role</label>
                      <select
                        value={viewerSettings['role'] || 'viewer'}
                        onChange={e => setViewerSettings({ ...viewerSettings, ['role']: e.target.value })}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="moderator">Moderator</option>
                        <option value="super_moderator">Super Moderator</option>
                      </select>
                    </div>
                    {/* Voice */}
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Voice</label>
                      <select
                        value={viewerSettings['voice'] || ''}
                        onChange={e => setViewerSettings({ ...viewerSettings, ['voice']: e.target.value })}
                      >
                        {voices.map(v => (
                          <option key={v.Name} value={v.Name}>{v.Name ? `${v.Name} (${v.LanguageName})` : 'Not Set'}</option>
                        ))}
                      </select>
                    </div>
                  </form>
                )
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
