export interface ContentSource {
  name: string;
  url: string;
  license: string;
  author?: string;
  translationAuthor?: string;
}

export interface VocabularyItem {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: string;
  pitch?: string;
  pos?: string;
  lessonTitle?: string;
  example?: string;
  source?: ContentSource;
}
