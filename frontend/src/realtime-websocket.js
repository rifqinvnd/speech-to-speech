// WebSocket client for real-time audio processing using OpenAI Realtime API
class RealtimeWebSocket {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isProcessing = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.onMessageCallback = null;
    this.onErrorCallback = null;
    this.onStatusChangeCallback = null;
  }

  async connect() {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔌 Attempting to connect to OpenAI Realtime API via backend proxy...');
        
        // Use our backend as a proxy for the WebSocket connection
        // This allows us to add headers on the server side
        const url = "ws://localhost:3001/ws/openai-realtime";
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('✅ Connected to OpenAI Realtime API');
          console.log('✅ WebSocket readyState:', this.ws.readyState);
          console.log('✅ WebSocket URL:', this.ws.url);
          this.isConnected = true;
          this.updateStatus('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          console.log('📨 Raw WebSocket message received:', event.data);
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Parsed WebSocket message:', data);
            
            // Handle connection status messages
            if (data.type === 'connected') {
              console.log('✅ Connected to OpenAI via proxy');
              this.updateStatus('connected');
            } else if (data.type === 'queued') {
              console.log('⏳ Message queued, waiting for OpenAI connection');
            } else if (data.type === 'disconnected') {
              console.log('❌ Disconnected from OpenAI');
              this.updateStatus('disconnected');
            }
            // Check if OpenAI returned audio and stop processing
            else if (data.type === 'message' && data.message && data.message.role === 'assistant') {
              const content = data.message.content;
              if (Array.isArray(content)) {
                const hasAudio = content.some(item => item.type === 'audio');
                if (hasAudio) {
                  console.log('🎵 OpenAI returned audio, stopping processing');
                  this.stopProcessing();
                }
              }
            }
            
            if (this.onMessageCallback) {
              this.onMessageCallback(data);
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
            console.error('❌ Raw message data:', event.data);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.isProcessing = false;
          this.updateStatus('disconnected');
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.updateStatus('error');
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }



  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isProcessing = false;
  }

  startProcessing() {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    // For STS, we don't need to send a start message
    // The session is established when we connect
    console.log('📤 Starting STS processing');
    console.log('📤 WebSocket readyState:', this.ws.readyState);
    console.log('📤 WebSocket URL:', this.ws.url);
    
    this.isProcessing = true;
    this.updateStatus('processing');
  }

  sendAudio(audioBuffer) {
    if (!this.isConnected || !this.isProcessing) {
      throw new Error('WebSocket not connected or not processing');
    }

    // Convert Uint8Array to base64 string
    const base64Data = btoa(String.fromCharCode.apply(null, audioBuffer));
    
    // OpenAI Realtime STS API conversation item create message format
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_audio", audio: base64Data }]
      }
    };
    const messageStr = JSON.stringify(message);
    console.log('📤 Sending audio message, size:', base64Data.length);
    console.log('📤 Audio message string length:', messageStr.length);
    console.log('📤 WebSocket readyState:', this.ws.readyState);
    
    try {
      this.ws.send(messageStr);
      console.log('✅ Audio message sent successfully');
    } catch (error) {
      console.error('❌ Error sending audio message:', error);
      throw error;
    }
  }

  stopProcessing() {
    if (this.ws && this.isConnected) {
      // OpenAI Realtime STS API response create message format
      const message = {
        type: "response.create",
        response: { 
          modalities: ["audio", "text"],
          instructions: "Assist the user via voice." 
        }
      };
      const messageStr = JSON.stringify(message);
      console.log('📤 Stop message string:', messageStr);
      console.log('📤 WebSocket readyState:', this.ws.readyState);
      
      try {
        this.ws.send(messageStr);
        console.log('✅ Stop message sent successfully');
      } catch (error) {
        console.error('❌ Error sending stop message:', error);
        throw error;
      }
    }
    this.isProcessing = false;
    this.updateStatus('idle');
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onStatusChange(callback) {
    this.onStatusChangeCallback = callback;
  }

  updateStatus(status) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  // Helper method to convert audio blob to buffer
  async blobToBuffer(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        // Convert ArrayBuffer to Uint8Array for browser compatibility
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };
      reader.readAsArrayBuffer(blob);
    });
  }
}

export default RealtimeWebSocket; 