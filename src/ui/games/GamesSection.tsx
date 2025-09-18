import React, { useState, useEffect } from 'react';

type Gang = { id: string; name: string; members: string[]; bank: number; wins: number };
type Player = { id: string; name: string; currency: number; gang_id?: string; wins: number; is_supermod: boolean; role?: string };
type JoinRequest = { id: string; player_id: string; gang_id: string; timestamp: string };
// Gang Wars UI scaffold for Games section and Gang Wars sub-tab
// This is a placeholder React component structure for the new UI section.


// --- Main Games Section with sub-tabs ---
export function GamesSection() {
  const [activeTab, setActiveTab] = useState<'gangwars'>('gangwars');
  // Admin Reset Game button
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const handleResetGame = async () => {
    setResetStatus(null);
    const res = await window.electron.ipcRenderer.invoke('gangwars:adminReset');
    if (res && res.success) setResetStatus('Game reset successfully!');
    else setResetStatus(res && res.error ? res.error : 'Failed to reset game');
  };

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
        <button onClick={handleResetGame} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Reset Game</button>
      </div>
      {resetStatus && <div style={{ color: resetStatus.includes('success') ? '#8fda8f' : '#dc3545', marginBottom: 12 }}>{resetStatus}</div>}
      {activeTab === 'gangwars' && <GangWarsTabs />}
    </div>
  );
}

// --- Gang Wars Section with sub-tabs ---
function GangWarsTabs() {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'gangs' | 'players'>('overview');
  const [gameEnabled, setGameEnabled] = useState(true);
  const [currencyName, setCurrencyName] = useState('Coins');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [passiveIncomeAmount, setPassiveIncomeAmount] = useState(25);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const result = await window.electron.ipcRenderer.invoke('gangwars:getSettings');
        if (result && result.success) {
          setCurrencyName(result.settings.currencyName || 'Coins');
          setGameEnabled(typeof result.settings.gameEnabled === 'boolean' ? result.settings.gameEnabled : true);
          setPassiveIncomeAmount(typeof result.settings.passiveIncomeAmount === 'number' ? result.settings.passiveIncomeAmount : 25);
          setSettingsLoaded(true);
        } else {
          setSettingsError(result && result.error ? result.error : 'Failed to load settings');
        }
      } catch (e) {
        setSettingsError('Failed to load settings');
      }
    }
    loadSettings();
  }, []);

  // Save settings when changed
  useEffect(() => {
    if (!settingsLoaded) return;
    const save = async () => {
      try {
        await window.electron.ipcRenderer.invoke('gangwars:setSettings', {
          currencyName,
          gameEnabled,
          passiveIncomeAmount,
        });
      } catch {}
    };
    save();
  }, [currencyName, gameEnabled, passiveIncomeAmount, settingsLoaded]);

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
      {settingsError && <div style={{ color: '#dc3545', marginBottom: 12 }}>{settingsError}</div>}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>Passive Income (per 30 min):</span>
              <input
                type="number"
                min={0}
                value={passiveIncomeAmount}
                onChange={e => setPassiveIncomeAmount(Number(e.target.value))}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#181c20', color: '#fff', width: 80 }}
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [requests, setRequests] = useState<{ [gangId: string]: JoinRequest[] }>({});
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [gangRes, playerRes] = await Promise.all([
        window.electron.ipcRenderer.invoke('gangwars:listGangs'),
        window.electron.ipcRenderer.invoke('gangwars:listPlayers'),
      ]);
      if (gangRes && gangRes.success && playerRes && playerRes.success) {
        setGangs(gangRes.gangs || []);
        setPlayers(playerRes.players || []);
        // Fetch join requests for each gang
        const reqs: { [gangId: string]: JoinRequest[] } = {};
        for (const gang of gangRes.gangs || []) {
          const r = await window.electron.ipcRenderer.invoke('gangwars:listJoinRequests', gang.id);
          reqs[gang.id] = r && r.success ? r.requests || [] : [];
        }
        setRequests(reqs);
      } else {
        setError('Failed to load gangs or players');
        setGangs([]);
        setPlayers([]);
      }
    } catch (e) {
      setError('Failed to load gangs/players');
      setGangs([]);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  const handleRename = async (id: string) => {
    try {
      await window.electron.ipcRenderer.invoke('gangwars:renameGang', id, editName);
      fetchAll();
    } catch {
      setError('Rename failed');
    }
    setEditId(null);
  };
  const handleDelete = async (id: string) => {
    try {
      await window.electron.ipcRenderer.invoke('gangwars:deleteGang', id);
      fetchAll();
    } catch {
      setError('Delete failed');
    }
  };

  // Helper to get player name/role by id
  function getPlayerInfo(id: string) {
    if (!Array.isArray(players)) return id;
    const p = players.find(pl => pl && pl.id === id);
    return p ? `${p.name}${p.role ? ' (' + p.role + ')' : ''}` : id;
  }

  return (
    <div>
      <h3 style={{ color: '#3a8dde', marginBottom: 16 }}>All Gangs</h3>
      {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#aaa' }}>Loading gangs...</div>
      ) : (
        <>
        {Array.isArray(gangs) && gangs.length > 0 ? (
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
                  <td style={{ padding: 12 }}>{editId === gang.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #444', background: '#23272e', color: '#fff' }} />
                  ) : gang.name}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {Array.isArray(gang.members) && gang.members.length > 0
                      ? gang.members.map(getPlayerInfo).join(', ')
                      : '—'}
                  </td>
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
        ) : (
          <div style={{ color: '#aaa', marginBottom: 16 }}>No gangs found.</div>
        )}
        {/* Show join requests for each gang */}
        {Array.isArray(gangs) && gangs.map(gang => Array.isArray(requests[gang.id]) && requests[gang.id].length > 0 && (
          <div key={gang.id + '-requests'} style={{ marginBottom: 24, background: '#23272e', borderRadius: 8, padding: 16 }}>
            <b style={{ color: '#3a8dde' }}>Join Requests for {gang.name}:</b>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {requests[gang.id].map(req => {
                const p = Array.isArray(players) ? players.find(pl => pl && pl.id === req.player_id) : undefined;
                return <li key={req.id}>{p ? p.name : req.player_id} (requested {req.timestamp ? new Date(req.timestamp).toLocaleString() : 'unknown'})</li>;
              })}
            </ul>
          </div>
        ))}
        </>
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
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [playerRes, gangRes] = await Promise.all([
        window.electron.ipcRenderer.invoke('gangwars:listPlayers'),
        window.electron.ipcRenderer.invoke('gangwars:listGangs'),
      ]);
      if (playerRes && playerRes.success && gangRes && gangRes.success) {
        setPlayers(playerRes.players || []);
        setGangs(gangRes.gangs || []);
      } else {
        setError('Failed to load players or gangs');
        setPlayers([]);
        setGangs([]);
      }
    } catch (e) {
      setError('Failed to load players/gangs');
      setPlayers([]);
      setGangs([]);
    } finally {
      setLoading(false);
    }
  }

  function getGangName(gangId: string | undefined) {
    if (!gangId) return '';
    const g = gangs.find(g => g.id === gangId);
    return g ? g.name : gangId;
  }


  // Try to get current user from localStorage (set by app on login), fallback to first player
  let currentUserId = '';
  try { currentUserId = localStorage.getItem('currentUserId') || ''; } catch {}
  const currentUser = players.find(p => p.id === currentUserId) || players.find(p => p.is_supermod) || players[0];

  async function handleRemove(playerId: string) {
    if (!currentUser) return;
    const res = await window.electron.ipcRenderer.invoke('gangwars:deletePlayer', currentUser.id, playerId);
    if (res && res.success) fetchAll();
    else alert(res && res.error ? res.error : 'Failed to remove player');
  }

  // The app owner (current user) can always remove any player except themselves
  const isAppOwner = !!currentUser;

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
              {isAppOwner && <th style={{ padding: 12 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {players.map((player: Player) => (
              <tr key={player.id} style={{ color: '#fff', borderBottom: '1px solid #23272e' }}>
                <td style={{ padding: 12 }}>{player.name}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{getGangName(player.gang_id)}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.currency}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.wins}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{player.is_supermod ? 'Yes' : 'No'}</td>
                {isAppOwner && (
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button onClick={() => handleRemove(player.id)} style={actionBtnStyle(false)}>Remove</button>
                  </td>
                )}
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
        <li>Register: <code>~gw register</code></li>
        <li>Create a gang: <code>~gw creategang &lt;name&gt;</code></li>
        <li>Join a gang: <code>~gw joingang &lt;gang&gt;</code> <span style={{ color:'#aaa' }}>(Sends a join request; must be approved)</span></li>
        <li>Leave your gang: <code>~gw leavegang</code></li>
        <li>Disband your gang: <code>~gw disbandgang</code> <span style={{ color:'#aaa' }}>(God Father only)</span></li>
        <li>See player stats: <code>~gw stats [@username]</code> <span style={{ color:'#aaa' }}>(Shows your stats, or another player's if specified)</span></li>
        <li>See your inventory: <code>~gw inventory</code></li>
        <li>Quit and delete your account: <code>~gw quit</code></li>
        <li>New players start with 100 coins and a bat.</li>
        <li>Collect passive income: <code>~gw collect</code> <span style={{ color:'#aaa' }}>(Claim coins for all full 30-min intervals since last collection)</span></li>
      </ol>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Gang Management & Requests</h4>
      <ul>
        <li>List join requests: <code>~gw listrequests</code> <span style={{ color:'#aaa' }}>(Lieutenant or God Father only)</span></li>
        <li>Approve join request: <code>~gw approverequest &lt;requestId&gt;</code> <span style={{ color:'#aaa' }}>(Lieutenant or God Father only)</span></li>
        <li>Kick member: <code>~gw kick &lt;username&gt;</code> <span style={{ color:'#aaa' }}>(God Father only)</span></li>
        <li>Promote member: <code>~gw promote &lt;username&gt;</code> <span style={{ color:'#aaa' }}>(God Father only; promotes Grunt to Lieutenant, or Lieutenant to God Father and demotes self)</span></li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Currency & Banking</h4>
      <ul>
        <li>Deposit: <code>~gw deposit &lt;amount&gt;</code></li>
        <li>Withdraw: <code>~gw withdraw &lt;amount&gt;</code> <span style={{ color:'#aaa' }}>(Lieutenant: up to 10% of bank, God Father: any amount, Grunt: must request approval)</span></li>
        <li>Passive income: Use <code>~gw collect</code> to claim your coins. The default is 25 coins per 30 minutes, but the broadcaster can change this in the UI.</li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Weapons & Inventory</h4>
      <ul>
        <li>Buy weapon: <code>~gw buy &lt;weapon&gt;</code></li>
        <li>Upgrade weapon: <code>~gw upgrade &lt;weapon&gt;</code></li>
        <li>Shop: <code>~gw shop</code> <span style={{ color:'#aaa' }}>(Lists all weapons and prices)</span></li>
        <li>Inventory is persistent and supports all weapons. You always start with a bat.</li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Combat</h4>
      <ul>
        <li>Attack player: <code>~gw attack &lt;player&gt;</code></li>
        <li>Attack gang: <code>~gw attackgang &lt;gang name&gt;</code></li>
        <li><b>Combat Rules:</b>
          <ul>
            <li>When attacking a player, the winner takes 10% of the loser's cash.</li>
            <li>When attacking a gang, the winning gang takes 10% of the losing gang's bank.</li>
            <li>If you lose, you lose 10% of your own cash/bank to the winner.</li>
            <li>All weapons and player stats are considered in combat (not just random).</li>
            <li>When a player or gang is attacked, they are on a 30-minute cooldown (cannot be attacked again) unless they attack someone else, which resets their cooldown.</li>
            <li>All commands are robust to case, spaces, and @username (e.g. <code>~gw attack @EggieBert</code> or <code>~gw buy Rail Gun</code>).</li>
            <li>All currency output uses the custom name set by the broadcaster in the UI.</li>
          </ul>
        </li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Leaderboards</h4>
      <ul>
        <li>Leaderboard: <code>~gw leaderboard</code> <span style={{ color:'#aaa' }}>(Top 3 players, top 3 gangs, your rank)</span></li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Admin & Super Mod Commands</h4>
      <ul>
        <li>Reset game: <code>~gw adminreset</code></li>
        <li>Give currency: <code>~gw admingive &lt;player&gt; &lt;amount&gt;</code></li>
        <li>Delete player: <code>~gw deleteplayer &lt;username&gt;</code> <span style={{ color:'#aaa' }}>(Super Mod only; removes a player from the game)</span></li>
        <li>Disband gang: <code>~gw disbandgang</code> <span style={{ color:'#aaa' }}>(God Father only; also available in UI)</span></li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Gang Roles & Permissions</h4>
      <ul>
        <li><b>God Father</b>: Can approve join requests, kick members, withdraw any amount, disband gang.</li>
        <li><b>Lieutenant</b>: Can approve join requests, withdraw up to 10% of gang bank.</li>
        <li><b>Grunt</b>: Can deposit, but must request approval to withdraw. Cannot approve join requests or kick.</li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Tips & Info</h4>
      <ul>
        <li>Currency name and game status can be set by the broadcaster in the Games tab.</li>
        <li>Passive income amount is also configurable in the Games tab. Default is 25 coins per 30 minutes.</li>
        <li>Major events are announced in chat and via TTS overlays.</li>
        <li>Check the Games tab in the Stream Mesh app for leaderboards and more info.</li>
        <li>All user and gang lookups are robust: you can use username, @username, or ID, and gang names are case/space-insensitive.</li>
        <li>Clear error messages are provided for all failed commands (e.g. not enough funds, not in a gang, etc).</li>
      </ul>
      <h4 style={{ color: '#3a8dde', marginTop: 24 }}>Example Gameplay</h4>
      <pre style={{ background: '#222', color: '#8fda8f', borderRadius: 6, padding: 12, marginBottom: 0 }}>
~gw register
~gw creategang TheLegends
~gw joingang TheLegends
~gw deposit 100
~gw buy pistol
~gw attack rivalPlayer
      </pre>
      <div style={{ marginTop: 24 }}>
        <a href="/gangwars.html" target="_blank" rel="noopener" style={{ color: '#3a8dde', textDecoration: 'underline', fontWeight: 500 }}>Open Full Gang Wars Guide</a>
      </div>
    </div>
  );
}
