import Fastify from 'fastify';
import websocketPlugin from 'fastify-websocket';
import dotenv from 'dotenv';
import multipart from 'fastify-multipart';
import { FastifyRequest } from 'fastify';
import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

dotenv.config();

const fastify = Fastify({ logger: true });
fastify.register(multipart, { attachFieldsToBody: true });

// REST endpoint for Modular flow (stub)
// --- Modular Speech-to-Speech Logic ---

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
  fastify.log.info({ filename, mimeType }, 'Sending audio to Whisper');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData as any
  });
  if (!res.ok) throw new Error('OpenAI Whisper STT failed');
  const data = await res.json() as any;
  return data.text || '';
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
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
  if (!res.ok) throw new Error('OpenAI GPT-4o failed');
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// Placeholder: OpenAI TTS
async function openaiTTS(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
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
  if (!res.ok) throw new Error('OpenAI TTS failed');
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
  // Use fields from request.body
  // @ts-ignore
  const audioFile = request.body.audio;
  // @ts-ignore
  const set = request.body.set;
  let wantAudio = false;
  // @ts-ignore
  if (request.body.audio === '1') wantAudio = true;
  if (request.query && (request.query as any).audio === '1') wantAudio = true;
  if (request.headers['accept'] && request.headers['accept'].includes('audio')) wantAudio = true;

  if (!audioFile || !set) {
    return reply.status(400).send({ error: 'Missing audio or set' });
  }

  const audioBuffer = await audioFile.toBuffer();
  const audioFilename = audioFile.filename || 'audio.webm';

  let transcript = '';
  let assistantReply = '';
  let ttsAudio: Buffer = Buffer.from('');

  try {
    if (set === 'set1') {
      fastify.log.info('Calling OpenAI Whisper STT');
      const safeFilename = audioFilename || 'audio.webm';
      transcript = await openaiWhisperSTT(audioBuffer, safeFilename);
      fastify.log.info({ transcript }, 'STT result');
      fastify.log.info('Calling GPT-4o LLM');
      assistantReply = await gpt4oLLM(transcript);
      fastify.log.info({ assistantReply }, 'LLM result');
      fastify.log.info('Calling OpenAI TTS');
      ttsAudio = await openaiTTS(assistantReply);
      fastify.log.info('TTS audio generated');
    } else if (set === 'set2') {
      fastify.log.info('Calling Google STT');
      transcript = await googleSTT(audioBuffer);
      fastify.log.info({ transcript }, 'STT result');
      fastify.log.info('Calling GPT-4o LLM');
      assistantReply = await gpt4oLLM(transcript);
      fastify.log.info({ assistantReply }, 'LLM result');
      fastify.log.info('Calling Google TTS');
      ttsAudio = await googleTTS(assistantReply);
      fastify.log.info('TTS audio generated');
    } else {
      return reply.status(400).send({ error: 'Invalid set' });
    }
    const duration = Date.now() - start;
    fastify.log.info({ duration }, 'Modular endpoint completed');
    // If client wants audio, return as audio/mp3
    if (wantAudio) {
      reply.header('Content-Type', 'audio/mpeg');
      reply.header('Content-Disposition', 'inline; filename="assistant.mp3"');
      return reply.send(ttsAudio);
    }
    // Otherwise, return JSON
    reply.send({
      transcript,
      assistantReply,
      message: `[${set}] Transcript: ${transcript} | Reply: ${assistantReply}`
      // To get audio, send ?audio=1 or Accept: audio/mpeg
    });
  } catch (err) {
    fastify.log.error({ err }, 'Error in modular endpoint');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// WebSocket endpoint for Integrated flow (stub)
// Only register websocket if realtime is enabled
if (process.env.ENABLE_REALTIME === '1') {
  fastify.register(websocketPlugin);
  fastify.get('/ws/integrated', { websocket: true }, (connection /*, req */) => {
    connection.socket.on('message', (message: string) => {
      // TODO: Proxy audio to OpenAI Realtime API and stream response
      connection.socket.send('WebSocket stub: received ' + message);
    });
  });
}

fastify.listen({ port: 3001 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Backend listening at ${address}`);
}); 