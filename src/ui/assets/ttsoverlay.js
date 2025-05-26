// StreamMesh OBS TTS Overlay JS
// Connects to backend and plays TTS audio events in real time

const indicator = document.getElementById('tts-indicator');

function playTTS(url) {
  const audio = new Audio(url);
  indicator.style.display = 'block';
  audio.onended = () => { indicator.style.display = 'none'; };
  audio.onerror = () => { indicator.style.display = 'none'; };
  audio.play();
}

// Example: connect to EventSource (SSE) endpoint
const source = new EventSource('/obs/tts/stream');
source.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data && data.url) playTTS(data.url);
  } catch {}
};

source.onerror = () => {
  // Optionally show a disconnected indicator
};
