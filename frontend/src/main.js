import './style.css'
import RealtimeWebSocket from './realtime-websocket.js'

// Audio conversion function for OpenAI Realtime API
async function convertToPCM16(audioBuffer) {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const fileReader = new FileReader();
    
    fileReader.onload = async () => {
      try {
        // Decode the audio data
        const arrayBuffer = fileReader.result;
        const audioData = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create offline context for resampling
        const offlineContext = new OfflineAudioContext(1, audioData.length, 24000);
        const source = offlineContext.createBufferSource();
        source.buffer = audioData;
        source.connect(offlineContext.destination);
        source.start();
        
        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to PCM16
        const channelData = renderedBuffer.getChannelData(0);
        const pcm16Data = new Int16Array(channelData.length);
        
        for (let i = 0; i < channelData.length; i++) {
          // Convert float to 16-bit integer
          const sample = Math.max(-1, Math.min(1, channelData[i]));
          pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        // Convert to Uint8Array for base64 encoding
        const uint8Array = new Uint8Array(pcm16Data.buffer);
        resolve(uint8Array);
        
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = reject;
    
    // Create a blob from the audio buffer and read it
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    fileReader.readAsArrayBuffer(blob);
  });
}

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
        <label for="set-select">Set:</label>
        <select id="set-select">
          <option value="set1">Set1 (OpenAI)</option>
          <option value="set2">Set2 (Google)</option>
        </select>
      </section>
    </aside>
    <section class="visualization-dashboard">
      <div class="dashboard-header">
        <h2>Realtime Comparison</h2>
        <div class="dashboard-controls">
          <button class="start-comparison-btn" id="start-comparison-btn" disabled>Start Comparison</button>
          <button class="reset-btn" id="reset-btn" disabled>Reset</button>
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
          <div class="result-audio" id="realtime-audio" style="margin-top: 10px; display: none;">
            <strong>Audio Output:</strong>
            <audio id="realtime-audio-player" controls style="margin-top: 5px; width: 100%;"></audio>
          </div>
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
          <div class="result-audio" id="individual-audio" style="margin-top: 10px; display: none;">
            <strong>Audio Output:</strong>
            <audio id="individual-audio-player" controls style="margin-top: 5px; width: 100%;"></audio>
          </div>
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
  
  // Update transcript display
  const transcriptElement = document.getElementById(`${demoId}-transcript`);
  if (result.transcript) {
    if (demoId === 'individual' && result.userTranscript && result.aiReply) {
      // For modular API, show simple text format
      transcriptElement.textContent = `User Input: ${result.userTranscript}\nAI Response: ${result.aiReply}`;
    } else {
      // For other APIs, show simple text
      transcriptElement.textContent = result.transcript;
    }
  }
  
  // Update audio display for modular API
  if (demoId === 'individual' && result.audioData) {
    const audioContainer = document.getElementById('individual-audio');
    const audioPlayer = document.getElementById('individual-audio-player');
    
    // Convert base64 to blob and set as audio source
    const audioBlob = new Blob([Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    
    // Show the audio container
    audioContainer.style.display = 'block';
  }
  
  // Update audio display for realtime API
  if (demoId === 'realtime' && result.audioData) {
    const audioContainer = document.getElementById('realtime-audio');
    const audioPlayer = document.getElementById('realtime-audio-player');
    
    // Convert base64 to blob and set as audio source
    const audioBlob = new Blob([Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    
    // Show the audio container
    audioContainer.style.display = 'block';
  }
  
  // Store result
  if (demoId === 'realtime') {
    realtimeResult = result;
  } else if (demoId === 'individual') {
    individualResult = result;
  }
  
  // Check if comparison is ready
  checkComparisonReady();
}

function updateComparisonChart() {
  const chart = document.getElementById('comparison-chart');
  const placeholder = document.getElementById('comparison-placeholder');
  
  // Check if we have results from both demos
  if (realtimeResult && individualResult) {
    chart.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Update chart values
    document.getElementById('chart-realtime-time-value').textContent = `${realtimeResult.processingTime}ms`;
    document.getElementById('chart-individual-time-value').textContent = `${individualResult.processingTime}ms`;
    document.getElementById('chart-realtime-cost-value').textContent = realtimeResult.cost;
    document.getElementById('chart-individual-cost-value').textContent = individualResult.cost;
    document.getElementById('chart-realtime-quality-value').textContent = realtimeResult.quality;
    document.getElementById('chart-individual-quality-value').textContent = individualResult.quality;
    
    // Update bar widths based on values
    updateChartBars();
  }
}

function updateChartBars() {
  // Processing Time (lower is better)
  const realtimeTime = realtimeResult.processingTime;
  const individualTime = individualResult.processingTime;
  const maxTime = Math.max(realtimeTime, individualTime);
  
  const realtimeTimeBar = document.getElementById('chart-realtime-time');
  const individualTimeBar = document.getElementById('chart-individual-time');
  realtimeTimeBar.style.width = `${(realtimeTime / maxTime) * 100}%`;
  individualTimeBar.style.width = `${(individualTime / maxTime) * 100}%`;
  
  // Cost (lower is better) - handle different cost formats
  const realtimeCostText = realtimeResult.cost;
  const individualCostText = individualResult.cost;
  
  // Extract numeric values from cost strings
  const realtimeCost = parseInt(realtimeCostText.replace(/[^\d]/g, ''));
  const individualCost = parseInt(individualCostText.replace(/[^\d]/g, ''));
  const maxCost = Math.max(realtimeCost, individualCost);
  
  const realtimeCostBar = document.getElementById('chart-realtime-cost');
  const individualCostBar = document.getElementById('chart-individual-cost');
  realtimeCostBar.style.width = `${(realtimeCost / maxCost) * 100}%`;
  individualCostBar.style.width = `${(individualCost / maxCost) * 100}%`;
  
  // Quality (higher is better)
  const realtimeQuality = parseInt(realtimeResult.quality);
  const individualQuality = parseInt(individualResult.quality);
  const maxQuality = Math.max(realtimeQuality, individualQuality);
  
  const realtimeQualityBar = document.getElementById('chart-realtime-quality');
  const individualQualityBar = document.getElementById('chart-individual-quality');
  realtimeQualityBar.style.width = `${(realtimeQuality / maxQuality) * 100}%`;
  individualQualityBar.style.width = `${(individualQuality / maxQuality) * 100}%`;
}

function checkComparisonReady() {
  if (realtimeResult && individualResult) {
    startComparisonBtn.disabled = false;
    resetBtn.disabled = false;
  } else {
    startComparisonBtn.disabled = true;
    resetBtn.disabled = true;
  }
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
  
  // Hide audio containers
  const realtimeAudio = document.getElementById('realtime-audio');
  const individualAudio = document.getElementById('individual-audio');
  if (realtimeAudio) realtimeAudio.style.display = 'none';
  if (individualAudio) individualAudio.style.display = 'none';
  
  // Reset metrics
  document.getElementById('processing-time').textContent = '--';
  document.getElementById('estimated-cost').textContent = '--';
  document.getElementById('quality-score').textContent = '--';
  
  // Reset comparison placeholder and hide chart
  document.getElementById('comparison-placeholder').textContent = 'Comparison results will be displayed here';
  document.getElementById('comparison-placeholder').style.display = 'block';
  document.getElementById('comparison-chart').style.display = 'none';
  
  // Reset result tracking
  realtimeResult = null;
  individualResult = null;
  checkComparisonReady();
}

// Initialize variables
let mediaRecorder, audioChunks = [], isRecording = false;
let processingStartTime = null;
let realtimeResult = null;
let individualResult = null;
let realtimeAudioDone = false;
let realtimeTimeoutId = null;
let audioChunksRealtime = [];

// Initialize WebSocket for real-time processing
const realtimeWs = new RealtimeWebSocket();
let isRealtimeProcessing = false;

// Get DOM elements after they're created
const recordBtn = document.getElementById('record-btn');
const transcriptDiv = document.getElementById('transcript');
const startComparisonBtn = document.getElementById('start-comparison-btn');
const resetBtn = document.getElementById('reset-btn');

// Debug: Check if elements exist
console.log('DOM elements found:', {
  recordBtn: !!recordBtn,
  transcriptDiv: !!transcriptDiv,
  startComparisonBtn: !!startComparisonBtn,
  resetBtn: !!resetBtn
});

// Initialize results display after DOM elements are available
resetResults();

// Button event handlers
startComparisonBtn.addEventListener('click', () => {
  if (realtimeResult && individualResult) {
    updateComparisonChart();
    console.log('Comparison triggered with results:', { realtimeResult, individualResult });
  }
});

resetBtn.addEventListener('click', () => {
  resetResults();
  console.log('Results reset');
});

// WebSocket event handlers
realtimeWs.onMessage((data) => {
  console.log('Realtime message received:', data);
  
  // Handle OpenAI Realtime STS API message formats
  if (data.type === 'response.create') {
    // OpenAI response creation started
    console.log('OpenAI response creation started');
  } else if (data.type === 'response.audio.delta') {
    // Each delta is base64-encoded PCM16 chunk
    if (data.delta) {
      audioChunksRealtime.push(data.delta);
    }
  } else if (data.type === 'response.audio.done') {
    realtimeAudioDone = true;
    if (realtimeTimeoutId) {
      clearTimeout(realtimeTimeoutId);
      realtimeTimeoutId = null;
    }
    // OpenAI audio response completed
    console.log('OpenAI audio response completed');
    updateStep('realtime', 3, true);
    updateStatus('realtime', 'complete');
    const realtimeProcessingTime = Date.now() - processingStartTime;
    showResult('realtime', {
      processingTime: realtimeProcessingTime,
      cost: '$0.30/min',
      quality: '-',
      transcript: 'OpenAI Realtime API processing completed',
      audioData: null
    });
    // Handle audio playback
    if (audioChunksRealtime.length > 0) {
      const wavBlob = pcm16ChunksToWavBlob(audioChunksRealtime, 24000);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audioPlayer = document.getElementById('realtime-audio-player');
      audioPlayer.src = audioUrl;
      document.getElementById('realtime-audio').style.display = 'block';
      audioChunksRealtime = [];
    }
  } else if (data.type === 'error') {
    console.error('Realtime error:', data.message);
    updateStatus('realtime', 'error');
  } else {
    // Log other message types for debugging
    console.log('Other message type:', data.type, data);
  }
});

realtimeWs.onError((error) => {
  console.error('WebSocket error:', error);
  updateStatus('realtime', 'error');
});

realtimeWs.onStatusChange((status) => {
  console.log('WebSocket status changed:', status);
  
  if (status === 'connected') {
    console.log('WebSocket connected successfully');
    updateStatus('realtime', 'connected');
    updateStep('realtime', 1, true);
  } else if (status === 'processing') {
    console.log('WebSocket processing started');
    updateStatus('realtime', 'processing');
    updateStep('realtime', 2, true);
  } else if (status === 'idle') {
    console.log('WebSocket processing stopped');
    updateStatus('realtime', 'idle');
  } else if (status === 'error') {
    console.log('WebSocket error status');
    updateStatus('realtime', 'error');
  } else if (status === 'disconnected') {
    console.log('WebSocket disconnected');
    updateStatus('realtime', 'disconnected');
  }
});

function pcm16ChunksToWavBlob(base64Chunks, sampleRate) {
  // Decode all base64 chunks and concatenate
  let pcmData = [];
  base64Chunks.forEach(b64 => {
    const bin = atob(b64);
    for (let i = 0; i < bin.length; i++) {
      pcmData.push(bin.charCodeAt(i));
    }
  });
  const pcm16 = new Uint8Array(pcmData);

  // WAV header
  const wavBuffer = new ArrayBuffer(44 + pcm16.length);
  const view = new DataView(wavBuffer);

  // RIFF identifier 'RIFF'
  view.setUint32(0, 0x52494646, false);
  // file length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + pcm16.length, true);
  // RIFF type 'WAVE'
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier 'fmt '
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier 'data'
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, pcm16.length, true);

  // Write PCM samples
  new Uint8Array(wavBuffer, 44).set(pcm16);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

recordBtn.addEventListener('click', async () => {
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
        
        // Process audio using both APIs simultaneously
        transcriptDiv.textContent = 'Processing audio with both APIs simultaneously...';
        console.log('Processing audio with both APIs simultaneously');
        
        const set = document.getElementById('set-select').value;
        const formData = new FormData();
        formData.append('audio', audioBlob, mimeType === 'audio/ogg; codecs=opus' ? 'audio.ogg' : 'audio.webm');
        formData.append('set', set);
        
        // Start both APIs simultaneously
        const promises = [];
        
        // Start modular API processing
        updateStatus('individual', 'processing');
        updateStep('individual', 1, true);
        
        const modularPromise = fetch('http://localhost:3001/api/modular', {
          method: 'POST',
          body: formData
        }).then(async (response) => {
          console.log('Modular response status:', response.status);
          const data = await response.json();
          console.log('Modular response data:', data);
          console.log('Transcript:', data.transcript);
          console.log('User transcript:', data.userTranscript);
          console.log('AI reply:', data.aiReply);
          
          if (!response.ok) {
            throw new Error(`Modular API Error: ${data.error || 'Unknown error'}\n${data.details || ''}`);
          }
          
          updateStep('individual', 2, true);
          updateStep('individual', 3, true);
          updateStatus('individual', 'complete');
          
          // Calculate modular processing time
          const modularProcessingTime = Date.now() - processingStartTime;
          console.log('Modular processing completed in:', modularProcessingTime, 'ms');
          
          return {
            processingTime: modularProcessingTime,
            cost: '$0.15/min',
            quality: '-',
            transcript: data.transcript || 'No transcript',
            userTranscript: data.userTranscript || 'No transcript',
            aiReply: data.aiReply || 'No reply',
            audioData: data.audioData || null
          };
        }).catch((error) => {
          console.error('Modular API error:', error);
          updateStatus('individual', 'error');
          throw error;
        });
        
        // Start realtime API processing
        updateStatus('realtime', 'processing');
        updateStep('realtime', 1, true);
        
        // Test if WebSocket endpoint is available
        const realtimePromise = realtimeWs.connect().then(() => {
          console.log('🎯 WebSocket connected successfully in main.js');
          console.log('🎯 Starting realtime processing...');
          realtimeWs.startProcessing();
          
          // Send audio data to WebSocket
          return new Promise((resolve, reject) => {
            console.log('🎯 Setting up audio reader...');
            const audioReader = new FileReader();
            audioReader.onload = async () => {
              try {
                console.log('🎯 Audio reader loaded, converting blob to buffer...');
                const audioBuffer = await realtimeWs.blobToBuffer(audioBlob);
                console.log('🎯 Audio buffer created, size:', audioBuffer.length);
                
                // Convert audio to PCM16 24kHz format for OpenAI
                console.log('🎯 Converting audio to PCM16 24kHz...');
                const pcmBuffer = await convertToPCM16(audioBuffer);
                console.log('🎯 PCM16 conversion completed, size:', pcmBuffer.length);
                
                console.log('🎯 Sending audio to WebSocket...');
                realtimeWs.sendAudio(pcmBuffer);
                console.log('🎯 Audio sent, requesting response...');
                realtimeWs.stopProcessing();
                console.log('🎯 Response requested, waiting for OpenAI...');
                // Set a 5-second timeout to handle no response
                realtimeAudioDone = false;
                if (realtimeTimeoutId) clearTimeout(realtimeTimeoutId);
                realtimeTimeoutId = setTimeout(() => {
                  if (!realtimeAudioDone) {
                    console.warn('⏰ Timeout: No response.audio.done received after 5 seconds.');
                    updateStep('realtime', 3, true);
                    updateStatus('realtime', 'complete');
                    showResult('realtime', {
                      processingTime: Date.now() - processingStartTime,
                      cost: '$0.30/min',
                      quality: '-',
                      transcript: 'Timeout: No response from OpenAI',
                      audioData: null
                    });
                    // Optionally: realtimeWs.disconnect();
                  }
                }, 5000);
                resolve();
              } catch (error) {
                console.error('🎯 Error in audio processing:', error);
                reject(error);
              }
            };
            audioReader.onerror = (error) => {
              console.error('🎯 Audio reader error:', error);
              reject(error);
            };
            console.log('🎯 Starting to read audio blob as ArrayBuffer...');
            audioReader.readAsArrayBuffer(audioBlob);
          });
        }).catch((error) => {
          console.error('🎯 Realtime API error:', error);
          updateStatus('realtime', 'error');
          // Don't throw error, just log it and continue with modular only
          console.log('🎯 Realtime API failed, continuing with modular only');
          return Promise.resolve(); // Resolve instead of throwing
        });
        
        // Wait for both APIs to complete
        try {
          const [modularResult, realtimeResult] = await Promise.allSettled([modularPromise, realtimePromise]);
          
          if (modularResult.status === 'fulfilled') {
            showResult('individual', modularResult.value);
          }
          
          if (realtimeResult.status === 'rejected') {
            console.log('Realtime API failed, showing only modular results');
            updateStatus('realtime', 'error');
          }
          
          // Realtime result will be handled by the WebSocket message handler if it succeeds
          
        } catch (error) {
          console.error('Error processing with APIs:', error);
          transcriptDiv.textContent = 'Error processing audio: ' + error.message;
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
});
