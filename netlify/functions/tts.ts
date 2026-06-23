import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface TtsRequest {
  text: string;
}

const ALLOWED_ORIGINS = [
  'https://superlative-pudding-3a0b56.netlify.app',
  'http://localhost:3000',
  'http://localhost:8888',
];

const getCorsHeaders = (origin: string | undefined) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const headers = getCorsHeaders(event.headers.origin);

  // 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: 'OpenAI API key not configured' };
  }

  let body: TtsRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: 'Invalid JSON' };
  }

  const { text } = body;
  if (!text || typeof text !== 'string' || text.length > 200) {
    return { statusCode: 400, headers, body: 'Invalid text (max 200 chars)' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', response.status, errorText);
      return { statusCode: response.status, headers, body: errorText };
    }

    // 返回音频二进制数据
    const audioBuffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: Buffer.from(audioBuffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('OpenAI TTS request failed:', error);
    return { statusCode: 502, headers, body: 'TTS service unavailable' };
  }
};

export { handler };
