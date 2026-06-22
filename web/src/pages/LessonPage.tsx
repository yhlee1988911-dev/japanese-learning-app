import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';
import '../styles/LessonPage.css';

interface Vocabulary {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level?: string;
  example?: string;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  vocabulary: Vocabulary[];
}

const LessonPage: React.FC = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`${API_URL}/lessons/${lessonId}`);
        const data = await response.json();
        setLesson(data);
      } catch (error) {
        console.error('Failed to fetch lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  if (loading) return <div className="lesson-loading">読み込み中...</div>;
  if (!lesson) return <div className="lesson-error">レッスンが見つかりません</div>;

  return (
    <div className="lesson-container">
      <div className="lesson-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <div className="header-content">
          <h1>{lesson.title}</h1>
          <p className="description">{lesson.description}</p>
        </div>
        <button 
          className="practice-btn" 
          onClick={() => navigate(`/practice/${lessonId}`)}
        >
          🎯 練習を始める
        </button>
      </div>

      <div className="vocabulary-section">
        <h2>📚 語彙</h2>
        <div className="vocab-count">全 {lesson.vocabulary.length} 個の単語</div>
        
        <div className="vocabulary-grid">
          {lesson.vocabulary.map((word, idx) => (
            <div key={idx} className="vocab-card">
              <div className="vocab-main">
                <div className="vocab-kanji">{word.kanji}</div>
                <div className="vocab-hiragana">{word.hiragana}</div>
                <div className="vocab-romaji">{word.romaji}</div>
              </div>
              <div className="vocab-meaning">{word.meaning}</div>
              {word.level && <div className="vocab-level">{word.level}</div>}
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          <table className="vocabulary-table">
            <thead>
              <tr>
                <th>漢字</th>
                <th>ひらがな</th>
                <th>ローマ字</th>
                <th>意味</th>
                {lesson.vocabulary.some(v => v.level) && <th>レベル</th>}
              </tr>
            </thead>
            <tbody>
              {lesson.vocabulary.map((word, idx) => (
                <tr key={idx}>
                  <td className="cell-kanji">{word.kanji}</td>
                  <td className="cell-hiragana">{word.hiragana}</td>
                  <td className="cell-romaji">{word.romaji}</td>
                  <td className="cell-meaning">{word.meaning}</td>
                  {lesson.vocabulary.some(v => v.level) && (
                    <td className="cell-level">{word.level || '-'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
