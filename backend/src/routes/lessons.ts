import express from 'express';
import { Lesson } from '../models/Lesson';
import { getMockLessonsByCourse, getMockLessonById } from '../data/mockData';

const router = express.Router();

// Get lessons by course ID
router.get('/course/:courseId', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.json(getMockLessonsByCourse(req.params.courseId));
    }

    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort({ order: 1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get single lesson
router.get('/:id', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      const lesson = getMockLessonById(req.params.id);
      if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
      return res.json(lesson);
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Create lesson (admin)
router.post('/', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const lesson = new Lesson(req.body);
    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lesson' });
  }
});

export = router;
