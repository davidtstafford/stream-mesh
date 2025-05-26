// StreamMesh OBS Chat Overlay JS
// This script connects to the backend via WebSocket or EventSource to receive chat messages
// and renders them in the overlay.

const chatMessages = document.getElementById('chat-messages');

function addChatMessage({ user, message, color }) {
  const msg = document.createElement('div');
  msg.className = 'chat-message';
  msg.innerHTML = `<span class="chat-username" style="color:${color || '#3a8dde'}">${user}</span><span class="chat-text">${message}</span>`;
  chatMessages.appendChild(msg);
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  // Remove old messages if too many
  while (chatMessages.children.length > 30) chatMessages.removeChild(chatMessages.firstChild);
}

// Example: connect to EventSource (SSE) endpoint
const source = new EventSource('/obs/chat/stream');
source.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    addChatMessage(data);
  } catch {}
};

source.onerror = () => {
  // Optionally show a disconnected indicator
};
