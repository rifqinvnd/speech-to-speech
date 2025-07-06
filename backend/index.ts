import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { FastifyRequest } from 'fastify';
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';
import type { Response as FetchResponse } from 'node-fetch';
import OpenAI from 'openai';

dotenv.config();

async function start() {
  const fastify = Fastify({ logger: true });

  // Register WebSocket plugin first, before CORS
  console.log('🔧 Registering WebSocket plugin...');
  await fastify.register(websocketPlugin, {
    options: {
      clientTracking: true
    }
  });
  console.log('✅ WebSocket plugin registered successfully');

  fastify.register(multipart);
  fastify.register(cors, {
    origin: true,
    credentials: true
  });

// Initialize OpenAI client (only if API key is available)
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// REST endpoint for Modular flow (stub)
// --- Modular Speech-to-Speech Logic ---

// Helper for fetch with timeout
async function fetchWithTimeout(resource: string, options: any = {}, timeoutMs = 15000): Promise<FetchResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    throw new Error(`Fetch to ${resource} failed or timed out: ${err}`);
  } finally {
    clearTimeout(id);
  }
}

// Placeholder: OpenAI Whisper STT
async function openaiWhisperSTT(audioBuffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  let mimeType = 'audio/webm';
  if (filename.endsWith('.ogg')) mimeType = 'audio/ogg';
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  fastify.log.info({ filename, mimeType }, '[openaiWhisperSTT] Sending audio to Whisper');
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData as any
    });
    fastify.log.info('[openaiWhisperSTT] Received response from Whisper');
    if (!res.ok) throw new Error(`OpenAI Whisper STT failed: ${res.status} ${res.statusText}`);
    const data = await res.json() as any;
    fastify.log.info({ data }, '[openaiWhisperSTT] Whisper response JSON');
    const result = data.text || '';
    fastify.log.info({ result, resultLength: result.length }, '[openaiWhisperSTT] Final transcript');
    return result;
  } catch (err) {
    fastify.log.error({ err }, '[openaiWhisperSTT] Error');
    throw err;
  }
}

// Placeholder: Google STT
async function googleSTT(audioBuffer: Buffer): Promise<string> {
  // TODO: Call Google STT API
  return '[Transcript from Google STT]';
}

// Placeholder: GPT-4o LLM
async function gpt4oLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  fastify.log.info({ prompt }, '[gpt4oLLM] Sending prompt to GPT-4o');
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful voice assistant.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    fastify.log.info('[gpt4oLLM] Received response from GPT-4o');
    if (!res.ok) throw new Error(`OpenAI GPT-4o failed: ${res.status} ${res.statusText}`);
    const data = await res.json() as any;
    fastify.log.info({ data }, '[gpt4oLLM] GPT-4o response JSON');
    const result = data.choices?.[0]?.message?.content || '';
    fastify.log.info({ result, resultLength: result.length }, '[gpt4oLLM] Final LLM response');
    return result;
  } catch (err) {
    fastify.log.error({ err }, '[gpt4oLLM] Error');
    throw err;
  }
}

// Placeholder: OpenAI TTS
async function openaiTTS(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  fastify.log.info({ text }, '[openaiTTS] Sending text to OpenAI TTS');
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova',
        response_format: 'mp3'
      })
    });
    fastify.log.info('[openaiTTS] Received response from OpenAI TTS');
    if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    fastify.log.info({ arrayBufferLength: arrayBuffer.byteLength }, '[openaiTTS] TTS arrayBuffer received');
    return Buffer.from(arrayBuffer);
  } catch (err) {
    fastify.log.error({ err }, '[openaiTTS] Error');
    throw err;
  }
}

// Placeholder: Google TTS
async function googleTTS(text: string): Promise<Buffer> {
  // TODO: Call Google TTS API
  return Buffer.from('');
}

fastify.addHook('onRequest', (request, reply, done) => {
  fastify.log.info({ method: request.method, url: request.url }, 'Incoming request');
  done();
});



fastify.post('/api/modular', async (request: FastifyRequest, reply) => {
  const start = Date.now();
  fastify.log.info('--- /api/modular handler START ---');
  fastify.log.info({ method: request.method, url: request.url, headers: request.headers }, 'Request received');
  fastify.log.info('Parsing multipart fields...');
  // Use streaming multipart API to extract fields
  let audioFile: { buffer: Buffer, filename: string } | null = null;
  let set: string | undefined = undefined;
  let partsError = null;
  let partsProcessed = 0;
  const PARTS_TIMEOUT_MS = 30000;
  if ((request as any).parts) {
    fastify.log.info('Entering for-await loop for multipart parts');
    const partsIterator = (request as any).parts();
    let timedOut = false;
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => {
      timedOut = true;
      reject(new Error('Multipart parsing timed out'));
    }, PARTS_TIMEOUT_MS));
    try {
      await Promise.race([
        (async () => {
          for await (const part of partsIterator) {
            partsProcessed++;
            fastify.log.info({ fieldname: part.fieldname, file: !!part.file }, 'Processing multipart part');
            if (part.file && part.fieldname === 'audio') {
              const buffer = await part.toBuffer();
              const filename = part.filename;
              audioFile = { buffer, filename };
              fastify.log.info('Audio file part found and consumed');
            } else if (!part.file && part.fieldname === 'set') {
              set = (part as any).value;
              fastify.log.info({ set }, 'Set field found');
            } else {
              // Log and skip any unexpected field
              fastify.log.warn({ fieldname: part.fieldname, file: !!part.file }, 'Skipping unexpected multipart field');
              // If it's a file, consume the stream to avoid hanging
              if (part.file && typeof part.file === 'object' && typeof part.file.resume === 'function') {
                part.file.resume();
              }
            }
          }
        })(),
        timeoutPromise
      ]);
      fastify.log.info({ partsProcessed }, 'Completed for-await loop for multipart parts');
    } catch (err) {
      partsError = err;
      fastify.log.error({ err }, 'Error or timeout during multipart parsing');
    }
    if (partsError) {
      fastify.log.info('--- /api/modular handler END (multipart error) ---');
      let errorMsg = 'Unknown error';
      if (partsError && typeof partsError === 'object' && 'message' in partsError) {
        errorMsg = (partsError as any).message;
      } else if (typeof partsError === 'string') {
        errorMsg = partsError;
      }
      return reply.status(400).send({ error: 'Error or timeout during multipart parsing', details: errorMsg });
    }
    if (timedOut) {
      fastify.log.info('--- /api/modular handler END (multipart timeout) ---');
      return reply.status(408).send({ error: 'Multipart parsing timed out' });
    }
  } else {
    fastify.log.error('No multipart parts iterator found on request');
    fastify.log.info('--- /api/modular handler END (no parts) ---');
    return reply.status(400).send({ error: 'No multipart parts iterator found on request' });
  }
  let wantAudio = false;
  if (request.query && (request.query as any).audio === '1') wantAudio = true;
  if (request.headers['accept'] && request.headers['accept'].includes('audio')) wantAudio = true;

  if (!audioFile || !set) {
    fastify.log.error('Missing audio or set field in request');
    fastify.log.info('--- /api/modular handler END (400) ---');
    return reply.status(400).send({ error: 'Missing audio or set' });
  }

  fastify.log.info('Reading audio buffer...');
  const audioBuffer: Buffer = (audioFile as { buffer: Buffer, filename: string }).buffer;
  const audioFilename: string = (audioFile as { buffer: Buffer, filename: string }).filename || 'audio.webm';
  fastify.log.info({ audioFilename, audioBufferLength: audioBuffer.length }, 'Audio buffer read');

  let transcript = '';
  let assistantReply = '';
  let ttsAudio: Buffer = Buffer.from('');

  try {
    if (set === 'set1') {
      fastify.log.info('Calling OpenAI Whisper STT');
      const sttStart = Date.now();
      const safeFilename = audioFilename || 'audio.webm';
      transcript = await openaiWhisperSTT(audioBuffer, safeFilename);
      fastify.log.info({ transcript, sttDuration: Date.now() - sttStart }, 'STT result');
      
      // If transcript is empty, provide a fallback
      if (!transcript || transcript.trim() === '') {
        transcript = '[No speech detected]';
        fastify.log.warn('STT returned empty transcript, using fallback');
      }
      fastify.log.info('Calling GPT-4o LLM');
      const llmStart = Date.now();
      assistantReply = await gpt4oLLM(transcript);
      fastify.log.info({ assistantReply, llmDuration: Date.now() - llmStart }, 'LLM result');
      fastify.log.info('Calling OpenAI TTS');
      const ttsStart = Date.now();
      ttsAudio = await openaiTTS(assistantReply);
      fastify.log.info({ ttsAudioLength: ttsAudio.length, ttsDuration: Date.now() - ttsStart }, 'TTS audio generated');
    } else if (set === 'set2') {
      fastify.log.info('Calling Google STT');
      const sttStart = Date.now();
      transcript = await googleSTT(audioBuffer);
      fastify.log.info({ transcript, sttDuration: Date.now() - sttStart }, 'STT result');
      fastify.log.info('Calling GPT-4o LLM');
      const llmStart = Date.now();
      assistantReply = await gpt4oLLM(transcript);
      fastify.log.info({ assistantReply, llmDuration: Date.now() - llmStart }, 'LLM result');
      fastify.log.info('Calling Google TTS');
      const ttsStart = Date.now();
      ttsAudio = await googleTTS(assistantReply);
      fastify.log.info({ ttsAudioLength: ttsAudio.length, ttsDuration: Date.now() - ttsStart }, 'TTS audio generated');
    } else {
      fastify.log.error('Invalid set value');
      fastify.log.info('--- /api/modular handler END (400) ---');
      return reply.status(400).send({ error: 'Invalid set' });
    }
    const duration = Date.now() - start;
    fastify.log.info({ duration }, 'Modular endpoint completed');
    // If client wants audio, return as audio/mp3
    if (wantAudio) {
      fastify.log.info('Sending audio/mpeg response');
      fastify.log.info('--- /api/modular handler END (audio) ---');
      reply.header('Content-Type', 'audio/mpeg');
      reply.header('Content-Disposition', 'inline; filename="assistant.mp3"');
      return reply.send(ttsAudio);
    }
    // Otherwise, return JSON
    fastify.log.info('Sending JSON response');
    fastify.log.info('--- /api/modular handler END (json) ---');
    // Debug logging
    fastify.log.info({ transcript, assistantReply }, 'Final response data');
    
    reply.send({
      transcript: `User: ${transcript} | AI Reply: ${assistantReply}`,
      userTranscript: transcript,
      aiReply: assistantReply,
      audioData: ttsAudio.toString('base64'),
      message: `[${set}] Transcript: ${transcript} | Reply: ${assistantReply}`
      // To get audio, send ?audio=1 or Accept: audio/mpeg
    });
  } catch (err) {
    fastify.log.error({ err }, 'Error in modular endpoint');
    fastify.log.info('--- /api/modular handler END (500) ---');
    let errorMsg = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err) {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    return reply.status(500).send({ error: 'Internal server error', details: errorMsg });
  }
});

// WebSocket proxy endpoint for OpenAI Realtime STS API
fastify.get('/ws/openai-realtime', { websocket: true }, (connection, req) => {
  fastify.log.info('WebSocket proxy connection established for OpenAI Realtime STS API');
  
  let openaiWs: any = null;
  let isOpenAIConnected = false;
  let pendingMessages: string[] = [];

  const socket = connection;
  
  if (!socket) {
    fastify.log.error('❌ No socket object found!');
    return;
  }

  // Connect to OpenAI Realtime API
  const connectToOpenAI = async () => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
      const WebSocket = require('ws');
      
      openaiWs = new WebSocket(url, {
        headers: {
          "Authorization": "Bearer " + apiKey,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      openaiWs.on('open', () => {
        fastify.log.info('✅ Connected to OpenAI Realtime API');
        isOpenAIConnected = true;
        socket.send(JSON.stringify({ type: 'connected' }));
        
        // Send any pending messages
        while (pendingMessages.length > 0) {
          const message = pendingMessages.shift();
          if (message) {
            fastify.log.info('📤 Sending pending message to OpenAI:', message);
            openaiWs.send(message);
          }
        }
      });

      openaiWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          fastify.log.info('📨 OpenAI message:', message);
          
          // Handle specific message types
          switch (message.type) {
            case 'response.audio.delta': {
              // Forward audio delta to client
              socket.send(JSON.stringify(message));
              break;
            }
            case 'response.audio.done': {
              // Forward audio done to client
              socket.send(JSON.stringify(message));
              break;
            }
            default: {
              // Forward all other messages to client
              socket.send(JSON.stringify(message));
            }
          }
        } catch (error) {
          fastify.log.error('Error parsing OpenAI message:', error);
        }
      });

      openaiWs.on('error', (error: any) => {
        fastify.log.error('OpenAI WebSocket error:', error);
        isOpenAIConnected = false;
        socket.send(JSON.stringify({ type: 'error', message: error.message }));
      });

      openaiWs.on('close', () => {
        fastify.log.info('OpenAI WebSocket closed');
        isOpenAIConnected = false;
        socket.send(JSON.stringify({ type: 'disconnected' }));
      });

    } catch (error) {
      fastify.log.error('Failed to connect to OpenAI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.send(JSON.stringify({ type: 'error', message: errorMessage }));
    }
  };

  // Connect to OpenAI when client connects
  connectToOpenAI();
  
  socket.on('message', async (message: Buffer) => {
    try {
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);
      
      fastify.log.info('📤 Client message to OpenAI:', data);
      
      if (isOpenAIConnected && openaiWs && openaiWs.readyState === 1) { // WebSocket.OPEN
        openaiWs.send(messageStr);
      } else {
        fastify.log.info('⏳ OpenAI not ready yet, queuing message');
        pendingMessages.push(messageStr);
        socket.send(JSON.stringify({ type: 'queued', message: 'Message queued, waiting for OpenAI connection' }));
      }
      
    } catch (error) {
      fastify.log.error('Error processing client message:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  socket.on('close', () => {
    fastify.log.info('Client WebSocket connection closed');
    if (openaiWs) {
      openaiWs.close();
    }
  });
  
  socket.on('error', (error: any) => {
    fastify.log.error('Client WebSocket error:', error);
  });
});

  fastify.listen({ port: 3001 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Backend listening at ${address}`);
  });
}

start().catch(console.error);