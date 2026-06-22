import express from 'express';
import { sentenceQuestions } from '../data/sentenceData';
import { openCorpusSentences, openCorpusUpdatedAt } from '../data/openCorpus';

const router = express.Router();

router.get('/level/:level', (req, res) => {
  const level = req.params.level.toUpperCase();
  const synced = openCorpusSentences.filter(question => question.level === level);
  const builtIn = sentenceQuestions.filter(question => question.level === level);
  const seen = new Set<string>();
  res.json([...synced, ...builtIn].filter(question => {
    const key = `${question.sentence}:${question.answers.join('/')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
});

router.get('/corpus/status', (_req, res) => {
  res.json({
    updatedAt: openCorpusUpdatedAt,
    sentenceCount: openCorpusSentences.length,
    source: 'Tatoeba'
  });
});

export = router;
