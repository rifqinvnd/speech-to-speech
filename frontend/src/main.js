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
        <div class="comparison-chart" id="comparison-chart" style="display: none;">
          <h4>Performance Comparison</h4>
          <div class="chart-bars">
            <div class="chart-item">
              <div class="chart-label">Processing Time</div>
              <div class="chart-bar-container">
                <div class="chart-bar realtime" id="chart-realtime-time"></div>
                <div class="chart-bar individual" id="chart-individual-time"></div>
              </div>
              <div class="chart-values">
                <span class="chart-value" id="chart-realtime-time-value">--</span>
                <span class="chart-value" id="chart-individual-time-value">--</span>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-label">Cost (¥/min)</div>
              <div class="chart-bar-container">
                <div class="chart-bar realtime" id="chart-realtime-cost"></div>
                <div class="chart-bar individual" id="chart-individual-cost"></div>
              </div>
              <div class="chart-values">
                <span class="chart-value" id="chart-realtime-cost-value">--</span>
                <span class="chart-value" id="chart-individual-cost-value">--</span>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-label">Quality Score</div>
              <div class="chart-bar-container">
                <div class="chart-bar realtime" id="chart-realtime-quality"></div>
                <div class="chart-bar individual" id="chart-individual-quality"></div>
              </div>
              <div class="chart-values">
                <span class="chart-value" id="chart-realtime-quality-value">--</span>
                <span class="chart-value" id="chart-individual-quality-value">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="transcript" style="margin-top:1rem;"></div>
      <audio id="audio-player" controls style="display:none; margin-top:1rem;"></audio>
    </section>
  </main>
  
  <!-- 比較セクション -->
  <section class="comparison-section">
    <!-- Realtime API側 -->
    <div class="api-demo realtime-demo">
      <header class="demo-header">
        <h3>OpenAI Realtime API</h3>
        <div class="status-indicator" data-status="idle" id="realtime-status">
          <span class="status-dot"></span>
          <span class="status-text">Idle</span>
        </div>
      </header>
      
      <div class="demo-content">
        <!-- プロセス表示 -->
        <div class="process-steps">
          <div class="step" id="realtime-step-1">1. WebSocket Connection</div>
          <div class="step" id="realtime-step-2">2. Integrated Processing (STT+LLM+TTS)</div>
          <div class="step" id="realtime-step-3">3. Audio Output</div>
        </div>

        <!-- 特徴表示 -->
        <div class="features">
          <div class="feature-item">✅ Low Latency (320ms)</div>
          <div class="feature-item">✅ Supports Batching</div>
          <div class="feature-item">⚠️ High Cost ($18/hour)</div>
        </div>
        
        <!-- 結果表示エリア -->
        <div class="result-area" id="realtime-result" style="margin-top: 1rem; display: none;">
          <h4>Results:</h4>
          <div class="result-metrics">
            <div class="result-metric">
              <span class="metric-label">Processing Time:</span>
              <span class="metric-value" id="realtime-processing-time">--</span>
            </div>
            <div class="result-metric">
              <span class="metric-label">Cost:</span>
              <span class="metric-value" id="realtime-cost">--</span>
            </div>
            <div class="result-metric">
              <span class="metric-label">Quality:</span>
              <span class="metric-value" id="realtime-quality">--</span>
            </div>
          </div>
          <div class="result-transcript" id="realtime-transcript"></div>
        </div>
      </div>
    </div>

    <!-- 個別実装側 -->
    <div class="api-demo individual-demo">
      <header class="demo-header">
        <h3>Individual Implementation (STT + LLM + TTS)</h3>
        <div class="status-indicator" data-status="idle" id="individual-status">
          <span class="status-dot"></span>
          <span class="status-text">Idle</span>
        </div>
      </header>
      
      <div class="demo-content">
        <!-- プロセス表示 -->
        <div class="process-steps">
          <div class="step" id="individual-step-1">1. Speech Recognition (Whisper)</div>
          <div class="step" id="individual-step-2">2. LLM Processing (GPT-4)</div>
          <div class="step" id="individual-step-3">3. Speech Synthesis (TTS)</div>
        </div>

        <!-- 特徴表示 -->
        <div class="features">
          <div class="feature-item">✅ High Customizability</div>
          <div class="feature-item">✅ Moderate Cost ($5-10/hour)</div>
          <div class="feature-item">⚠️ High Latency (2-3s)</div>
        </div>
        
        <!-- 結果表示エリア -->
        <div class="result-area" id="individual-result" style="margin-top: 1rem; display: none;">
          <h4>Results:</h4>
          <div class="result-metrics">
            <div class="result-metric">
              <span class="metric-label">Processing Time:</span>
              <span class="metric-value" id="individual-processing-time">--</span>
            </div>
            <div class="result-metric">
              <span class="metric-label">Cost:</span>
              <span class="metric-value" id="individual-cost">--</span>
            </div>
            <div class="result-metric">
              <span class="metric-label">Quality:</span>
              <span class="metric-value" id="individual-quality">--</span>
            </div>
          </div>
          <div class="result-transcript" id="individual-transcript"></div>
        </div>
      </div>
    </div>
  </section>
`;
document.body.appendChild(app);

// Result display functions
function updateStatus(demoId, status) {
  const statusIndicator = document.getElementById(`${demoId}-status`);
  const statusText = statusIndicator.querySelector('.status-text');
  
  statusIndicator.setAttribute('data-status', status);
  statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function updateStep(demoId, stepNumber, isActive = false) {
  const stepElement = document.getElementById(`${demoId}-step-${stepNumber}`);
  if (isActive) {
    stepElement.style.color = 'var(--primary-color)';
    stepElement.style.fontWeight = 'bold';
  } else {
    stepElement.style.color = 'var(--text-primary)';
    stepElement.style.fontWeight = 'normal';
  }
}

function showResult(demoId, result) {
  const resultArea = document.getElementById(`${demoId}-result`);
  resultArea.style.display = 'block';
  
  // Update metrics
  if (result.processingTime) {
    document.getElementById(`${demoId}-processing-time`).textContent = `${result.processingTime}ms`;
  }
  if (result.cost) {
    document.getElementById(`${demoId}-cost`).textContent = result.cost;
  }
  if (result.quality) {
    document.getElementById(`${demoId}-quality`).textContent = result.quality;
  }
  if (result.transcript) {
    document.getElementById(`${demoId}-transcript`).textContent = result.transcript;
  }
  
  // Update comparison chart
  updateComparisonChart();
}

function updateComparisonChart() {
  const chart = document.getElementById('comparison-chart');
  const placeholder = document.getElementById('comparison-placeholder');
  
  // Get values from both demos
  const realtimeTime = document.getElementById('realtime-processing-time').textContent;
  const individualTime = document.getElementById('individual-processing-time').textContent;
  const realtimeCost = document.getElementById('realtime-cost').textContent;
  const individualCost = document.getElementById('individual-cost').textContent;
  const realtimeQuality = document.getElementById('realtime-quality').textContent;
  const individualQuality = document.getElementById('individual-quality').textContent;
  
  // Check if we have results from both demos
  if (realtimeTime !== '--' && individualTime !== '--') {
    chart.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Update chart values
    document.getElementById('chart-realtime-time-value').textContent = realtimeTime;
    document.getElementById('chart-individual-time-value').textContent = individualTime;
    document.getElementById('chart-realtime-cost-value').textContent = realtimeCost;
    document.getElementById('chart-individual-cost-value').textContent = individualCost;
    document.getElementById('chart-realtime-quality-value').textContent = realtimeQuality;
    document.getElementById('chart-individual-quality-value').textContent = individualQuality;
    
    // Update bar widths based on values
    updateChartBars();
  }
}

function updateChartBars() {
  // Processing Time (lower is better)
  const realtimeTimeText = document.getElementById('realtime-processing-time').textContent;
  const individualTimeText = document.getElementById('individual-processing-time').textContent;
  
  // Handle both "ms" suffix and raw numbers
  const realtimeTime = parseInt(realtimeTimeText.replace('ms', ''));
  const individualTime = parseInt(individualTimeText.replace('ms', ''));
  const maxTime = Math.max(realtimeTime, individualTime);
  
  const realtimeTimeBar = document.getElementById('chart-realtime-time');
  const individualTimeBar = document.getElementById('chart-individual-time');
  realtimeTimeBar.style.width = `${(realtimeTime / maxTime) * 100}%`;
  individualTimeBar.style.width = `${(individualTime / maxTime) * 100}%`;
  
  // Cost (lower is better) - handle different cost formats
  const realtimeCostText = document.getElementById('realtime-cost').textContent;
  const individualCostText = document.getElementById('individual-cost').textContent;
  
  // Extract numeric values from cost strings
  const realtimeCost = parseInt(realtimeCostText.replace(/[^\d]/g, ''));
  const individualCost = parseInt(individualCostText.replace(/[^\d]/g, ''));
  const maxCost = Math.max(realtimeCost, individualCost);
  
  const realtimeCostBar = document.getElementById('chart-realtime-cost');
  const individualCostBar = document.getElementById('chart-individual-cost');
  realtimeCostBar.style.width = `${(realtimeCost / maxCost) * 100}%`;
  individualCostBar.style.width = `${(individualCost / maxCost) * 100}%`;
  
  // Quality (higher is better)
  const realtimeQuality = parseInt(document.getElementById('realtime-quality').textContent);
  const individualQuality = parseInt(document.getElementById('individual-quality').textContent);
  const maxQuality = Math.max(realtimeQuality, individualQuality);
  
  const realtimeQualityBar = document.getElementById('chart-realtime-quality');
  const individualQualityBar = document.getElementById('chart-individual-quality');
  realtimeQualityBar.style.width = `${(realtimeQuality / maxQuality) * 100}%`;
  individualQualityBar.style.width = `${(individualQuality / maxQuality) * 100}%`;
}

function resetResults() {
  // Reset status indicators
  updateStatus('realtime', 'idle');
  updateStatus('individual', 'idle');
  
  // Reset steps
  for (let i = 1; i <= 3; i++) {
    updateStep('realtime', i, false);
    updateStep('individual', i, false);
  }
  
  // Hide result areas
  document.getElementById('realtime-result').style.display = 'none';
  document.getElementById('individual-result').style.display = 'none';
  
  // Reset metrics
  document.getElementById('processing-time').textContent = '--';
  document.getElementById('estimated-cost').textContent = '--';
  document.getElementById('quality-score').textContent = '--';
  
  // Reset comparison placeholder and hide chart
  document.getElementById('comparison-placeholder').textContent = 'Comparison results will be displayed here';
  document.getElementById('comparison-placeholder').style.display = 'block';
  document.getElementById('comparison-chart').style.display = 'none';
}

// Initialize results display
resetResults();

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
let processingStartTime = null;

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
        
        // Reset results before new processing
        resetResults();
        
        // Start timing the processing from when recording stops
        processingStartTime = Date.now();
        console.log('Processing started at:', processingStartTime);
        
        if (modeSelect.value === 'integrated') {
          // Simulate Realtime API processing
          updateStatus('realtime', 'processing');
          updateStep('realtime', 1, true);
          
          transcriptDiv.textContent = 'Sending audio to backend (integrated)...';
          console.log('Sending audio to backend (integrated)');
          const ws = new WebSocket('ws://localhost:3001/ws/integrated');
          ws.onopen = () => {
            ws.send(audioBlob);
            console.log('Audio sent to WebSocket backend');
            updateStep('realtime', 2, true);
          };
          ws.onmessage = (event) => {
            transcriptDiv.textContent = event.data;
            updateStep('realtime', 3, true);
            updateStatus('realtime', 'complete');
            
            // Calculate actual processing time
            const actualProcessingTime = Date.now() - processingStartTime;
            console.log('Realtime processing completed in:', actualProcessingTime, 'ms');
            showResult('realtime', {
              processingTime: actualProcessingTime,
              cost: '$0.30/min',
              quality: '95%',
              transcript: event.data
            });
            
            // Update main metrics
            document.getElementById('processing-time').textContent = actualProcessingTime;
            document.getElementById('estimated-cost').textContent = '¥18/min';
            document.getElementById('quality-score').textContent = '95%';
            
            ws.close();
            console.log('Received message from WebSocket backend:', event.data);
          };
          ws.onerror = (err) => {
            transcriptDiv.textContent = 'WebSocket error: ' + err.message;
            updateStatus('realtime', 'error');
            console.error('WebSocket error:', err);
          };
        } else {
          // Simulate Individual Implementation processing
          updateStatus('individual', 'processing');
          updateStep('individual', 1, true);
          
          transcriptDiv.textContent = 'Sending audio to backend (modular)...';
          console.log('Sending audio to backend (modular)');
          const set = document.getElementById('set-select').value;
          const formData = new FormData();
          formData.append('audio', audioBlob, mimeType === 'audio/ogg; codecs=opus' ? 'audio.ogg' : 'audio.webm');
          formData.append('set', set);
          try {
            console.log('Sending request to backend...');
            const res = await fetch('http://localhost:3001/api/modular', {
              method: 'POST',
              body: formData
            });
            console.log('Response status:', res.status);
            const data = await res.json();
            console.log('Response data:', data);
            if (!res.ok) {
              transcriptDiv.textContent = `Error: ${data.error || 'Unknown error'}\n${data.details || ''}`;
              updateStatus('individual', 'error');
              console.error('Backend error:', data);
              audioPlayer.style.display = 'none';
              return;
            }
            
            updateStep('individual', 2, true);
            updateStep('individual', 3, true);
            updateStatus('individual', 'complete');
            
            transcriptDiv.textContent = data.message || 'Received response.';
            console.log('Received modular response:', data);

            // Calculate actual processing time
            const actualProcessingTime = Date.now() - processingStartTime;
            console.log('Individual processing completed in:', actualProcessingTime, 'ms');
            showResult('individual', {
              processingTime: actualProcessingTime,
              cost: '$0.15/min',
              quality: '-',
              transcript: data.message || 'Processed successfully'
            });
            
            // Update main metrics
            document.getElementById('processing-time').textContent = actualProcessingTime;
            document.getElementById('estimated-cost').textContent = '¥9/min';
            document.getElementById('quality-score').textContent = '90%';

            // Play audio if returned
            console.log('Sending audio request to backend...');
            const audioRes = await fetch('http://localhost:3001/api/modular?audio=1', {
              method: 'POST',
              body: formData
            });
            console.log('Audio response status:', audioRes.status);
            if (audioRes.ok) {
              const audioBlob = await audioRes.blob();
              console.log('Audio blob size:', audioBlob.size);
              audioPlayer.src = URL.createObjectURL(audioBlob);
              audioPlayer.style.display = '';
              audioPlayer.play();
              console.log('Playing TTS audio response');
            } else {
              audioPlayer.style.display = 'none';
              console.warn('No audio returned from backend, status:', audioRes.status);
              const errorText = await audioRes.text();
              console.error('Audio request failed:', errorText);
            }
          } catch (err) {
            transcriptDiv.textContent = 'Network or server error: ' + (err.message || err);
            updateStatus('individual', 'error');
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
