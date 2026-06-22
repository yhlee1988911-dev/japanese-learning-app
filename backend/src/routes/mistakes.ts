import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data', 'generated');
const MISTAKES_FILE = path.join(DATA_DIR, 'mistakes.json');

interface MistakeRecord {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: string;
  lessonTitle?: string;
  wrongCount: number;
  lastWrongAt: string;
  firstWrongAt: string;
}

const readMistakes = (): MistakeRecord[] => {
  try {
    if (!fs.existsSync(MISTAKES_FILE)) return [];
    const raw = fs.readFileSync(MISTAKES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeMistakes = (data: MistakeRecord[]) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(MISTAKES_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// GET /api/mistakes — 获取所有错题
router.get('/', (_req, res) => {
  const mistakes = readMistakes();
  // 按错误次数降序排列
  mistakes.sort((a, b) => b.wrongCount - a.wrongCount);
  res.json(mistakes);
});

// POST /api/mistakes — 记录一道错题
router.post('/', (req, res) => {
  const { kanji, hiragana, romaji, meaning, level, lessonTitle } = req.body;

  if (!kanji || !hiragana || !meaning) {
    return res.status(400).json({ error: '缺少必要字段 (kanji, hiragana, meaning)' });
  }

  const mistakes = readMistakes();
  const now = new Date().toISOString();
  const existing = mistakes.find(m => m.kanji === kanji && m.hiragana === hiragana);

  if (existing) {
    existing.wrongCount += 1;
    existing.lastWrongAt = now;
  } else {
    mistakes.push({
      kanji,
      hiragana,
      romaji: romaji || '',
      meaning,
      level: level || 'N5',
      lessonTitle: lessonTitle || '',
      wrongCount: 1,
      lastWrongAt: now,
      firstWrongAt: now
    });
  }

  writeMistakes(mistakes);
  res.json({ success: true, total: mistakes.length });
});

// DELETE /api/mistakes — 清空错题
router.delete('/', (_req, res) => {
  writeMistakes([]);
  res.json({ success: true, message: '错题已清空' });
});

// DELETE /api/mistakes/:id — 删除单条错题
router.delete('/:id', (req, res) => {
  const mistakes = readMistakes();
  const id = decodeURIComponent(req.params.id);
  const filtered = mistakes.filter(m => `${m.kanji}:${m.hiragana}` !== id);
  if (filtered.length === mistakes.length) {
    return res.status(404).json({ error: '未找到该错题' });
  }
  writeMistakes(filtered);
  res.json({ success: true });
});

export = router;
