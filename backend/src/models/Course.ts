import mongoose from 'mongoose';

type JapaneseLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
const japaneseLevels: JapaneseLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface ICourse extends mongoose.Document {
  title: string;
  description: string;
  level: JapaneseLevel;
  totalLessons: number;
  imageUrl?: string;
  createdAt: Date;
}

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  level: { type: String, enum: japaneseLevels, default: 'N5' },
  totalLessons: { type: Number, default: 0 },
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});

export const Course = mongoose.model<ICourse>('Course', courseSchema);
