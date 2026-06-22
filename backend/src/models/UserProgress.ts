import mongoose from 'mongoose';

interface IUserProgress extends mongoose.Document {
  courseId: mongoose.Types.ObjectId;
  completedLessons: mongoose.Types.ObjectId[];
  currentLessonId: mongoose.Types.ObjectId;
  progressPercentage: number;
  score: number;
  streak: number;
  lastActivityDate: Date;
  updatedAt: Date;
}

const userProgressSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  currentLessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  progressPercentage: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActivityDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const UserProgress = mongoose.model<IUserProgress>('UserProgress', userProgressSchema);
