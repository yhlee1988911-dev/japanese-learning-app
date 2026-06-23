import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

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

/** 将文本转为安全的文件名（只保留字母数字下划线） */
const textToKey = (text: string): string => {
  // 用 base64 编码作为 key，避免特殊字符问题
  // 但 base64 可能包含 /+=，需要替换
  const encoded = Buffer.from(text, 'utf-8').toString('base64url');
  return `tts/${encoded}.mp3`;
};

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const headers = getCorsHeaders(event.headers.origin);

  // 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
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
    // 使用 Netlify Blob Storage 做缓存
    const store = getStore('tts-cache');
    const cacheKey = textToKey(text);

    // 1. 先检查缓存
    const cachedBlob = await store.get(cacheKey, { type: 'arrayBuffer' }).catch(() => null);
    if (cachedBlob) {
      console.log(`TTS cache HIT: "${text}" (${cacheKey})`);
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Cache': 'HIT',
        },
        body: Buffer.from(cachedBlob).toString('base64'),
        isBase64Encoded: true,
      };
    }

    console.log(`TTS cache MISS: "${text}" — fetching from Google`);

    // 2. 缓存未命中，从 Google TTS 获取
    const url = new URL('https://translate.google.com/translate_tts');
    url.searchParams.set('ie', 'UTF-8');
    url.searchParams.set('client', 'tw-ob');
    url.searchParams.set('tl', 'ja');
    url.searchParams.set('q', text);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JapaneseLearningApp/1.0)',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error('Google TTS error:', response.status, response.statusText);
      return { statusCode: 502, headers, body: 'Failed to fetch speech audio' };
    }

    const audioBuffer = await response.arrayBuffer();

    // 3. 写入缓存（异步，不阻塞响应）
    store.set(cacheKey, Buffer.from(audioBuffer), {
      metadata: { contentType: 'audio/mpeg' },
    }).catch((err: unknown) => {
      console.error('TTS cache write failed:', err);
    });

    console.log(`TTS cached: "${text}" (${cacheKey})`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-TTS-Cache': 'MISS',
      },
      body: Buffer.from(audioBuffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    console.error('Google TTS request failed:', timedOut ? 'timeout' : error);
    return {
      statusCode: timedOut ? 504 : 502,
      headers,
      body: timedOut ? 'Speech service timed out' : 'TTS service unavailable',
    };
  }
};

export { handler };
