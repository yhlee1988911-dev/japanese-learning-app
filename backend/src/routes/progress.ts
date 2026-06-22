import express from 'express';
import { UserProgress } from '../models/UserProgress';
import { getMockProgress } from '../data/mockData';

const router = express.Router();

// Get progress for a course
router.get('/:courseId', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.json(getMockProgress(req.params.courseId));
    }

    const progress = await UserProgress.findOne({ courseId: req.params.courseId })
      .populate('completedLessons')
      .populate('currentLessonId');
    
    if (!progress) {
      const newProgress = new UserProgress({ courseId: req.params.courseId });
      await newProgress.save();
      return res.json(newProgress);
    }
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update progress
router.put('/:courseId', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const progress = await UserProgress.findOneAndUpdate(
      { courseId: req.params.courseId },
      { ...req.body, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export = router;
