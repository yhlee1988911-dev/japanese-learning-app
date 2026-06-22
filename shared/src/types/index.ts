export type JapaneseLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

// Course Types
export interface Course {
  _id: string;
  title: string;
  description: string;
  level: JapaneseLevel;
  totalLessons: number;
  imageUrl?: string;
  createdAt: string;
}

// Vocabulary Types
export interface Vocabulary {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: JapaneseLevel;
  example?: string;
  source?: ContentSource;
}

export interface ContentSource {
  name: string;
  url: string;
  license: string;
  author?: string;
  translationAuthor?: string;
}

export interface SentenceQuestion {
  id: string;
  sentence: string;
  speech: string;
  answers: string[];
  meaning: string;
  explanation: string;
  level: JapaneseLevel;
  source?: ContentSource;
}

// Grammar Types
export interface Grammar {
  pattern: string;
  meaning: string;
  example: string;
}

// Exercise Types
export type ExerciseType = 'multiple-choice' | 'typing' | 'matching' | 'listening';

export interface Exercise {
  type: ExerciseType;
  question: string;
  answer: string;
  options?: string[];
}

// Lesson Types
export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  vocabulary: Vocabulary[];
  grammar?: Grammar[];
  exercises?: Exercise[];
}

// User Progress Types
export interface UserProgress {
  _id: string;
  courseId: string;
  completedLessons: string[];
  currentLessonId: string;
  progressPercentage: number;
  score: number;
  streak: number;
  lastActivityDate: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
