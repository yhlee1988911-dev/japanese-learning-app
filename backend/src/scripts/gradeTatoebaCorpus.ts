import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { toRomaji } from 'wanakana';
import { JapaneseLevel } from '../data/sentenceData';

const BATCH_SIZE = 10_000;
const levels: JapaneseLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const rootDir = path.resolve(__dirname, '../../..');
const jlptDir = path.join(rootDir, 'raw', 'jlpt');
const generatedCorpusPath = path.join(rootDir, 'backend', 'src', 'data', 'generated', 'openCorpus.json');

interface JlptEntry {
  expression: string;
  reading: string;
  meaningEn: string;
  level: JapaneseLevel;
}

interface PairRecord {
  japanese: { id: number; text: string };
  chinese: { id: number; text: string };
  source: { name: string; url: string; license: string };
}

interface GradedSentence {
  id: string;
  sentence: string;
  speech: string;
  answers: string[];
  meaning: string;
  explanation: string;
  level: JapaneseLevel;
  source: PairRecord['source'];
}

interface TrieNode {
  children: Map<string, TrieNode>;
  entries: JlptEntry[];
}

const getArgument = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
};

const perLevelLimit = Math.min(100, Math.max(1, Number(getArgument('per-level') || 20)));
const resetGraded = getArgument('reset') === 'true';

const readLines = (file: string) => readline.createInterface({
  input: createReadStream(file, { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
  crlfDelay: Infinity
});

const findLatestInputChunk = async () => {
  const explicitInput = getArgument('input');
  if (explicitInput) return path.resolve(rootDir, explicitInput);

  const processedDir = path.join(rootDir, 'raw', 'processed');
  const runs = (await fs.readdir(processedDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('run-'))
    .map(entry => entry.name)
    .sort()
    .reverse();

  for (const run of runs) {
    const chunk = path.join(processedDir, run, 'chunks', 'chunk-000000.jsonl');
    try {
      await fs.access(chunk);
      return chunk;
    } catch {
      // Continue to the next completed processing run.
    }
  }
  throw new Error('No processed Tatoeba chunk found. Run process:tatoeba first.');
};

const ensureJlptFiles = async () => {
  await fs.mkdir(jlptDir, { recursive: true });
  for (const level of levels) {
    const file = path.join(jlptDir, `${level.toLowerCase()}.csv`);
    try {
      await fs.access(file);
      continue;
    } catch {
      const url = `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/${level.toLowerCase()}.csv`;
      const response = await fetch(url, { headers: { 'User-Agent': 'japanese-learning-app corpus grader' } });
      if (!response.ok || !response.body) throw new Error(`Failed to download ${level} vocabulary: ${response.status}`);
      await pipeline(Readable.fromWeb(response.body as any), createWriteStream(file, { flags: 'wx' }));
    }
  }
};

const isSuitableEntry = (expression: string, reading: string, level: JapaneseLevel) => {
  if (expression.length < 1 || expression.length > 12) return false;
  if (/^[ぁ-ゖァ-ヺ]$/.test(expression)) return false;
  if (/[〜～()（）\s]/.test(expression) || /[〜～()（）\s]/.test(reading)) return false;
  if (level === 'N1' && /^[\u3400-\u9fff]$/.test(expression)) return false;
  if (level === 'N1' && /^[ぁ-ゖ]+$/.test(expression) && /って$/.test(expression)) return false;
  return true;
};

const cleanReading = (expression: string, reading: string) => (
  /^[\u3400-\u9fff]+$/.test(expression) && reading.endsWith('する')
    ? reading.slice(0, -2)
    : reading
);

const loadJlptEntries = async () => {
  const candidates = new Map<string, { entry: JlptEntry; readings: Set<string> }>();
  const allReadings = new Map<string, Set<string>>();

  for (const level of levels) {
    const parser = createReadStream(path.join(jlptDir, `${level.toLowerCase()}.csv`))
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }));

    for await (const row of parser) {
      const expression = String(row.expression || '').trim();
      const rawReading = String(row.reading || '').trim();
      const meaningEn = String(row.meaning || '').trim();
      const reading = cleanReading(expression, rawReading);
      if (expression && reading && !/[〜～()（）\s]/.test(expression) && !/[〜～()（）\s]/.test(reading)) {
        const readings = allReadings.get(expression) || new Set<string>();
        readings.add(reading);
        allReadings.set(expression, readings);
      }
      if (!expression || !reading || !meaningEn || !isSuitableEntry(expression, reading, level)) continue;
      const existing = candidates.get(expression);
      if (existing) {
        existing.readings.add(reading);
      } else {
        candidates.set(expression, {
          entry: { expression, reading, meaningEn, level },
          readings: new Set([reading])
        });
      }
    }
  }
  return Array.from(candidates.values())
    .filter(candidate => candidate.readings.size === 1)
    .filter(candidate => (allReadings.get(candidate.entry.expression)?.size || 0) === 1)
    .map(candidate => candidate.entry);
};

const buildTrie = (entries: JlptEntry[]) => {
  const root: TrieNode = { children: new Map(), entries: [] };
  for (const entry of entries) {
    let node = root;
    for (const character of entry.expression) {
      let child = node.children.get(character);
      if (!child) {
        child = { children: new Map(), entries: [] };
        node.children.set(character, child);
      }
      node = child;
    }
    node.entries.push(entry);
  }
  return root;
};

const allowedBefore = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', '、', '。', '！', '？', '「', '（']);
const allowedAfter = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', 'か', 'な', 'だ', '、', '。', '！', '？', '」', '）']);
const japaneseCharacter = /[\u3040-\u30ff\u3400-\u9fff]/;

const hasUsefulBoundary = (text: string, start: number, expression: string) => {
  const before = text[start - 1];
  const after = text[start + expression.length];
  if (before && japaneseCharacter.test(before) && !allowedBefore.has(before)) return false;
  if (after && japaneseCharacter.test(after) && !allowedAfter.has(after)) return false;
  if (/^[\u3400-\u9fff]$/.test(expression) && after && /^[ぁ-ゖ]$/.test(after) && !/[はがをにでとのへもやか]/.test(after)) {
    return false;
  }
  if (/^[ぁ-ゖ]+$/.test(expression) && /[がはをにでとの]$/.test(expression) && before && !/[、。！？「（]/.test(before)) {
    return false;
  }
  return true;
};

const findMatches = (text: string, trie: TrieNode) => {
  const matches: JlptEntry[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < text.length; start += 1) {
    let node = trie;
    for (let index = start; index < text.length; index += 1) {
      const child = node.children.get(text[index]);
      if (!child) break;
      node = child;
      for (const entry of node.entries) {
        const key = `${entry.level}:${entry.expression}:${entry.reading}`;
        if (!seen.has(key) && hasUsefulBoundary(text, start, entry.expression)) {
          seen.add(key);
          matches.push(entry);
        }
      }
    }
  }

  return matches.sort((left, right) => right.expression.length - left.expression.length);
};

const isUsefulPair = (pair: PairRecord) => (
  Number.isSafeInteger(pair.japanese?.id)
  && Number.isSafeInteger(pair.chinese?.id)
  && pair.japanese.text.length >= 5
  && pair.japanese.text.length <= 60
  && pair.chinese.text.length >= 2
  && pair.chinese.text.length <= 100
  && !/https?:\/\//i.test(pair.japanese.text)
  && !/https?:\/\//i.test(pair.chinese.text)
);

const gradeChunk = async (
  input: string,
  output: string,
  trie: TrieNode,
  existingIds: Set<string>,
  existingSpeech: Set<string>
) => {
  const counts = new Map<JapaneseLevel, number>(levels.map(level => [level, 0]));
  const selected: GradedSentence[] = [];
  const seenMeaningTargets = new Set<string>();
  const targetCounts = new Map<string, number>();
  let rowsRead = 0;

  for await (const line of readLines(input)) {
    if (rowsRead >= BATCH_SIZE) break;
    rowsRead += 1;

    let pair: PairRecord;
    try {
      pair = JSON.parse(line) as PairRecord;
    } catch {
      continue;
    }
    if (!isUsefulPair(pair)) continue;
    if (existingSpeech.has(pair.japanese.text)) continue;

    const match = findMatches(pair.japanese.text, trie)
      .find(entry => (
        (counts.get(entry.level) || 0) < perLevelLimit
        && (targetCounts.get(`${entry.level}:${entry.expression}`) || 0) < 2
      ));
    if (!match) continue;
    const meaningTargetKey = `${pair.chinese.text}:${match.expression}`;
    if (seenMeaningTargets.has(meaningTargetKey)) continue;

    const id = `tatoeba-graded-${pair.japanese.id}-${match.expression}`;
    if (existingIds.has(id)) continue;
    const question: GradedSentence = {
      id,
      sentence: pair.japanese.text.replace(match.expression, '___'),
      speech: pair.japanese.text,
      answers: Array.from(new Set([match.expression, match.reading, toRomaji(match.reading)])),
      meaning: pair.chinese.text,
      explanation: `${match.expression}（${match.reading}）：${match.meaningEn}`,
      level: match.level,
      source: pair.source
    };
    selected.push(question);
    existingIds.add(id);
    existingSpeech.add(pair.japanese.text);
    seenMeaningTargets.add(meaningTargetKey);
    const targetKey = `${match.level}:${match.expression}`;
    targetCounts.set(targetKey, (targetCounts.get(targetKey) || 0) + 1);
    counts.set(match.level, (counts.get(match.level) || 0) + 1);

    if (levels.every(level => (counts.get(level) || 0) >= perLevelLimit)) break;
  }

  await fs.writeFile(output, `${selected.map(item => JSON.stringify(item)).join('\n')}\n`, 'utf8');
  return { rowsRead, selected, counts: Object.fromEntries(counts) };
};

const mergeIntoAppCorpus = async (sentences: GradedSentence[]) => {
  const corpus = JSON.parse(await fs.readFile(generatedCorpusPath, 'utf8')) as {
    updatedAt: string | null;
    vocabulary: unknown[];
    sentences: GradedSentence[];
  };
  const byId = new Map(corpus.sentences.map(item => [item.id, item]));
  for (const sentence of sentences) byId.set(sentence.id, sentence);
  corpus.sentences = Array.from(byId.values());
  corpus.updatedAt = new Date().toISOString();
  await fs.writeFile(generatedCorpusPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
  return corpus.sentences.length;
};

const run = async () => {
  const input = await findLatestInputChunk();
  await ensureJlptFiles();
  const entries = await loadJlptEntries();
  const trie = buildTrie(entries);
  const corpus = JSON.parse(await fs.readFile(generatedCorpusPath, 'utf8')) as { sentences: GradedSentence[] };
  if (resetGraded) {
    corpus.sentences = corpus.sentences.filter(item => !item.id.startsWith('tatoeba-graded-'));
    const fullCorpus = JSON.parse(await fs.readFile(generatedCorpusPath, 'utf8')) as {
      updatedAt: string | null;
      vocabulary: unknown[];
      sentences: GradedSentence[];
    };
    fullCorpus.sentences = fullCorpus.sentences.filter(item => !item.id.startsWith('tatoeba-graded-'));
    await fs.writeFile(generatedCorpusPath, `${JSON.stringify(fullCorpus, null, 2)}\n`, 'utf8');
  }
  const existingIds = new Set(corpus.sentences.map(item => item.id));
  const existingSpeech = new Set(corpus.sentences.map(item => item.speech));

  const runDir = path.join(rootDir, 'raw', 'graded', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await fs.mkdir(runDir, { recursive: true });
  const output = path.join(runDir, 'graded-chunk-000000.jsonl');
  const result = await gradeChunk(input, output, trie, existingIds, existingSpeech);
  const totalSentenceCount = await mergeIntoAppCorpus(result.selected);
  const manifest = {
    input,
    output,
    batchSize: BATCH_SIZE,
    perLevelLimit,
    jlptEntryCount: entries.length,
    rowsRead: result.rowsRead,
    selectedByLevel: result.counts,
    selectedCount: result.selected.length,
    appCorpusSentenceCount: totalSentenceCount
  };
  await fs.writeFile(path.join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
};

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
