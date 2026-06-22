import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';
import '../styles/CoursePage.css';

interface Lesson {
  _id: string;
  title: string;
  description: string;
  order: number;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  backBtn: {
    marginBottom: '20px',
    background: 'rgba(102, 126, 234, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    color: '#667eea',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  title: {
    color: '#333',
    fontSize: '28px',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gap: '10px',
  },
  card: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  cardTitle: {
    color: '#333',
    margin: '0 0 8px',
    fontSize: '18px',
  },
  cardDesc: {
    color: '#666',
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.5,
  },
};

const CoursePage: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(`${API_URL}/lessons/course/${courseId}`);
        const data = await response.json();
        setLessons(data);
      } catch (error) {
        console.error('Failed to fetch lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate('/')}>← 戻る</button>
      <h1 style={styles.title}>レッスン一覧</h1>
      <div style={styles.grid}>
        {lessons.map(lesson => (
          <div
            key={lesson._id}
            style={styles.card}
            onClick={() => navigate(`/lesson/${lesson._id}`)}
          >
            <h3 style={styles.cardTitle}>レッスン {lesson.order}: {lesson.title}</h3>
            <p style={styles.cardDesc}>{lesson.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoursePage;
