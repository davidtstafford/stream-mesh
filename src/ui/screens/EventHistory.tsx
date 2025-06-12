import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface StoredEvent {
  id: number;
  type: string;
  platform: string;
  channel: string;
  user: string;
  message?: string;
  amount?: number;
  data?: string; // JSON string from database
  time: string;
}

const EventHistory: React.FC = () => {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searching, setSearching] = useState(false);
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  const eventTypes = ['chat', 'subscription', 'resub', 'subgift', 'cheer', 'hosted', 'raided'];

  // Fetch events with filters
  const fetchEvents = async (filters = {}) => {
    setLoading(true);
    try {
      const rows = await window.electron.ipcRenderer.invoke('events:fetch', {
        ...filters,
        limit: 1000, // Limit to 1000 events for performance
        orderBy: 'time',
        orderDirection: 'DESC'
      });
      
      setEvents(rows);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    const filters: any = {};
    if (filterType) filters.type = filterType;
    if (filterUser) filters.user = filterUser;
    if (filterPlatform) filters.platform = filterPlatform;
    if (dateFrom) filters.startTime = new Date(dateFrom).toISOString();
    if (dateTo) filters.endTime = new Date(dateTo).toISOString();
    
    await fetchEvents(filters);
    setSearching(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all event history? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      await window.electron.ipcRenderer.invoke('events:deleteAll');
      setEvents([]);
    } catch (error) {
      console.error('Failed to delete events:', error);
    }
    setLoading(false);
  };

  const handleDeleteRow = async (id: number) => {
    if (!window.confirm('Delete this event?')) return;
    
    try {
      await window.electron.ipcRenderer.invoke('events:deleteById', id);
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const formatEventData = (event: StoredEvent) => {
    let displayText = '';
    
    switch (event.type) {
      case 'chat':
        displayText = event.message || '';
        break;
      case 'subscription':
        const tier = event.amount || 1;
        displayText = `Subscribed (Tier ${tier})`;
        break;
      case 'resub':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const months = data.months || 1;
          displayText = `Resubscribed (${months} months)`;
        } catch {
          displayText = 'Resubscribed';
        }
        break;
      case 'subgift':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          displayText = `Gifted sub to ${data.recipient || 'someone'}`;
        } catch {
          displayText = 'Gifted subscription';
        }
        break;
      case 'cheer':
        displayText = `Cheered ${event.amount || 0} bits`;
        break;
      case 'hosted':
        displayText = `Hosted with ${event.amount || 0} viewers`;
        break;
      case 'raided':
        displayText = `Raided with ${event.amount || 0} viewers`;
        break;
      case 'redeem':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const rewardTitle = data.rewardTitle || 'Unknown Reward';
          const cost = event.amount || 0;
          displayText = `Redeemed "${rewardTitle}" (${cost} points)`;
          if (event.message) {
            displayText += ` - "${event.message}"`;
          }
        } catch {
          displayText = 'Channel Point Redemption';
        }
        break;
      default:
        displayText = event.message || event.type;
    }
    
    return displayText;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      chat: '#3a8dde',
      subscription: '#9147ff',
      resub: '#7b68ee',
      subgift: '#ff6b6b',
      cheer: '#ffd700',
      hosted: '#ff7f50',
      raided: '#ff4500',
      redeem: '#00ff88',
    };
    return colors[type] || '#aaa';
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(1200), color: 'var(--text-color, #fff)' }}>
      <h2 style={{ fontWeight: 'bold', marginBottom: 24 }}>Event History</h2>

      {/* Search Filters */}
      <div style={{ 
        background: 'var(--surface, #23272b)', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>Event Type</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #555', 
              background: '#333', 
              color: '#fff' 
            }}
          >
            <option value="">All Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>User</label>
          <input 
            type="text"
            placeholder="Username" 
            value={filterUser} 
            onChange={e => setFilterUser(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #555', 
              background: '#333', 
              color: '#fff' 
            }} 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>Platform</label>
          <input 
            type="text"
            placeholder="Platform" 
            value={filterPlatform} 
            onChange={e => setFilterPlatform(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #555', 
              background: '#333', 
              color: '#fff' 
            }} 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>From Date</label>
          <input 
            type="date"
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #555', 
              background: '#333', 
              color: '#fff' 
            }} 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#aaa' }}>To Date</label>
          <input 
            type="date"
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #555', 
              background: '#333', 
              color: '#fff' 
            }} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <button 
            onClick={handleSearch} 
            disabled={searching}
            style={{ 
              background: '#007bff', 
              color: '#fff', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 4,
              cursor: searching ? 'not-allowed' : 'pointer',
              opacity: searching ? 0.6 : 1
            }}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button 
            onClick={handleDeleteAll}
            style={{ 
              background: '#dc3545', 
              color: '#fff', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Delete All
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          background: 'var(--surface, #23272b)', 
          borderRadius: 8, 
          borderCollapse: 'collapse',
          fontSize: 14
        }}>
          <thead style={{ background: 'var(--background, #181c20)' }}>
            <tr>
              <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Type</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Platform</th>
              <th style={{ padding: 12, textAlign: 'left' }}>User</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Event Data</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Amount</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Time</th>
              <th style={{ padding: 12, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                  Loading events...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                  No events found
                </td>
              </tr>
            ) : (
              events.map(event => (
                <tr key={event.id} style={{ borderTop: '1px solid #333' }}>
                  <td style={{ padding: 12 }}>{event.id}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ 
                      color: getEventTypeColor(event.type),
                      fontWeight: 'bold'
                    }}>
                      {event.type}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{event.platform}</td>
                  <td style={{ padding: 12, fontWeight: 'bold' }}>{event.user}</td>
                  <td style={{ padding: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatEventData(event)}
                  </td>
                  <td style={{ padding: 12 }}>{event.amount || '-'}</td>
                  <td style={{ padding: 12, fontSize: 12 }}>
                    {new Date(event.time).toLocaleString()}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteRow(event.id)}
                      style={{ 
                        background: '#dc3545', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 4, 
                        padding: '4px 8px', 
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: 16,
        color: '#aaa',
        fontSize: 14
      }}>
        <div>{events.length} events found</div>
        <div>
          {/* TODO: Add pagination controls */}
        </div>
      </div>
    </div>
  );
};

export default EventHistory;
