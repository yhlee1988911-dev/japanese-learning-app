import mongoose from 'mongoose';

type JapaneseLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
const japaneseLevels: JapaneseLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface ILesson extends mongoose.Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  vocabulary: Array<{
    kanji: string;
    hiragana: string;
    romaji: string;
    meaning: string;
    level: JapaneseLevel;
    example?: string;
  }>;
  grammar?: Array<{
    pattern: string;
    meaning: string;
    example: string;
  }>;
  exercises?: Array<{
    type: 'multiple-choice' | 'typing' | 'matching' | 'listening';
    question: string;
    answer: string;
    options?: string[];
  }>;
}

const lessonSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: String,
  order: { type: Number, required: true },
  vocabulary: [{
    kanji: String,
    hiragana: { type: String, required: true },
    romaji: { type: String, required: true },
    meaning: { type: String, required: true },
    level: { type: String, enum: japaneseLevels, required: true },
    example: String
  }],
  grammar: [{
    pattern: String,
    meaning: String,
    example: String
  }],
  exercises: [{
    type: String,
    question: String,
    answer: String,
    options: [String]
  }]
});

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
