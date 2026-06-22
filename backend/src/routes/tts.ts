import express from 'express';

const router = express.Router();

router.get('/japanese', async (req, res) => {
  const text = String(req.query.text || '').trim();

  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  if (text.length > 120) {
    return res.status(400).json({ error: 'Text is too long' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = new URL('https://translate.google.com/translate_tts');
    url.searchParams.set('ie', 'UTF-8');
    url.searchParams.set('client', 'tw-ob');
    url.searchParams.set('tl', 'ja');
    url.searchParams.set('q', text);

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 japanese-learning-app'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch speech audio' });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(audio);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    res.status(timedOut ? 504 : 500).json({
      error: timedOut ? 'Speech service timed out' : 'Failed to generate speech audio'
    });
  }
});

export = router;
