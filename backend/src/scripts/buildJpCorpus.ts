/**
 * buildJpCorpus.ts
 *
 * 从 raw/jlpt/（JLPT 分级词库）和 raw/sentences.csv（Tatoeba 717MB 语料库）
 * 生成 N1~N5 分级题库，支持断点续跑 + 去重。
 *
 * 中文释义来源：
 *   1. openCorpus.json（已有中文翻译的词汇）
 *   2. 未覆盖的词汇保留英文释义
 *
 * 用法：
 *   npx ts-node backend/src/scripts/buildJpCorpus.ts
 *   npx ts-node backend/src/scripts/buildJpCorpus.ts --vocab-only   # 只生成词汇
 *   npx ts-node backend/src/scripts/buildJpCorpus.ts --sentence-only # 只生成句子
 *   npx ts-node backend/src/scripts/buildJpCorpus.ts --reset        # 重新生成
 */

import { createReadStream, existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';
import { parse } from 'csv-parse';
import { toRomaji } from 'wanakana';

// ============================================================
// 类型定义
// ============================================================

type JapaneseLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

interface JlptEntry {
  expression: string;
  reading: string;
  meaningEn: string;
  level: JapaneseLevel;
}

interface VocabItem {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  meaningEn: string;
  level: JapaneseLevel;
}

interface SentenceItem {
  id: string;
  sentence: string;
  speech: string;
  answers: string[];
  meaning: string;
  meaningEn: string;
  explanation: string;
  level: JapaneseLevel;
  source: {
    name: string;
    url: string;
    license: string;
  };
}

// ============================================================
// 常量
// ============================================================

const LEVELS: JapaneseLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const ROOT_DIR = path.resolve(__dirname, '../../..');
const JLPT_DIR = path.join(ROOT_DIR, 'raw', 'jlpt');
const SENTENCE_FILE = path.join(ROOT_DIR, 'raw', 'sentences.csv');
const OUTPUT_DIR = path.join(ROOT_DIR, 'backend', 'src', 'data', 'generated');
const TMP_DIR = path.join(OUTPUT_DIR, 'tmp');
const OPEN_CORPUS_FILE = path.join(OUTPUT_DIR, 'openCorpus.json');

// 每块处理的行数（用于断点续跑）
const CHUNK_SIZE = 50_000;

// ============================================================
// 工具函数
// ============================================================

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const readLines = (file: string) =>
  readline.createInterface({
    input: createReadStream(file, { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });

const cleanReading = (expression: string, reading: string) =>
  /^[\u3400-\u9fff]+$/.test(expression) && reading.endsWith('する')
    ? reading.slice(0, -2)
    : reading;

const isSuitableEntry = (expression: string, reading: string) => {
  if (expression.length < 1 || expression.length > 12) return false;
  if (/^[ぁ-ゖァ-ヺ]$/.test(expression)) return false;
  if (/[〜～()（）\s]/.test(expression) || /[〜～()（）\s]/.test(reading)) return false;
  return true;
};

const escapeTs = (str: string): string => str.replace(/'/g, "\\'").replace(/\n/g, '\\n');

// ============================================================
// 翻译字典（从 openCorpus.json 加载）
// ============================================================

interface TranslationDict {
  /** kanji → 中文释义 */
  cn: Map<string, string>;
  /** 命中率统计 */
  hits: number;
  misses: number;
}

const loadTranslationDict = async (): Promise<TranslationDict> => {
  const dict: TranslationDict = { cn: new Map(), hits: 0, misses: 0 };

  if (!existsSync(OPEN_CORPUS_FILE)) {
    console.log('  ⚠️  openCorpus.json 不存在，将使用英文释义');
    return dict;
  }

  try {
    const raw = await fs.readFile(OPEN_CORPUS_FILE, 'utf8');
    const corpus = JSON.parse(raw);
    if (corpus.vocabulary && Array.isArray(corpus.vocabulary)) {
      for (const v of corpus.vocabulary) {
        if (v.kanji && v.meaning && v.meaning !== v.meaningEn) {
          dict.cn.set(v.kanji, v.meaning);
        }
      }
    }
    console.log(`  📖 加载翻译字典: ${dict.cn.size} 条中文释义`);
  } catch (e) {
    console.warn('  ⚠️  加载 openCorpus.json 失败，将使用英文释义');
  }

  return dict;
};

const translate = (dict: TranslationDict, expression: string, meaningEn: string): string => {
  const cn = dict.cn.get(expression);
  if (cn) {
    dict.hits++;
    return cn;
  }
  dict.misses++;
  return meaningEn;
};

// ============================================================
// 第一步：加载 JLPT 分级词库
// ============================================================

const loadJlptEntries = async (): Promise<JlptEntry[]> => {
  console.log('📖 加载 JLPT 分级词库...');
  const candidates = new Map<string, { entry: JlptEntry; readings: Set<string> }>();
  const allReadings = new Map<string, Set<string>>();

  for (const level of LEVELS) {
    const file = path.join(JLPT_DIR, `${level.toLowerCase()}.csv`);
    if (!existsSync(file)) {
      console.warn(`  ⚠️  文件不存在，跳过: ${file}`);
      continue;
    }

    let count = 0;
    const parser = createReadStream(file)
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

      if (!expression || !reading || !meaningEn || !isSuitableEntry(expression, reading)) continue;

      const existing = candidates.get(expression);
      if (existing) {
        existing.readings.add(reading);
      } else {
        candidates.set(expression, {
          entry: { expression, reading, meaningEn, level },
          readings: new Set([reading]),
        });
      }
      count++;
    }
    console.log(`  ✅ ${level}: ${count} 条候选`);
  }

  // 过滤：只保留唯一读音的条目
  const entries = Array.from(candidates.values())
    .filter(c => c.readings.size === 1)
    .filter(c => (allReadings.get(c.entry.expression)?.size || 0) === 1)
    .map(c => c.entry);

  console.log(`  📊 过滤后共 ${entries.length} 条（排除多音字）`);
  return entries;
};

// ============================================================
// 第二步：生成词汇题库（N1~N5 TS 文件）
// ============================================================

const generateVocabFiles = async (entries: JlptEntry[], dict: TranslationDict) => {
  console.log('\n📝 生成词汇题库...');

  // 按级别分组
  const byLevel = new Map<JapaneseLevel, VocabItem[]>();
  for (const level of LEVELS) byLevel.set(level, []);

  for (const entry of entries) {
    const romaji = toRomaji(entry.reading);
    const meaning = translate(dict, entry.expression, entry.meaningEn);
    byLevel.get(entry.level)?.push({
      kanji: entry.expression,
      hiragana: entry.reading,
      romaji,
      meaning,
      meaningEn: entry.meaningEn,
      level: entry.level,
    });
  }

  console.log(`  🌐 翻译统计: ${dict.hits} 条中文 + ${dict.misses} 条英文`);

  // 写入每个级别的 TS 文件
  for (const level of LEVELS) {
    const items = byLevel.get(level) || [];
    const filePath = path.join(OUTPUT_DIR, `vocab-${level.toLowerCase()}.ts`);
    const content = generateVocabTsContent(items, level);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`  ✅ ${level}: ${items.length} 条 → ${path.relative(ROOT_DIR, filePath)}`);
  }

  // 写入汇总索引文件
  const indexPath = path.join(OUTPUT_DIR, 'vocab-index.ts');
  const indexContent = generateVocabIndexContent(byLevel);
  await fs.writeFile(indexPath, indexContent, 'utf8');
  console.log(`  ✅ 索引文件 → ${path.relative(ROOT_DIR, indexPath)}`);
};

const generateVocabTsContent = (items: VocabItem[], level: JapaneseLevel): string => {
  const lines = items.map(
    item => `  { kanji: '${escapeTs(item.kanji)}', hiragana: '${escapeTs(item.hiragana)}', romaji: '${escapeTs(item.romaji)}', meaning: '${escapeTs(item.meaning)}', meaningEn: '${escapeTs(item.meaningEn)}', level: '${level}' }`
  );

  return `// 自动生成，请勿手动修改
// 生成时间: ${new Date().toISOString()}
// 来源: Open Anki JLPT Decks (raw/jlpt/${level.toLowerCase()}.csv)

import { VocabularyItem } from '../mockData';

export const ${level.toLowerCase()}Vocabulary: VocabularyItem[] = [
${lines.join(',\n')}
];
`;
};

const generateVocabIndexContent = (byLevel: Map<JapaneseLevel, VocabItem[]>): string => {
  const imports = LEVELS.map(l => `import { ${l.toLowerCase()}Vocabulary } from './vocab-${l.toLowerCase()}';`).join('\n');
  const total = LEVELS.reduce((sum, l) => sum + (byLevel.get(l)?.length || 0), 0);

  return `// 自动生成，请勿手动修改
// 生成时间: ${new Date().toISOString()}

${imports}

export const allVocabulary = [
  ...${LEVELS.map(l => `${l.toLowerCase()}Vocabulary`).join(',\n  ...')}
];

export const vocabularyByLevel = {
${LEVELS.map(l => `  '${l}': ${l.toLowerCase()}Vocabulary,`).join('\n')}
};

export const totalVocabCount = ${total};
`;
};

// ============================================================
// 第三步：从 sentences.csv 生成分级填空句子
// ============================================================

interface TrieNode {
  children: Map<string, TrieNode>;
  entries: JlptEntry[];
}

const buildTrie = (entries: JlptEntry[]): TrieNode => {
  const root: TrieNode = { children: new Map(), entries: [] };
  for (const entry of entries) {
    let node = root;
    for (const char of entry.expression) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: new Map(), entries: [] };
        node.children.set(char, child);
      }
      node = child;
    }
    node.entries.push(entry);
  }
  return root;
};

const allowedBefore = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', '、', '。', '！', '？', '「', '（']);
const allowedAfter = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も', 'や', 'か', 'な', 'だ', '、', '。', '！', '？', '」', '）']);
const japaneseChar = /[\u3040-\u30ff\u3400-\u9fff]/;

const hasUsefulBoundary = (text: string, start: number, expr: string) => {
  const before = text[start - 1];
  const after = text[start + expr.length];
  if (before && japaneseChar.test(before) && !allowedBefore.has(before)) return false;
  if (after && japaneseChar.test(after) && !allowedAfter.has(after)) return false;
  return true;
};

const findMatches = (text: string, trie: TrieNode): JlptEntry[] => {
  const matches: JlptEntry[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < text.length; start++) {
    let node = trie;
    for (let i = start; i < text.length; i++) {
      const child = node.children.get(text[i]);
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

  return matches.sort((a, b) => b.expression.length - a.expression.length);
};

const isUsefulSentence = (text: string): boolean =>
  text.length >= 5 && text.length <= 60 && !/https?:\/\//i.test(text);

const generateSentenceFiles = async (entries: JlptEntry[], dict: TranslationDict) => {
  console.log('\n📝 从 sentences.csv 生成分级填空句子...');

  const trie = buildTrie(entries);
  const tmpDir = path.join(TMP_DIR, 'sentences');
  await fs.mkdir(tmpDir, { recursive: true });

  // 按级别统计
  const counts = new Map<JapaneseLevel, number>();
  for (const level of LEVELS) counts.set(level, 0);

  // 全局去重 Set（跨 chunk）
  const globalDedup = new Set<string>();
  const globalSpeech = new Set<string>();

  // 先加载已有的 part 文件（断点续跑）
  const existingParts = new Set<string>();
  const partFiles = await fs.readdir(tmpDir).catch(() => []);
  for (const file of partFiles) {
    if (file.endsWith('.json')) {
      existingParts.add(file);
      // 从已有 part 文件恢复去重 Set
      const data = JSON.parse(await fs.readFile(path.join(tmpDir, file), 'utf8')) as SentenceItem[];
      for (const item of data) {
        const key = `${item.answers[0]}|${item.speech}|${item.meaning}`;
        globalDedup.add(key);
        globalSpeech.add(item.speech);
      }
    }
  }
  console.log(`  🔄 已恢复 ${globalDedup.size} 条去重记录，${existingParts.size} 个 part 文件`);

  // 只处理日语句子
  let chunkIndex = 0;
  let batch: SentenceItem[] = [];
  let totalProcessed = 0;
  let totalMatched = 0;

  for await (const line of readLines(SENTENCE_FILE)) {
    // 解析行：id\tlang\ttext
    const firstTab = line.indexOf('\t');
    const secondTab = line.indexOf('\t', firstTab + 1);
    if (firstTab < 1 || secondTab < 0) continue;

    const lang = line.slice(firstTab + 1, secondTab);
    if (lang !== 'jpn') continue;

    const text = line.slice(secondTab + 1).trim();
    if (!isUsefulSentence(text)) continue;

    totalProcessed++;

    // 检查是否已处理过
    if (globalSpeech.has(text)) continue;

    // 用 Trie 树匹配 JLPT 词汇
    const matches = findMatches(text, trie);
    if (matches.length === 0) continue;

    // 取最长的匹配
    const match = matches[0];
    const levelCount = counts.get(match.level) || 0;
    if (levelCount >= 200) continue; // 每级最多 200 句

    const key = `${match.expression}|${text}|${match.meaningEn}`;
    if (globalDedup.has(key)) continue;

    globalDedup.add(key);
    globalSpeech.add(text);

    const meaning = translate(dict, match.expression, match.meaningEn);
    const id = `tatoeba-${match.level.toLowerCase()}-${totalMatched}`;
    const item: SentenceItem = {
      id,
      sentence: text.replace(match.expression, '___'),
      speech: text,
      answers: Array.from(new Set([match.expression, match.reading, toRomaji(match.reading)])),
      meaning,
      meaningEn: match.meaningEn,
      explanation: `${match.expression}（${match.reading}）：${meaning}`,
      level: match.level,
      source: {
        name: 'Tatoeba',
        url: `https://tatoeba.org/en/sentences/show/${id}`,
        license: 'CC BY 2.0 FR',
      },
    };

    batch.push(item);
    counts.set(match.level, levelCount + 1);
    totalMatched++;

    // 每 CHUNK_SIZE 条写入一个 part 文件
    if (batch.length >= CHUNK_SIZE) {
      await writeSentencePart(tmpDir, chunkIndex, batch);
      chunkIndex++;
      batch = [];
    }
  }

  // 写入最后一批
  if (batch.length > 0) {
    await writeSentencePart(tmpDir, chunkIndex, batch);
    chunkIndex++;
  }

  console.log(`  📊 处理完成：扫描 ${totalProcessed} 句，匹配 ${totalMatched} 句`);
  for (const level of LEVELS) {
    console.log(`    ${level}: ${counts.get(level) || 0} 句`);
  }

  // 合并所有 part 文件
  await mergeSentenceParts(tmpDir, counts);
};

const writeSentencePart = async (tmpDir: string, index: number, items: SentenceItem[]) => {
  const filePath = path.join(tmpDir, `sentences.part${String(index).padStart(4, '0')}.json`);
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`  💾 写入 part ${index}: ${items.length} 条 → ${path.basename(filePath)}`);
};

const mergeSentenceParts = async (tmpDir: string, counts: Map<JapaneseLevel, number>) => {
  console.log('\n🔗 合并所有 part 文件...');

  const partFiles = (await fs.readdir(tmpDir))
    .filter(f => f.startsWith('sentences.part') && f.endsWith('.json'))
    .sort();

  // 按级别分组
  const byLevel = new Map<JapaneseLevel, SentenceItem[]>();
  for (const level of LEVELS) byLevel.set(level, []);

  // 最终去重 Set
  const finalDedup = new Set<string>();

  for (const file of partFiles) {
    const items = JSON.parse(await fs.readFile(path.join(tmpDir, file), 'utf8')) as SentenceItem[];
    for (const item of items) {
      const key = `${item.answers[0]}|${item.speech}|${item.meaning}`;
      if (finalDedup.has(key)) continue;
      finalDedup.add(key);
      byLevel.get(item.level)?.push(item);
    }
  }

  // 写入每个级别的 TS 文件
  for (const level of LEVELS) {
    const items = byLevel.get(level) || [];
    const filePath = path.join(OUTPUT_DIR, `sentences-${level.toLowerCase()}.ts`);
    const content = generateSentenceTsContent(items, level);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`  ✅ ${level}: ${items.length} 句 → ${path.relative(ROOT_DIR, filePath)}`);
  }

  // 写入汇总索引
  const indexPath = path.join(OUTPUT_DIR, 'sentences-index.ts');
  const indexContent = generateSentenceIndexContent(byLevel);
  await fs.writeFile(indexPath, indexContent, 'utf8');
  console.log(`  ✅ 句子索引 → ${path.relative(ROOT_DIR, indexPath)}`);
};

const generateSentenceTsContent = (items: SentenceItem[], level: JapaneseLevel): string => {
  const lines = items.map(item => {
    const answers = item.answers.map(a => `'${escapeTs(a)}'`).join(', ');
    return `  {\n    id: '${escapeTs(item.id)}',\n    sentence: '${escapeTs(item.sentence)}',\n    speech: '${escapeTs(item.speech)}',\n    answers: [${answers}],\n    meaning: '${escapeTs(item.meaning)}',\n    meaningEn: '${escapeTs(item.meaningEn)}',\n    explanation: '${escapeTs(item.explanation)}',\n    level: '${level}',\n    source: { name: 'Tatoeba', url: '${escapeTs(item.source.url)}', license: '${escapeTs(item.source.license)}' }\n  }`;
  });

  return `// 自动生成，请勿手动修改
// 生成时间: ${new Date().toISOString()}
// 来源: Tatoeba 语料库 + JLPT 分级词库匹配

import { SentenceQuestion } from '../sentenceData';

export const ${level.toLowerCase()}Sentences: SentenceQuestion[] = [
${lines.join(',\n')}
];
`;
};

const generateSentenceIndexContent = (byLevel: Map<JapaneseLevel, SentenceItem[]>): string => {
  const imports = LEVELS.map(l => `import { ${l.toLowerCase()}Sentences } from './sentences-${l.toLowerCase()}';`).join('\n');
  const total = LEVELS.reduce((sum, l) => sum + (byLevel.get(l)?.length || 0), 0);

  return `// 自动生成，请勿手动修改
// 生成时间: ${new Date().toISOString()}

${imports}

export const allSentences = [
  ...${LEVELS.map(l => `${l.toLowerCase()}Sentences`).join(',\n  ...')}
];

export const sentencesByLevel = {
${LEVELS.map(l => `  '${l}': ${l.toLowerCase()}Sentences,`).join('\n')}
};

export const totalSentenceCount = ${total};
`;
};

// ============================================================
// 主流程
// ============================================================

const run = async () => {
  console.log('🚀 buildJpCorpus - 日语分级题库生成工具\n');
  console.log(`   输出目录: ${OUTPUT_DIR}`);
  console.log(`   临时目录: ${TMP_DIR}\n`);

  const vocabOnly = hasFlag('vocab-only');
  const sentenceOnly = hasFlag('sentence-only');
  const reset = hasFlag('reset');

  // 创建输出目录
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  // 加载翻译字典
  console.log('📖 加载翻译字典...');
  const dict = await loadTranslationDict();

  // 加载 JLPT 词库（两边都需要）
  const entries = await loadJlptEntries();

  if (!sentenceOnly) {
    await generateVocabFiles(entries, dict);
  }

  if (!vocabOnly) {
    await generateSentenceFiles(entries, dict);
  }

  console.log('\n✅ 全部完成！');
};

run().catch(error => {
  console.error('❌ 错误:', error);
  process.exitCode = 1;
});
