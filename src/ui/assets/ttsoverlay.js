// StreamMesh OBS TTS Overlay JS
// Connects to backend and plays TTS audio events in real time


const indicator = document.getElementById('tts-indicator');
const ttsQueue = [];
let isPlaying = false;

function playNextTTS() {
  if (isPlaying || ttsQueue.length === 0) return;
  isPlaying = true;
  const url = ttsQueue.shift();
  const audio = new Audio(url);
  indicator.style.display = 'block';
  audio.onended = audio.onerror = () => {
    indicator.style.display = 'none';
    isPlaying = false;
    playNextTTS();
  };
  audio.play();
}

const source = new EventSource('/obs/tts/stream');
source.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data && data.url) {
      ttsQueue.push(data.url);
      playNextTTS();
    }
  } catch {}
};

source.onerror = () => {
  // Optionally show a disconnected indicator
};
