import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT || '5001', 10);

// Global state for database connection
let dbConnected = false;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to expose db connection status
app.use((req, res, next) => {
  req.app.locals.dbConnected = dbConnected;
  next();
});

// Connect to database
connectDB().then(connected => {
  dbConnected = connected;
}).catch(error => {
  console.error('Database connection failed:', error);
  dbConnected = false;
});

// Routes
app.use('/api/courses', require('./routes/courses'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/vocabulary', require('./routes/vocabulary'));
app.use('/api/tts', require('./routes/tts'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/sentences', require('./routes/sentences'));
app.use('/api/mistakes', require('./routes/mistakes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
