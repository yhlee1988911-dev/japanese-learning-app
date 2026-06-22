# 日本語学習アプリ (Japanese Learning App)

A comprehensive Japanese learning application similar to Duolingo, built with a modern full-stack architecture supporting both Web and Mobile platforms.

## 🌟 Features

- **Comprehensive Courses**: Multiple levels from beginner to advanced
- **Interactive Lessons**: Vocabulary, grammar, and exercises
- **Vocabulary Trainer**: Choose JLPT level, answer from Chinese meaning or Japanese audio
- **Japanese TTS**: Backend audio proxy for Japanese pronunciation with browser fallback
- **Optional AI Review**: Local Ollama-based answer verification for non-unique answers
- **Progress Tracking**: Track your learning progress and streaks
- **Gamification**: Points, levels, and daily streaks
- **Cross-Platform**: Web and Mobile (React Native/Expo)
- **Responsive Design**: Works on all device sizes

## 📁 Project Structure

```
japanese-learning-app/
├── backend/          # Node.js + Express API
├── web/              # React Web Application
├── mobile/           # React Native Mobile App
├── shared/           # Shared types and utilities
└── package.json      # Workspace configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB (for backend)
- Git

### Installation

1. **Clone the repository** (if applicable):
```bash
cd japanese-learning-app
```

2. **Install dependencies**:
```bash
yarn install
# or
npm install
```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` in `backend/` directory
   - Copy `.env.example` to `.env.local` in `web/` directory

```bash
# Backend
cp backend/.env.example backend/.env

# Web
cp web/.env.example web/.env.local
```

4. **Start MongoDB**:
```bash
mongod
```

### Development

Start all services concurrently:

```bash
yarn dev
```

Or run individual services:

**Backend**:
```bash
cd backend
yarn dev
```

**Web**:
```bash
cd web
yarn start
```

**Mobile (Expo)**:
```bash
cd mobile
yarn start
```

## 📚 Available Scripts

### Root Directory
- `yarn dev` - Start all services (backend, web, mobile)
- `yarn build` - Build all packages
- `yarn test` - Run tests across all packages
- `yarn clean` - Remove all node_modules

### Backend
- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Run production build

### Web
- `yarn start` - Start React development server
- `yarn build` - Build for production
- `yarn test` - Run tests

### Mobile
- `yarn start` - Start Expo server
- `yarn android` - Run on Android emulator
- `yarn ios` - Run on iOS simulator
- `yarn web` - Run on web

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Language**: TypeScript

### Web
- **Framework**: React 18
- **Routing**: React Router
- **State Management**: Zustand
- **Styling**: CSS
- **Language**: TypeScript

### Mobile
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **State Management**: Zustand
- **Language**: TypeScript

### Shared
- **Common Types** & Utilities
- **API Client**
- **Constants**

## 📊 Database Schema

### Courses
```json
{
  "_id": "ObjectId",
  "title": "String",
  "description": "String",
  "level": "beginner|intermediate|advanced",
  "totalLessons": "Number",
  "imageUrl": "String",
  "createdAt": "Date"
}
```

### Lessons
```json
{
  "_id": "ObjectId",
  "courseId": "ObjectId",
  "title": "String",
  "order": "Number",
  "vocabulary": [{
    "kanji": "String",
    "hiragana": "String",
    "romaji": "String",
    "meaning": "String"
  }],
  "grammar": [...],
  "exercises": [...]
}
```

### User Progress
```json
{
  "_id": "ObjectId",
  "courseId": "ObjectId",
  "completedLessons": ["ObjectId"],
  "progressPercentage": "Number",
  "score": "Number",
  "streak": "Number"
}
```

## 🔗 API Endpoints

- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get specific course
- `GET /api/lessons/course/:courseId` - Get lessons for a course
- `GET /api/lessons/:id` - Get specific lesson
- `GET /api/progress/:courseId` - Get user progress
- `PUT /api/progress/:courseId` - Update user progress
- `GET /api/vocabulary/course/:courseId` - Get vocabulary
- `GET /api/vocabulary/level/:level` - Get vocabulary by JLPT level
- `GET /api/vocabulary/corpus/status` - Get the synced vocabulary snapshot status
- `GET /api/sentences/level/:level` - Get built-in and synced Tatoeba sentence questions
- `GET /api/sentences/corpus/status` - Get the synced sentence snapshot status
- `GET /api/tts/japanese?text=...` - Get Japanese speech audio
- `POST /api/answers/verify` - Verify a user's answer
- `GET /api/health` - Health check

## 🤖 Optional AI Answer Verification

The app first checks answers locally against kanji, kana, romaji, and slash-separated alternatives such as `し/よん`.

For free local AI review, install Ollama, run a Japanese-capable model, then enable:

```bash
ENABLE_AI_VERIFY=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

If Ollama is unavailable, the app falls back to local rule checking.

## Open Corpus Sync

Third-party learning content is stored as a local snapshot, so practice does not depend on Tatoeba or GitHub being online. Tatoeba provides Japanese and Mandarin sentence pairs; Open Anki JLPT Decks provides community-maintained N1-N5 labels and readings.

```bash
npm --workspace backend run sync:corpus -- --limit=10
npm --workspace backend run sync:corpus -- --levels=N5,N4 --limit=20
```

The command cleans and deduplicates entries, rejects unsafe word-boundary matches, caches Chinese meanings, and writes `backend/src/data/generated/openCorpus.json`. Tatoeba author, translator, URL, and license metadata are retained and displayed in the practice UI. JLPT labels are community estimates because the official JLPT no longer publishes a fixed vocabulary list.

Large Tatoeba exports are processed in fixed 10,000-row batches. Cleaned records and matched pairs are written to disk immediately, partitioned joins keep only one bucket in memory, and the final JSONL is assembled by streaming the chunk files in order.

```bash
npm --workspace backend run process:tatoeba
```

The command reads `raw/sentences.csv` and `raw/links.csv` by default and writes a timestamped run under `raw/processed/`. Intermediate files are retained for auditing and recovery.

Grade one processed 10,000-pair chunk at a time and add no more than 20 questions per JLPT level:

```bash
npm --workspace backend run grade:tatoeba
npm --workspace backend run grade:tatoeba -- --input=raw/processed/RUN/chunks/chunk-000001.jsonl --per-level=20
```

The grader streams the input, matches vocabulary with an in-memory trie built from the small JLPT CSV files, writes the cleaned graded chunk immediately, and only then merges that limited result into the app corpus.

## 📱 Mobile Deployment

To package as a native app:

```bash
cd mobile
eas build
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🐛 Troubleshooting

**MongoDB Connection Issues**:
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`

**Port Already in Use**:
- Backend: Change `PORT` in `.env`
- Web: React will prompt to use another port

**Module Not Found**:
- Run `yarn install` again
- Clear cache: `yarn clean && yarn install`

## 📞 Support

For issues or questions, please create an issue on the repository or check existing documentation.

---

Happy Learning! 学ぶを楽しんでください！🎌
