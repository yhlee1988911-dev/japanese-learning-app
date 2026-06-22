import corpus from './generated/openCorpus.json';
import { VocabularyItem } from './mockData';
import { SentenceQuestion } from './sentenceData';
import { n5Vocabulary } from './generated/vocab-n5';
import { n4Vocabulary } from './generated/vocab-n4';
import { n3Vocabulary } from './generated/vocab-n3';
import { n2Vocabulary } from './generated/vocab-n2';
import { n1Vocabulary } from './generated/vocab-n1';

export interface CorpusSource {
  name: string;
  url: string;
  license: string;
  author?: string;
  translationAuthor?: string;
}

export interface CorpusVocabulary extends VocabularyItem {
  source: CorpusSource;
}

export interface CorpusSentence extends SentenceQuestion {
  source: CorpusSource;
}

interface OpenCorpusData {
  updatedAt: string | null;
  vocabulary: CorpusVocabulary[];
  sentences: CorpusSentence[];
}

const data = corpus as OpenCorpusData;

// 用新生成的全量词汇替换 openCorpus.json 中的所有数据
const generatedVocabulary: CorpusVocabulary[] = [
  ...n5Vocabulary,
  ...n4Vocabulary,
  ...n3Vocabulary,
  ...n2Vocabulary,
  ...n1Vocabulary,
].map(v => ({
  ...v,
  source: { name: '', url: '', license: '' }
}));

export const openCorpusVocabulary = generatedVocabulary;
export const openCorpusSentences = data.sentences;
export const openCorpusUpdatedAt = data.updatedAt;

