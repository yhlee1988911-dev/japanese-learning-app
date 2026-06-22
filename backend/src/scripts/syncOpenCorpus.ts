import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { toRomaji } from 'wanakana';
import { JapaneseLevel } from '../data/sentenceData';

interface SourceMeta {
  name: string;
  url: string;
  license: string;
  author?: string;
  translationAuthor?: string;
}

interface SyncedVocabulary {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  meaningEn: string;
  level: JapaneseLevel;
  source: SourceMeta;
}

interface SyncedSentence {
  id: string;
  sentence: string;
  speech: string;
  answers: string[];
  meaning: string;
  explanation: string;
  level: JapaneseLevel;
  source: SourceMeta;
}

interface CorpusFile {
  updatedAt: string | null;
  vocabulary: SyncedVocabulary[];
  sentences: SyncedSentence[];
}

interface CsvRow {
  expression: string;
  reading: string;
  meaning: string;
}

interface TatoebaTranslation {
  id: number;
  text: string;
  lang: string;
  script?: string | null;
  license: string;
  owner: string;
  is_unapproved: boolean;
  is_direct: boolean;
}

interface TatoebaSentence {
  id: number;
  text: string;
  license: string;
  owner: string;
  is_unapproved: boolean;
  translations: TatoebaTranslation[];
}

const outputPath = path.resolve(__dirname, '../data/generated/openCorpus.json');
const allLevels: JapaneseLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const getArgument = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
};

const requestedLevels = (getArgument('levels') || allLevels.join(','))
  .split(',')
  .map(level => level.toUpperCase())
  .filter((level): level is JapaneseLevel => allLevels.includes(level as JapaneseLevel));
const limitPerLevel = Math.min(50, Math.max(1, Number(getArgument('limit') || 8)));
const japaneseCharacter = /[\u3040-\u30ff\u3400-\u9fff]/;
const allKanji = /^[\u3400-\u9fff]+$/;
const allowedBefore = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', '、', '。', '！', '？', '「', '（']);
const allowedAfter = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', 'か', 'な', 'だ', 'です', '、', '。', '！', '？', '」', '）']);

const isSuitableVocabulary = (expression: string) => (
  expression.length >= 1
  && expression.length <= 12
  && !/[〜～()（）\s]/.test(expression)
);

const hasUsefulWordBoundary = (text: string, expression: string) => {
  const index = text.indexOf(expression);
  if (index < 0) return false;

  const before = text[index - 1];
  const after = text[index + expression.length];
  if (before && japaneseCharacter.test(before) && !allowedBefore.has(before)) return false;
  if (after && japaneseCharacter.test(after)) {
    if (!allowedAfter.has(after)) return false;
    if (allKanji.test(expression) && /[いきくけこしすせそちつてとなぬねのひふへほみむめもりるれろ]/.test(after) && !['な', 'の'].includes(after)) {
      return false;
    }
  }
  return true;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'japanese-learning-app corpus sync' }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
};

const translateMeaning = async (meaning: string) => {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', 'zh-CN');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', meaning);
  const data = await fetchJson<any[]>(url.toString());
  return Array.isArray(data[0])
    ? data[0].map((part: any[]) => String(part[0] || '')).join('').trim()
    : meaning;
};

const findTatoebaPair = async (expression: string) => {
  const url = new URL('https://api.tatoeba.org/v1/sentences');
  url.searchParams.set('lang', 'jpn');
  url.searchParams.set('q', expression);
  url.searchParams.set('trans:lang', 'cmn');
  url.searchParams.set('trans:is_unapproved', 'no');
  url.searchParams.set('sort', 'words');
  url.searchParams.set('limit', '10');

  const response = await fetchJson<{ data: TatoebaSentence[] }>(url.toString());
  for (const sentence of response.data) {
    if (sentence.is_unapproved || !hasUsefulWordBoundary(sentence.text, expression)) continue;
    if (sentence.text.length < 5 || sentence.text.length > 48) continue;

    const translations = sentence.translations.filter(item => item.lang === 'cmn' && !item.is_unapproved);
    const translation = translations.find(item => item.script === 'Hans' && item.is_direct)
      || translations.find(item => item.script === 'Hans')
      || translations.find(item => item.is_direct)
      || translations[0];

    if (translation) return { sentence, translation };
  }

  return null;
};

const readCorpus = async (): Promise<CorpusFile> => {
  try {
    return JSON.parse(await fs.readFile(outputPath, 'utf8')) as CorpusFile;
  } catch {
    return { updatedAt: null, vocabulary: [], sentences: [] };
  }
};

const processRow = async (row: CsvRow, level: JapaneseLevel) => {
  const expression = row.expression.trim();
  const reading = row.reading.trim() || expression;
  const romaji = toRomaji(reading);
  const [meaning, pair] = await Promise.all([
    translateMeaning(row.meaning),
    findTatoebaPair(expression)
  ]);

  const vocabulary: SyncedVocabulary = {
    kanji: expression,
    hiragana: reading,
    romaji,
    meaning,
    meaningEn: row.meaning,
    level,
    source: {
      name: 'Open Anki JLPT Decks',
      url: `https://github.com/jamsinclair/open-anki-jlpt-decks/blob/main/src/${level.toLowerCase()}.csv`,
      license: 'MIT'
    }
  };

  if (!pair) return { vocabulary, sentence: null };

  const { sentence: original, translation } = pair;
  const sentence: SyncedSentence = {
    id: `tatoeba-${original.id}-${expression}`,
    sentence: original.text.replace(expression, '___'),
    speech: original.text,
    answers: Array.from(new Set([expression, reading, romaji].filter(Boolean))),
    meaning: translation.text,
    explanation: `${expression}（${reading}）：${meaning}`,
    level,
    source: {
      name: 'Tatoeba',
      url: `https://tatoeba.org/en/sentences/show/${original.id}`,
      license: `${original.license}; translation: ${translation.license}`,
      author: original.owner,
      translationAuthor: translation.owner
    }
  };

  return { vocabulary, sentence };
};

const run = async () => {
  const corpus = await readCorpus();
  const vocabularyByKey = new Map(
    corpus.vocabulary
      .filter(item => isSuitableVocabulary(item.kanji))
      .map(item => [`${item.level}:${item.kanji}:${item.hiragana}`, item])
  );
  const sentenceById = new Map(
    corpus.sentences
      .filter(item => hasUsefulWordBoundary(item.speech, item.answers[0] || ''))
      .map(item => [item.id, item])
  );

  for (const level of requestedLevels) {
    const csvUrl = `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/${level.toLowerCase()}.csv`;
    const response = await fetch(csvUrl, { headers: { 'User-Agent': 'japanese-learning-app corpus sync' } });
    if (!response.ok) throw new Error(`Failed to download ${level}: ${response.status}`);

    const rows = parse(await response.text(), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    }) as CsvRow[];
    const candidates = rows
      .filter(row => row.expression && row.reading && row.meaning)
      .filter(row => isSuitableVocabulary(row.expression.trim()))
      .filter(row => !vocabularyByKey.has(`${level}:${row.expression.trim()}:${row.reading.trim()}`))
      .slice(0, limitPerLevel);

    for (let index = 0; index < candidates.length; index += 4) {
      const batch = candidates.slice(index, index + 4);
      const results = await Promise.all(batch.map(async row => {
        try {
          return await processRow(row, level);
        } catch (error) {
          console.warn(`Skipped ${level} ${row.expression}:`, error instanceof Error ? error.message : error);
          return null;
        }
      }));

      for (const result of results) {
        if (!result) continue;
        const item = result.vocabulary;
        vocabularyByKey.set(`${item.level}:${item.kanji}:${item.hiragana}`, item);
        if (result.sentence) sentenceById.set(result.sentence.id, result.sentence);
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log(`${level}: added ${candidates.length} vocabulary candidates`);
  }

  const nextCorpus: CorpusFile = {
    updatedAt: new Date().toISOString(),
    vocabulary: Array.from(vocabularyByKey.values()),
    sentences: Array.from(sentenceById.values())
  };
  await fs.writeFile(outputPath, `${JSON.stringify(nextCorpus, null, 2)}\n`, 'utf8');
  console.log(`Saved ${nextCorpus.vocabulary.length} words and ${nextCorpus.sentences.length} Tatoeba sentences.`);
};

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
