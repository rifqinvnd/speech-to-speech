# WebSocket Realtime Setup

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Enable realtime WebSocket functionality
ENABLE_REALTIME=1

# OpenAI API Key (required for realtime API)
OPENAI_API_KEY=your_openai_api_key_here
```

## Features

### WebSocket Endpoint
- **URL**: `ws://localhost:3001/ws/integrated`
- **Purpose**: Real-time audio processing with OpenAI Realtime API

### Message Types

#### Client to Server:
- `{ type: 'start' }` - Initialize realtime stream
- `{ type: 'audio', data: 'base64_audio_data' }` - Send audio chunk
- `{ type: 'stop' }` - Stop realtime stream

#### Server to Client:
- `{ type: 'ready' }` - Stream ready to receive audio
- `{ type: 'text_delta', content: 'text' }` - Real-time transcript
- `{ type: 'audio', data: 'base64_audio_data' }` - Audio response
- `{ type: 'end' }` - Stream ended
- `{ type: 'error', message: 'error_message' }` - Error occurred

## Frontend Integration

The frontend now includes:
1. **Realtime Button**: Start/stop real-time processing
2. **WebSocket Client**: Handles real-time communication
3. **Audio Streaming**: Sends audio chunks every 100ms

## Usage

1. Set up environment variables
2. Start the backend: `npm run dev`
3. Start the frontend: `cd ../frontend && npm run dev`
4. Click "🔴 Start Realtime" to begin real-time processing
5. Speak into the microphone
6. View real-time transcript updates
7. Click "⏹️ Stop Realtime" to end processing

## Notes

- Currently uses a mock implementation since OpenAI Realtime API is still in beta
- Will be updated when the official API is stable
- WebSocket connection is established on-demand
- Audio is streamed in 100ms chunks for low latency 