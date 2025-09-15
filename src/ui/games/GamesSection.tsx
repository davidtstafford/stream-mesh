import React, { useState } from 'react';

type Gang = { id: string; name: string; members: number; bank: number; wins: number };
type Player = { id: string; name: string; currency: number; gang: string; wins: number; is_supermod: boolean };
// Gang Wars UI scaffold for Games section and Gang Wars sub-tab
// This is a placeholder React component structure for the new UI section.


// --- Main Games Section with sub-tabs ---
export function GamesSection() {
  const [activeTab, setActiveTab] = useState<'gangwars'>('gangwars');
  return (
    <div>
      <h1>Games</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('gangwars')}
          style={{
            background: activeTab === 'gangwars' ? '#3a8dde' : '#23272e',
            color: activeTab === 'gangwars' ? '#fff' : '#aaa',
            border: 'none',
            borderRadius: 8,
            padding: '10px 28px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: activeTab === 'gangwars' ? '0 2px 8px #0004' : undefined
          }}
        >
          Gang Wars
        </button>
        {/* Add more game tabs here in the future */}
      </div>
      {activeTab === 'gangwars' && <GangWarsTabs />}
    </div>
  );
}

// --- Gang Wars Section with sub-tabs ---
function GangWarsTabs() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'gangs' | 'players'>('overview');
  const [gameEnabled, setGameEnabled] = useState(true);
  const [currencyName, setCurrencyName] = useState('Coins');

  return (
    <div style={{ background: '#23272e', borderRadius: 12, padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveSubTab('overview')}
          style={subTabBtnStyle(activeSubTab === 'overview')}
        >Overview</button>
        <button
          onClick={() => setActiveSubTab('gangs')}
          style={subTabBtnStyle(activeSubTab === 'gangs')}
        >Gangs</button>
        <button
          onClick={() => setActiveSubTab('players')}
          style={subTabBtnStyle(activeSubTab === 'players')}
        >Players</button>
      </div>
      {activeSubTab === 'overview' && (
        <>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={gameEnabled} onChange={e => setGameEnabled(e.target.checked)} />
              <span style={{ fontWeight: 500 }}>Game Enabled</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>Currency Name:</span>
              <input
                type="text"
                value={currencyName}
                onChange={e => setCurrencyName(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#181c20', color: '#fff', minWidth: 80 }}
                maxLength={16}
              />
            </label>
          </div>
          <Tutorial currencyName={currencyName} />
        </>
      )}
      {activeSubTab === 'gangs' && <GangsTab />}
      {activeSubTab === 'players' && <PlayersTab />}
    </div>
  );
}

function subTabBtnStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#3a8dde' : '#181c20',
    color: active ? '#fff' : '#aaa',
    border: 'none',
    borderRadius: 8,
    padding: '8px 22px',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: active ? '0 2px 8px #0004' : undefined
  };
}

// --- Gangs Management Tab ---
function GangsTab() {
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGangs();
  }, []);

  async function fetchGangs() {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.ipcRenderer.invoke('gangwars:listGangs');
      setGangs(result);
    } catch (e) {
      setError('Failed to load gangs');
    } finally {
      setLoading(false);
    }
  }

  const handleRename = async (id: string) => {
    try {
      await window.electron.ipcRenderer.invoke('gangwars:renameGang', id, editName);
      fetchGangs();
    } catch {
      setError('Rename failed');
    }
    setEditId(null);
  };
  const handleDelete = async (id: string) => {
    try {
      await window.electron.ipcRenderer.invoke('gangwars:deleteGang', id);
      fetchGangs();
    } catch {
      setError('Delete failed');
    }
  };

  return (
    <div>
      <h3 style={{ color: '#3a8dde', marginBottom: 16 }}>All Gangs</h3>
      {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#aaa' }}>Loading gangs...</div>
      ) : (
        <table style={{ width: '100%', background: '#181c20', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <thead>
            <tr style={{ color: '#fff', background: '#23272e' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
              <th style={{ padding: 12 }}>Members</th>
              <th style={{ padding: 12 }}>Bank</th>
              <th style={{ padding: 12 }}>Wins</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {gangs.map((gang: Gang) => (
              <tr key={gang.id} style={{ color: '#fff', borderBottom: '1px solid #23272e' }}>
                <td style={{ padding: 12 }}>
                  {editId === gang.id ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#23272e', color: '#fff' }}
                    />
                  ) : (
                    gang.name
                  )}
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>{gang.members}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{gang.bank}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{gang.wins}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  {editId === gang.id ? (
                    <>
                      <button onClick={() => handleRename(gang.id)} style={actionBtnStyle(true)}>Save</button>
                      <button onClick={() => setEditId(null)} style={actionBtnStyle(false)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(gang.id); setEditName(gang.name); }} style={actionBtnStyle(true)}>Rename</button>
                      <button onClick={() => handleDelete(gang.id)} style={actionBtnStyle(false)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function actionBtnStyle(primary: boolean): React.CSSProperties {
  return {
    background: primary ? '#3a8dde' : '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 16px',
    marginRight: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: primary ? '0 1px 4px #0002' : undefined
  };
}

// --- Players Stats Tab ---
function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.ipcRenderer.invoke('gangwars:listPlayers');
      setPlayers(result);
    } catch (e) {
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 style={{ color: '#3a8dde', marginBottom: 16 }}>All Players</h3>
      {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#aaa' }}>Loading players...</div>
      ) : (
        <table style={{ width: '100%', background: '#181c20', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ color: '#fff', background: '#23272e' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
              <th style={{ padding: 12 }}>Gang</th>
              <th style={{ padding: 12 }}>Currency</th>
              <th style={{ padding: 12 }}>Wins</th>
              <th style={{ padding: 12 }}>Super Mod</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player: Player) => (
              <tr key={player.id} style={{ color: '#fff', borderBottom: '1px solid #23272e' }}>
                <td style={{ padding: 12 }}>{player.name}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.gang}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.currency}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.wins}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.is_supermod ? '⭐' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- Tutorial Section ---
function Tutorial({ currencyName }: { currencyName: string }) {
  return (
    <div style={{ background: '#181c20', borderRadius: 8, padding: 24, color: '#fff' }}>
      <h3 style={{ color: '#3a8dde' }}>How to Play Gang Wars</h3>
      <ol style={{ lineHeight: 1.7 }}>
        <li>Register for the game: <code>~gw register</code></li>
        <li>Create or join a gang: <code>~gw creategang &lt;name&gt;</code> or <code>~gw joingang &lt;gang&gt;</code></li>
        <li>Earn and manage your {currencyName}: <code>~gw deposit &lt;amount&gt;</code>, <code>~gw withdraw &lt;amount&gt;</code></li>
        <li>Buy and upgrade weapons: <code>~gw buy &lt;weapon&gt;</code>, <code>~gw upgrade &lt;weapon&gt;</code></li>
        <li>Battle other players or gangs: <code>~gw attack &lt;player&gt;</code>, <code>~gw attackgang &lt;yourGang&gt; &lt;targetGang&gt;</code></li>
        <li>Admins can reset the game or give {currencyName}: <code>~gw adminreset</code>, <code>~gw admingive &lt;player&gt; &lt;amount&gt;</code></li>
      </ol>
      <p style={{ marginTop: 16, color: '#8fda8f' }}>
        Tip: All major events are announced in chat and via TTS overlays. Check the <b>Gang Wars Guide</b> for a full list of commands and gameplay tips!
      </p>
      <a href="/gangwars.html" target="_blank" rel="noopener" style={{ color: '#3a8dde', textDecoration: 'underline', fontWeight: 500 }}>Open Gang Wars Guide</a>
    </div>
  );
}
