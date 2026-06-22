import express from 'express';
import { Lesson } from '../models/Lesson';
import { getMockLessonsByCourse, getMockVocabularyByLesson } from '../data/mockData';
import { openCorpusUpdatedAt, openCorpusVocabulary } from '../data/openCorpus';

const router = express.Router();

// 课程 ID 到等级的映射
const COURSE_LEVEL_MAP: Record<string, string> = {
  'course-1': 'N5',
  'course-2': 'N4',
  'course-3': 'N3',
  'course-4': 'N2',
  'course-5': 'N1',
};

// Get all vocabulary from a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const level = COURSE_LEVEL_MAP[courseId];

    if (req.app.locals.dbConnected === false) {
      // 从新生成的词库中按等级筛选
      const vocabulary = openCorpusVocabulary
        .filter(item => item.level === level)
        .map(v => ({ ...v, lessonId: '', lessonTitle: '' }));
      return res.json(vocabulary);
    }

    const lessons = await Lesson.find({ courseId });
    const vocabulary = lessons.flatMap(lesson => 
      lesson.vocabulary.map(v => ({ ...v, lessonId: lesson._id, lessonTitle: lesson.title }))
    );
    res.json(vocabulary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// Get vocabulary by JLPT level
router.get('/level/:level', async (req, res) => {
  try {
    const level = req.params.level.toUpperCase();

    if (req.app.locals.dbConnected === false) {
      // 直接从新生成的词库中按等级筛选
      const vocabulary = openCorpusVocabulary.filter(item => item.level === level);
      return res.json(vocabulary);
    }

    const lessons = await Lesson.find({ 'vocabulary.level': level });
    const vocabulary = lessons.flatMap(lesson =>
      lesson.vocabulary
        .filter((v: any) => v.level === level)
        .map((v: any) => ({
          ...(typeof v.toObject === 'function' ? v.toObject() : v),
          lessonId: lesson._id,
          lessonTitle: lesson.title
        }))
    );

    res.json(vocabulary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

router.get('/corpus/status', (_req, res) => {
  res.json({
    updatedAt: openCorpusUpdatedAt,
    vocabularyCount: openCorpusVocabulary.length,
    source: 'JLPT Vocabulary (Generated from Excel)'
  });
});

// Get vocabulary for a specific lesson
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.json(getMockVocabularyByLesson(req.params.lessonId));
    }

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson.vocabulary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

export = router;
