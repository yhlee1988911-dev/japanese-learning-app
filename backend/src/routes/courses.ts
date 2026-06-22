import express from 'express';
import { Course } from '../models/Course';
import { mockCourses } from '../data/mockData';

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.json(mockCourses);
    }

    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      const course = mockCourses.find((course) => course._id === req.params.id);
      if (!course) return res.status(404).json({ error: 'Course not found' });
      return res.json(course);
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course (admin)
router.post('/', async (req, res) => {
  try {
    if (req.app.locals.dbConnected === false) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create course' });
  }
});

export = router;
