// Centralized chat message formatting for both Chat screen and OBS overlay
// This module exports a function to format a chat message object into a style-rich structure

export interface ChatMessage {
  platform: string;
  channel: string;
  user: string;
  message: string;
  time: string;
}

export interface FormattedChatMessage {
  platform: string;
  user: string;
  time: string;
  message: string;
  color: string;
  platformLabel: string;
  timeFormatted: string;
}

const platformColors: Record<string, string> = {
  twitch: '#9147ff',
  youtube: '#ff0000',
  system: '#888',
  default: '#aaa',
};

export function formatChatMessage(msg: ChatMessage): FormattedChatMessage {
  // Defensive: fallback for missing fields
  const platform = msg.platform || '';
  const user = msg.user || '';
  const time = msg.time || '';
  const message = msg.message || '';
  const color = platformColors[platform] || platformColors.default;
  // Only show platform label if platform is present
  const platformLabel = platform ? `[${platform}]` : '';
  // Only show formatted time if time is present and valid
  let timeFormatted = '';
  if (time) {
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      timeFormatted = d.toLocaleTimeString();
    }
  }
  return {
    platform,
    user,
    time,
    message,
    color,
    platformLabel,
    timeFormatted,
  };
}
