import { createReadStream, createWriteStream, WriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';

const BATCH_SIZE = 10_000;
const BUCKET_COUNT = 128;
const rootDir = path.resolve(__dirname, '../../..');

const getArgument = (name: string, fallback: string) => {
  const prefix = `--${name}=`;
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length) || fallback;
};

const sentenceFile = path.resolve(rootDir, getArgument('sentences', 'raw/sentences.csv'));
const linkFile = path.resolve(rootDir, getArgument('links', 'raw/links.csv'));
const outputRoot = path.resolve(rootDir, getArgument('output', 'raw/processed'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(outputRoot, `run-${runId}`);
const sentenceBucketDir = path.join(runDir, 'work', 'sentences');
const linkBucketDir = path.join(runDir, 'work', 'links-by-source');
const enrichedLinkDir = path.join(runDir, 'work', 'links-by-target');
const chunkDir = path.join(runDir, 'chunks');
const mergedFile = path.join(runDir, 'tatoeba-ja-zh.jsonl');

interface SentenceRecord {
  id: number;
  lang: 'jpn' | 'cmn';
  text: string;
}

interface EnrichedLink {
  sourceId: number;
  sourceLang: 'jpn' | 'cmn';
  sourceText: string;
  targetId: number;
}

interface PairRecord {
  japanese: { id: number; text: string };
  chinese: { id: number; text: string };
  source: { name: 'Tatoeba'; url: string; license: 'CC BY 2.0 FR' };
}

const bucketFor = (id: number) => Math.abs(id) % BUCKET_COUNT;
const bucketPath = (directory: string, bucket: number) => path.join(directory, `${String(bucket).padStart(3, '0')}.jsonl`);

class BucketWriters {
  private streams = new Map<number, WriteStream>();

  constructor(private directory: string) {}

  async append(groups: Map<number, string[]>) {
    for (const [bucket, lines] of groups) {
      if (lines.length === 0) continue;
      let stream = this.streams.get(bucket);
      if (!stream) {
        stream = createWriteStream(bucketPath(this.directory, bucket), { flags: 'a' });
        this.streams.set(bucket, stream);
      }
      if (!stream.write(`${lines.join('\n')}\n`)) {
        await new Promise<void>((resolve, reject) => {
          const onDrain = () => {
            stream?.removeListener('error', onError);
            resolve();
          };
          const onError = (error: Error) => {
            stream?.removeListener('drain', onDrain);
            reject(error);
          };
          stream?.once('drain', onDrain);
          stream?.once('error', onError);
        });
      }
    }
    groups.clear();
  }

  async close() {
    await Promise.all(Array.from(this.streams.values()).map(stream => new Promise<void>((resolve, reject) => {
      stream.once('error', reject);
      stream.end(resolve);
    })));
  }
}

const parseSentence = (line: string): SentenceRecord | null => {
  const firstTab = line.indexOf('\t');
  const secondTab = line.indexOf('\t', firstTab + 1);
  if (firstTab < 1 || secondTab < 0) return null;

  const id = Number(line.slice(0, firstTab));
  const lang = line.slice(firstTab + 1, secondTab);
  const text = line.slice(secondTab + 1).trim();
  if (!Number.isSafeInteger(id) || (lang !== 'jpn' && lang !== 'cmn') || !text) return null;
  return { id, lang, text };
};

const parseLink = (line: string) => {
  const tab = line.indexOf('\t');
  if (tab < 1) return null;
  const sourceId = Number(line.slice(0, tab));
  const targetId = Number(line.slice(tab + 1));
  if (!Number.isSafeInteger(sourceId) || !Number.isSafeInteger(targetId)) return null;
  return { sourceId, targetId };
};

const readLines = (file: string) => readline.createInterface({
  input: createReadStream(file, { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
  crlfDelay: Infinity
});

const partitionSentences = async () => {
  let rowsRead = 0;
  let rowsKept = 0;
  let batchRows = 0;
  const groups = new Map<number, string[]>();
  const writers = new BucketWriters(sentenceBucketDir);

  for await (const line of readLines(sentenceFile)) {
    rowsRead += 1;
    batchRows += 1;
    const record = parseSentence(line);
    if (record) {
      const bucket = bucketFor(record.id);
      const lines = groups.get(bucket) || [];
      lines.push(JSON.stringify(record));
      groups.set(bucket, lines);
      rowsKept += 1;
    }

    if (batchRows === BATCH_SIZE) {
      await writers.append(groups);
      batchRows = 0;
      if (rowsRead % 1_000_000 === 0) console.log(`Sentences: ${rowsRead.toLocaleString()} rows`);
    }
  }

  await writers.append(groups);
  await writers.close();
  console.log(`Sentences complete: read ${rowsRead.toLocaleString()}, kept ${rowsKept.toLocaleString()}`);
  return { rowsRead, rowsKept };
};

const partitionLinks = async () => {
  let rowsRead = 0;
  let rowsKept = 0;
  let batchRows = 0;
  const groups = new Map<number, string[]>();
  const writers = new BucketWriters(linkBucketDir);

  for await (const line of readLines(linkFile)) {
    rowsRead += 1;
    batchRows += 1;
    const record = parseLink(line);
    if (record) {
      const bucket = bucketFor(record.sourceId);
      const lines = groups.get(bucket) || [];
      lines.push(`${record.sourceId}\t${record.targetId}`);
      groups.set(bucket, lines);
      rowsKept += 1;
    }

    if (batchRows === BATCH_SIZE) {
      await writers.append(groups);
      batchRows = 0;
      if (rowsRead % 1_000_000 === 0) console.log(`Links: ${rowsRead.toLocaleString()} rows`);
    }
  }

  await writers.append(groups);
  await writers.close();
  console.log(`Links complete: read ${rowsRead.toLocaleString()}, kept ${rowsKept.toLocaleString()}`);
  return { rowsRead, rowsKept };
};

const loadSentenceBucket = async (bucket: number) => {
  const records = new Map<number, SentenceRecord>();
  const file = bucketPath(sentenceBucketDir, bucket);

  try {
    for await (const line of readLines(file)) {
      const record = JSON.parse(line) as SentenceRecord;
      records.set(record.id, record);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return records;
};

const enrichLinksBySource = async () => {
  let kept = 0;
  const writers = new BucketWriters(enrichedLinkDir);

  for (let bucket = 0; bucket < BUCKET_COUNT; bucket += 1) {
    const sentences = await loadSentenceBucket(bucket);
    const groups = new Map<number, string[]>();
    let batchRows = 0;

    try {
      for await (const line of readLines(bucketPath(linkBucketDir, bucket))) {
        batchRows += 1;
        const record = parseLink(line);
        const source = record ? sentences.get(record.sourceId) : undefined;
        if (record && source) {
          const enriched: EnrichedLink = {
            sourceId: source.id,
            sourceLang: source.lang,
            sourceText: source.text,
            targetId: record.targetId
          };
          const targetBucket = bucketFor(record.targetId);
          const lines = groups.get(targetBucket) || [];
          lines.push(JSON.stringify(enriched));
          groups.set(targetBucket, lines);
          kept += 1;
        }

        if (batchRows === BATCH_SIZE) {
          await writers.append(groups);
          batchRows = 0;
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    await writers.append(groups);
    if ((bucket + 1) % 16 === 0) console.log(`Source join: ${bucket + 1}/${BUCKET_COUNT} buckets`);
  }

  await writers.close();
  console.log(`Source join complete: kept ${kept.toLocaleString()} candidate links`);
  return kept;
};

const writeChunk = async (records: PairRecord[], index: number) => {
  const file = path.join(chunkDir, `chunk-${String(index).padStart(6, '0')}.jsonl`);
  await fs.writeFile(file, `${records.map(record => JSON.stringify(record)).join('\n')}\n`, 'utf8');
};

const createPairChunks = async () => {
  let pairCount = 0;
  let chunkIndex = 0;
  let chunk: PairRecord[] = [];

  for (let bucket = 0; bucket < BUCKET_COUNT; bucket += 1) {
    const targets = await loadSentenceBucket(bucket);
    try {
      for await (const line of readLines(bucketPath(enrichedLinkDir, bucket))) {
        const link = JSON.parse(line) as EnrichedLink;
        const target = targets.get(link.targetId);
        if (!target || link.sourceLang !== 'jpn' || target.lang !== 'cmn') continue;

        chunk.push({
          japanese: { id: link.sourceId, text: link.sourceText },
          chinese: { id: target.id, text: target.text },
          source: {
            name: 'Tatoeba',
            url: `https://tatoeba.org/en/sentences/show/${link.sourceId}`,
            license: 'CC BY 2.0 FR'
          }
        });
        pairCount += 1;

        if (chunk.length === BATCH_SIZE) {
          await writeChunk(chunk, chunkIndex);
          chunk = [];
          chunkIndex += 1;
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    if ((bucket + 1) % 16 === 0) console.log(`Target join: ${bucket + 1}/${BUCKET_COUNT} buckets`);
  }

  if (chunk.length > 0) {
    await writeChunk(chunk, chunkIndex);
    chunkIndex += 1;
  }
  console.log(`Pair chunks complete: ${pairCount.toLocaleString()} pairs in ${chunkIndex} files`);
  return { pairCount, chunkCount: chunkIndex };
};

const pipeFile = (file: string, output: NodeJS.WritableStream) => new Promise<void>((resolve, reject) => {
  const input = createReadStream(file);
  const cleanup = () => {
    input.removeListener('error', onError);
    input.removeListener('end', onEnd);
    output.removeListener('error', onError);
  };
  const onError = (error: Error) => {
    cleanup();
    reject(error);
  };
  const onEnd = () => {
    cleanup();
    resolve();
  };
  input.once('error', onError);
  output.once('error', onError);
  input.once('end', onEnd);
  input.pipe(output, { end: false });
});

const mergeChunks = async (chunkCount: number) => {
  const output = createWriteStream(mergedFile, { flags: 'wx' });
  for (let index = 0; index < chunkCount; index += 1) {
    await pipeFile(path.join(chunkDir, `chunk-${String(index).padStart(6, '0')}.jsonl`), output);
  }
  await new Promise<void>((resolve, reject) => {
    output.end(resolve);
    output.on('error', reject);
  });
  console.log(`Merged output: ${mergedFile}`);
};

const run = async () => {
  await Promise.all([
    fs.mkdir(sentenceBucketDir, { recursive: true }),
    fs.mkdir(linkBucketDir, { recursive: true }),
    fs.mkdir(enrichedLinkDir, { recursive: true }),
    fs.mkdir(chunkDir, { recursive: true })
  ]);

  const startedAt = new Date().toISOString();
  const sentenceStats = await partitionSentences();
  const linkStats = await partitionLinks();
  const candidateLinkCount = await enrichLinksBySource();
  const pairStats = await createPairChunks();
  await mergeChunks(pairStats.chunkCount);

  const manifest = {
    startedAt,
    completedAt: new Date().toISOString(),
    batchSize: BATCH_SIZE,
    bucketCount: BUCKET_COUNT,
    input: { sentences: sentenceFile, links: linkFile },
    output: mergedFile,
    stats: { sentenceStats, linkStats, candidateLinkCount, ...pairStats }
  };
  await fs.writeFile(path.join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Manifest: ${path.join(runDir, 'manifest.json')}`);
};

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
