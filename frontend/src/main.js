import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

// Clear body and set up main app container
document.body.innerHTML = '';

const app = document.createElement('div');
app.className = 'app-container';
app.innerHTML = `
  <header class="app-header">
    <h1>🎤 Speech to Speech API Comparison</h1>
  </header>
  <main class="app-main">
    <aside class="control-panel">
      <section class="audio-input-section">
        <h2>Audio Input</h2>
        <div class="input-controls">
          <button class="record-btn" id="record-btn">🎙️ Start Recording</button>
        </div>
        <div class="audio-visualizer">
          <div class="waveform-placeholder" id="waveform-placeholder">Audio waveform will be displayed here</div>
        </div>
      </section>
      <section style="margin-top:2rem;">
        <label for="mode-select">Mode:</label>
        <select id="mode-select">
          <option value="integrated">Integrated (OpenAI Realtime)</option>
          <option value="modular">Modular (Set1/Set2)</option>
        </select>
        <span id="set-select-container" style="display:none;">
          <label for="set-select">Set:</label>
          <select id="set-select">
            <option value="set1">Set1 (OpenAI)</option>
            <option value="set2">Set2 (Google)</option>
          </select>
        </span>
      </section>
    </aside>
    <section class="visualization-dashboard">
      <div class="dashboard-header">
        <h2>Realtime Comparison</h2>
        <div class="dashboard-controls">
          <button class="start-comparison-btn" disabled>Start Comparison</button>
          <button class="reset-btn" disabled>Reset</button>
        </div>
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Processing Time</h3>
          <div class="metric-value" id="processing-time">--</div>
          <div class="metric-unit">ms</div>
        </div>
        <div class="metric-card">
          <h3>Estimated Cost</h3>
          <div class="metric-value" id="estimated-cost">--</div>
          <div class="metric-unit">¥/min</div>
        </div>
        <div class="metric-card">
          <h3>Quality Score</h3>
          <div class="metric-value" id="quality-score">--</div>
          <div class="metric-unit">%</div>
        </div>
      </div>
      <div class="flow-chart">
        <div class="comparison-placeholder" id="comparison-placeholder">Comparison results will be displayed here</div>
      </div>
      <div id="transcript" style="margin-top:1rem;"></div>
      <audio id="audio-player" controls style="display:none; margin-top:1rem;"></audio>
    </section>
  </main>
`;
document.body.appendChild(app);

const modeSelect = document.getElementById('mode-select');
const setSelectContainer = document.getElementById('set-select-container');
const recordBtn = document.getElementById('record-btn');
const transcriptDiv = document.getElementById('transcript');
const audioPlayer = document.getElementById('audio-player');

// Set Modular as default and disable Integrated option
modeSelect.value = 'modular';
modeSelect.querySelector('option[value="integrated"]').disabled = true;
setSelectContainer.style.display = '';

modeSelect.addEventListener('change', () => {
  setSelectContainer.style.display = modeSelect.value === 'modular' ? '' : 'none';
  console.log('Mode changed to', modeSelect.value);
});

let mediaRecorder, audioChunks = [], isRecording = false;

recordBtn.onclick = async () => {
  if (!isRecording) {
    // Start recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      transcriptDiv.textContent = 'getUserMedia is not supported in this browser.';
      console.error('getUserMedia is not supported in this browser.');
      return;
    }
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/ogg; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log('Audio Blob type:', audioBlob.type);
        if (modeSelect.value === 'integrated') {
          transcriptDiv.textContent = 'Sending audio to backend (integrated)...';
          console.log('Sending audio to backend (integrated)');
          const ws = new WebSocket('ws://localhost:3001/ws/integrated');
          ws.onopen = () => {
            ws.send(audioBlob);
            console.log('Audio sent to WebSocket backend');
          };
          ws.onmessage = (event) => {
            transcriptDiv.textContent = event.data;
            ws.close();
            console.log('Received message from WebSocket backend:', event.data);
          };
          ws.onerror = (err) => {
            transcriptDiv.textContent = 'WebSocket error: ' + err.message;
            console.error('WebSocket error:', err);
          };
        } else {
          transcriptDiv.textContent = 'Sending audio to backend (modular)...';
          console.log('Sending audio to backend (modular)');
          const set = document.getElementById('set-select').value;
          const formData = new FormData();
          formData.append('audio', audioBlob, mimeType === 'audio/ogg; codecs=opus' ? 'audio.ogg' : 'audio.webm');
          formData.append('set', set);
          try {
            const res = await fetch('http://localhost:3001/api/modular', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            if (!res.ok) {
              transcriptDiv.textContent = `Error: ${data.error || 'Unknown error'}\n${data.details || ''}`;
              console.error('Backend error:', data);
              audioPlayer.style.display = 'none';
              return;
            }
            transcriptDiv.textContent = data.message || 'Received response.';
            console.log('Received modular response:', data);

            // Play audio if returned
            const audioRes = await fetch('http://localhost:3001/api/modular?audio=1&set=' + set, {
              method: 'POST',
              body: formData
            });
            if (audioRes.ok) {
              const audioBlob = await audioRes.blob();
              audioPlayer.src = URL.createObjectURL(audioBlob);
              audioPlayer.style.display = '';
              audioPlayer.play();
              console.log('Playing TTS audio response');
            } else {
              audioPlayer.style.display = 'none';
              console.warn('No audio returned from backend');
            }
          } catch (err) {
            transcriptDiv.textContent = 'Network or server error: ' + (err.message || err);
            audioPlayer.style.display = 'none';
            console.error('Fetch/network error:', err);
          }
        }
      };
      mediaRecorder.start();
      recordBtn.textContent = '⏹️ Stop Recording';
      isRecording = true;
      console.log('Recording started');
    } catch (err) {
      transcriptDiv.textContent = 'Microphone access denied or error: ' + (err.message || err);
      console.error('Microphone access denied or error:', err);
    }
  } else {
    // Stop recording
    mediaRecorder.stop();
    recordBtn.textContent = '🎙️ Start Recording';
    isRecording = false;
    console.log('Recording stopped');
  }
};
