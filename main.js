/**
 * Speech to Speech API 比較デモ
 * シンプルな比較機能のみを実装
 */

class VoiceComparisonDemo {
  constructor() {
    this.isRecording = false;
    this.isComparing = false;
    this.audioData = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('Speech to Speech 比較デモが開始されました');
  }

  setupEventListeners() {
    // 録音ボタン
    const recordBtn = document.querySelector('.record-btn');
    recordBtn?.addEventListener('click', () => this.toggleRecording());

    // ファイル選択
    const fileInput = document.querySelector('.file-input');
    fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));

    // 比較開始ボタン
    const startBtn = document.querySelector('.start-comparison-btn');
    startBtn?.addEventListener('click', () => this.startComparison());

    // リセットボタン
    const resetBtn = document.querySelector('.reset-btn');
    resetBtn?.addEventListener('click', () => this.resetDemo());
  }

  toggleRecording() {
    const recordBtn = document.querySelector('.record-btn');
    const waveformArea = document.querySelector('.waveform-placeholder');
    
    if (!this.isRecording) {
      this.isRecording = true;
      recordBtn.textContent = '🛑 録音停止';
      recordBtn.style.background = 'var(--error-color)';
      waveformArea.textContent = '🎙️ 録音中...';
      
      // 3秒後に自動停止（シミュレーション）
      setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, 3000);
    } else {
      this.stopRecording();
    }
  }

  stopRecording() {
    this.isRecording = false;
    this.audioData = { type: 'recording', duration: 3 };
    
    const recordBtn = document.querySelector('.record-btn');
    const waveformArea = document.querySelector('.waveform-placeholder');
    
    recordBtn.textContent = '🎙️ 録音開始';
    recordBtn.style.background = 'var(--primary-color)';
    waveformArea.textContent = '✅ 音声データ準備完了 (3秒)';
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      this.audioData = { type: 'file', name: file.name };
      
      const waveformArea = document.querySelector('.waveform-placeholder');
      waveformArea.textContent = `✅ ファイル読み込み完了: ${file.name}`;
    }
  }

  async startComparison() {
    if (!this.audioData) {
      alert('音声データを準備してください（録音またはファイル選択）');
      return;
    }

    if (this.isComparing) return;

    this.isComparing = true;
    this.updateComparisonStatus('processing');
    
    // 並列でシミュレーション実行
    const [realtimeResult, individualResult] = await Promise.all([
      this.simulateRealtimeAPI(),
      this.simulateIndividualImpl()
    ]);

    this.displayResults(realtimeResult, individualResult);
    this.updateComparisonStatus('complete');
    this.isComparing = false;
  }

  async simulateRealtimeAPI() {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      // 320ms のシミュレーション
      setTimeout(() => {
        const endTime = Date.now();
        resolve({
          type: 'realtime',
          processingTime: endTime - startTime,
          cost: 36, // ¥36/分
          quality: 92,
          phases: [
            { name: 'WebSocket接続', time: 50 },
            { name: '統合処理', time: 270 },
            { name: '音声出力', time: 20 }
          ]
        });
      }, 320);
    });
  }

  async simulateIndividualImpl() {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      // 2.5秒のシミュレーション
      setTimeout(() => {
        const endTime = Date.now();
        resolve({
          type: 'individual',
          processingTime: endTime - startTime,
          cost: 12, // ¥12/分
          quality: 88,
          phases: [
            { name: '音声認識 (Whisper)', time: 800 },
            { name: 'LLM処理 (GPT-4)', time: 1200 },
            { name: '音声合成 (TTS)', time: 500 }
          ]
        });
      }, 2500);
    });
  }

  updateComparisonStatus(status) {
    const realtimeStatus = document.querySelector('.realtime-demo .status-indicator');
    const individualStatus = document.querySelector('.individual-demo .status-indicator');
    
    [realtimeStatus, individualStatus].forEach(statusEl => {
      if (statusEl) {
        statusEl.setAttribute('data-status', status);
        const statusText = statusEl.querySelector('.status-text');
        if (statusText) {
          switch(status) {
            case 'processing':
              statusText.textContent = '処理中...';
              break;
            case 'complete':
              statusText.textContent = '完了';
              break;
            case 'idle':
            default:
              statusText.textContent = '待機中';
          }
        }
      }
    });
  }

  displayResults(realtimeResult, individualResult) {
    // メトリクス表示
    document.getElementById('processing-time').textContent = 
      `${realtimeResult.processingTime}ms / ${individualResult.processingTime}ms`;
    
    document.getElementById('estimated-cost').textContent = 
      `${realtimeResult.cost} / ${individualResult.cost}`;
    
    document.getElementById('quality-score').textContent = 
      `${realtimeResult.quality} / ${individualResult.quality}`;


    // プロセス可視化
    this.visualizeProcesses(realtimeResult, individualResult);
    
    // フローチャートエリアの更新
    this.updateComparisonChart(realtimeResult, individualResult);
  }

  updateComparisonChart(realtimeResult, individualResult) {
    const comparisonPlaceholder = document.querySelector('.comparison-placeholder');
    if (comparisonPlaceholder) {
      comparisonPlaceholder.innerHTML = `
        <div class="comparison-chart">
          <h4>処理時間比較</h4>
          <div class="chart-bars">
            <div class="chart-item">
              <div class="chart-label">Realtime API</div>
              <div class="chart-bar realtime" style="width: ${(realtimeResult.processingTime / 3000) * 100}%">
                <span class="chart-value">${realtimeResult.processingTime}ms</span>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-label">個別実装</div>
              <div class="chart-bar individual" style="width: ${(individualResult.processingTime / 3000) * 100}%">
                <span class="chart-value">${individualResult.processingTime}ms</span>
              </div>
            </div>
          </div>
          
          <h4 style="margin-top: 1rem;">コスト比較</h4>
          <div class="cost-comparison">
            <div class="cost-item">
              <strong>Realtime API:</strong> ¥${realtimeResult.cost}/分
            </div>
            <div class="cost-item">
              <strong>個別実装:</strong> ¥${individualResult.cost}/分
            </div>
            <div class="cost-savings">
              個別実装は ${Math.round(((realtimeResult.cost - individualResult.cost) / realtimeResult.cost) * 100)}% 安い
            </div>
          </div>
        </div>
      `;
    }
  }

  visualizeProcesses(realtimeResult, individualResult) {
    const realtimeSteps = document.querySelectorAll('.realtime-demo .step');
    const individualSteps = document.querySelectorAll('.individual-demo .step');

    // Realtime API ステップをアニメーション
    realtimeSteps.forEach((step, index) => {
      setTimeout(() => {
        step.classList.add('processing');
        setTimeout(() => {
          step.classList.remove('processing');
          step.style.borderLeftColor = 'var(--success-color)';
        }, 100);
      }, index * 50);
    });

    // 個別実装ステップをアニメーション
    individualSteps.forEach((step, index) => {
      setTimeout(() => {
        step.classList.add('processing');
        setTimeout(() => {
          step.classList.remove('processing');
          step.style.borderLeftColor = 'var(--success-color)';
        }, individualResult.phases[index]?.time || 500);
      }, index * 800);
    });
  }

  resetDemo() {
    this.isRecording = false;
    this.isComparing = false;
    this.audioData = null;

    // UI リセット
    const recordBtn = document.querySelector('.record-btn');
    recordBtn.textContent = '🎙️ 録音開始';
    recordBtn.style.background = 'var(--primary-color)';

    const waveformArea = document.querySelector('.waveform-placeholder');
    waveformArea.textContent = '音声波形がここに表示されます';

    const fileInput = document.querySelector('.file-input');
    fileInput.value = '';

    // メトリクス リセット
    document.getElementById('processing-time').textContent = '--';
    document.getElementById('estimated-cost').textContent = '--';
    document.getElementById('quality-score').textContent = '--';


    // ステータス リセット
    this.updateComparisonStatus('idle');

    // プロセスステップ リセット
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('processing');
      step.style.borderLeftColor = 'var(--primary-color)';
    });

    // 比較チャート リセット
    const comparisonPlaceholder = document.querySelector('.comparison-placeholder');
    if (comparisonPlaceholder) {
      comparisonPlaceholder.textContent = '比較結果がここに表示されます';
    }

    console.log('デモをリセットしました');
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  new VoiceComparisonDemo();
});
