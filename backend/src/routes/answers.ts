import express from 'express';

const router = express.Router();

interface VerifyRequest {
  userAnswer?: string;
  target?: {
    kanji?: string;
    hiragana?: string;
    romaji?: string;
    meaning?: string;
    answers?: string[];
    sentence?: string;
  };
}

const normalizeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ー－]/g, '-')
    .replace(/[。、，,.!！?？]/g, '');

const splitAlternatives = (value?: string) => {
  if (!value) return [];

  return value
    .split(/[\/／・,，、]/)
    .map(item => item.trim())
    .filter(Boolean);
};

const buildAcceptedAnswers = (target: VerifyRequest['target']) => {
  if (!target) return [];

  return [target.kanji, target.hiragana, target.romaji, ...(target.answers || [])]
    .flatMap(value => [value, ...splitAlternatives(value)])
    .filter((value): value is string => Boolean(value))
    .map(normalizeAnswer);
};

const verifyWithOllama = async (payload: Required<VerifyRequest>) => {
  if (process.env.ENABLE_AI_VERIFY !== 'true') {
    return null;
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        prompt: [
          'You are checking answers for a Japanese vocabulary memorization app.',
          'Return compact JSON only: {"correct":true|false,"reason":"short Chinese reason"}.',
          'Accept kanji, kana, common romaji, and obvious equivalent Japanese readings.',
          'Do not accept a different word just because the Chinese meaning is related.',
          `Target kanji: ${payload.target.kanji || ''}`,
          `Target kana: ${payload.target.hiragana || ''}`,
          `Target romaji: ${payload.target.romaji || ''}`,
          `Chinese meaning: ${payload.target.meaning || ''}`,
          `Sentence: ${payload.target.sentence || ''}`,
          `Other accepted answers: ${(payload.target.answers || []).join(' / ')}`,
          `User answer: ${payload.userAnswer}`
        ].join('\n')
      })
    });

    if (!response.ok) return null;

    const data = await response.json() as { response?: string };
    if (!data.response) return null;

    const parsed = JSON.parse(data.response) as { correct?: boolean; reason?: string };

    if (typeof parsed.correct !== 'boolean') return null;

    return {
      correct: parsed.correct,
      reason: parsed.reason || 'AI 复核完成'
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

router.post('/verify', async (req, res) => {
  const body = req.body as VerifyRequest;
  const userAnswer = body.userAnswer?.trim();
  const target = body.target;

  if (!userAnswer || !target) {
    return res.status(400).json({ error: 'Missing answer or target' });
  }

  const acceptedAnswers = buildAcceptedAnswers(target);
  const normalizedUserAnswer = normalizeAnswer(userAnswer);

  if (acceptedAnswers.includes(normalizedUserAnswer)) {
    return res.json({
      correct: true,
      method: 'rules',
      reason: '匹配标准答案'
    });
  }

  const aiResult = await verifyWithOllama({ userAnswer, target });

  if (aiResult) {
    return res.json({
      correct: aiResult.correct,
      method: 'ai',
      reason: aiResult.reason
    });
  }

  res.json({
    correct: false,
    method: 'rules',
    reason: process.env.ENABLE_AI_VERIFY === 'true'
      ? 'AI 复核暂不可用，已按本地规则判断'
      : '未匹配标准答案'
  });
});

export = router;
