import React, { useState, useEffect } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface StoredEvent {
  id: number;
  type: string;
  platform: string;
  channel: string;
  user: string;
  viewer_name?: string; // From JOIN with viewers table
  viewer_platform?: string;
  message?: string;
  amount?: number;
  data?: string;
  metadata?: string;
  time: string;
}

const EventsSearch: React.FC = () => {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter states
  const [eventType, setEventType] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [user, setUser] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  const { getResponsiveContainerStyle } = useResponsiveLayout();

  // Event type options
  const eventTypes = [
    { value: '', label: 'All Events' },
    { value: 'chat', label: 'Chat' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'resub', label: 'Resubscription' },
    { value: 'subgift', label: 'Gift Subscription' },
    { value: 'cheer', label: 'Cheer' },
    { value: 'hosted', label: 'Host' },
    { value: 'raided', label: 'Raid' },
    { value: 'redeem', label: 'Redemption' },
    { value: 'channel.followed', label: 'Follow' },
    { value: 'channel.subscription.new', label: 'New Subscription (KICK)' },
    { value: 'channel.subscription.renewal', label: 'Subscription Renewal (KICK)' },
    { value: 'channel.subscription.gifts', label: 'Gifted Subscription (KICK)' },
    { value: 'moderation.banned', label: 'Ban' },
  ];

  const platforms = [
    { value: '', label: 'All Platforms' },
    { value: 'twitch', label: 'Twitch' },
    { value: 'kick', label: 'KICK' },
  ];

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const filters: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (eventType) filters.type = eventType;
      if (platform) filters.platform = platform;
      if (user) filters.user = user;
      if (searchText) filters.searchText = searchText;
      if (startDate) filters.startTime = new Date(startDate).toISOString();
      if (endDate) filters.endTime = new Date(endDate + 'T23:59:59').toISOString();

      // Fetch events with viewer names joined
      const results = await window.electron.ipcRenderer.invoke('events:fetchWithViewerNames', filters);
      setEvents(results);

      // Get total count for pagination
      const count = await window.electron.ipcRenderer.invoke('events:count', filters);
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters/page change
  useEffect(() => {
    fetchEvents();
  }, [currentPage, eventType, platform, user, searchText, startDate, endDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [eventType, platform, user, searchText, startDate, endDate]);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  // Render event content
  const renderEventContent = (event: StoredEvent) => {
    let data: any = {};
    try {
      if (event.data) {
        data = JSON.parse(event.data);
      }
    } catch (e) {
      // Ignore parse errors
    }

    const displayName = event.viewer_name || event.user;

    switch (event.type) {
      case 'chat':
        return (
          <div>
            <strong style={{ color: '#3a8dde' }}>{displayName}:</strong> {event.message}
          </div>
        );
      case 'subscription':
        return (
          <div style={{ color: '#9147ff' }}>
            <strong>🌟 {displayName}</strong> subscribed!
          </div>
        );
      case 'resub':
        const months = data.months || 1;
        return (
          <div style={{ color: '#7b68ee' }}>
            <strong>🔥 {displayName}</strong> resubscribed for {months} months!
            {event.message && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{event.message}"</div>}
          </div>
        );
      case 'subgift':
        const recipient = data.recipient || 'someone';
        return (
          <div style={{ color: '#ff6b6b' }}>
            <strong>🎁 {displayName}</strong> gifted a sub to {recipient}!
          </div>
        );
      case 'cheer':
        return (
          <div style={{ color: '#ffd700' }}>
            <strong>✨ {displayName}</strong> cheered {event.amount} bits!
          </div>
        );
      case 'hosted':
        return (
          <div style={{ color: '#ff7f50' }}>
            <strong>📺 {displayName}</strong> is hosting with {event.amount || 0} viewers!
          </div>
        );
      case 'raided':
        return (
          <div style={{ color: '#ff4500' }}>
            <strong>⚡ {displayName}</strong> raided with {event.amount || 0} viewers!
          </div>
        );
      case 'redeem':
        const rewardTitle = data.rewardTitle || 'Unknown Reward';
        const cost = event.amount || 0;
        return (
          <div style={{ color: '#00ff88' }}>
            <strong>🎁 {displayName}</strong> redeemed "{rewardTitle}" ({cost} points)
            {event.message && <div style={{ fontStyle: 'italic', marginTop: 4 }}>"{event.message}"</div>}
          </div>
        );
      default:
        return (
          <div>
            <strong>{displayName}</strong> - {event.type}
            {event.message && <div style={{ marginTop: 4 }}>{event.message}</div>}
          </div>
        );
    }
  };

  return (
    <div style={{ ...getResponsiveContainerStyle(1400), color: 'var(--text-color, #fff)', height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 'bold', margin: 0 }}>Event Search</h2>
        <p style={{ color: '#888', margin: '8px 0 0 0' }}>
          Search and filter all stored events from your stream
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Filters</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Event Type Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            >
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              User
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Filter by username"
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            />
          </div>

          {/* Content Search */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              Search Content
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search in messages..."
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            />
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#aaa' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                padding: '8px 12px',
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* Clear Filters */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              setEventType('');
              setPlatform('');
              setUser('');
              setSearchText('');
              setStartDate('');
              setEndDate('');
            }}
            style={{
              background: '#666',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          fontSize: 14,
          color: '#888',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          Showing {events.length} of {totalCount} events
          {eventType && ` • Type: ${eventTypes.find((t) => t.value === eventType)?.label}`}
          {platform && ` • Platform: ${platforms.find((p) => p.value === platform)?.label}`}
        </span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? '#444' : '#3a8dde',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              ← Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? '#444' : '#3a8dde',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Events Display */}
      <div
        style={{
          background: 'var(--surface, #23272b)',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 16,
          height: 'calc(100vh - 450px)',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
            <p>No events found.</p>
            <p style={{ fontSize: 14 }}>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  minWidth: 140,
                  fontSize: 12,
                  color: '#888',
                }}
              >
                {new Date(event.time).toLocaleString()}
              </div>
              <div
                style={{
                  minWidth: 70,
                  fontSize: 12,
                  color: '#666',
                  textTransform: 'capitalize',
                }}
              >
                {event.platform}
              </div>
              <div
                style={{
                  minWidth: 100,
                  fontSize: 12,
                  color: '#ffd700',
                  fontWeight: 'bold',
                }}
              >
                {event.type}
              </div>
              <div style={{ flex: 1 }}>{renderEventContent(event)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsSearch;
