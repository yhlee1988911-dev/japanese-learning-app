import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LessonPage.css';

const LessonPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="practice-page practice-page--center">
      <div className="empty-state">
        <h1>课程模式暂不支持</h1>
        <p>请返回首页选择等级模式进行练习</p>
        <button type="button" onClick={() => navigate('/')}>返回首页</button>
      </div>
    </main>
  );
};

export default LessonPage;
