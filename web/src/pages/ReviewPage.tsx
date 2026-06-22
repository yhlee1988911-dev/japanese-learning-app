import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../services/api';
import '../styles/PracticePage.css';
import '../styles/ReviewPage.css';

interface MistakeRecord {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: string;
  lessonTitle?: string;
  wrongCount: number;
  lastWrongAt: string;
  firstWrongAt: string;
}

interface ReviewQuestion {
  id: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: string;
  lessonTitle?: string;
  wrongCount: number;
}

type AnswerState = 'idle' | 'correct' | 'incorrect';

const normalizeAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '').replace(/[ー－]/g, '-');

const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAudioPlayingRef = useRef(false);
  const speechTimerRef = useRef<number | null>(null);

  const autoNext = searchParams.get('autoNext') === 'true';
  const autoSpeak = searchParams.get('autoSpeak') !== 'false';

  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState('');
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const current = questions[currentIndex];
  const completed = answerState === 'correct' ? currentIndex + 1 : currentIndex;
  const progress = questions.length > 0 ? (completed / questions.length) * 100 : 0;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
    speechTimerRef.current = null;
    isAudioPlayingRef.current = false;
    setIsAudioPlaying(false);
    setAudioStatus('');
  }, []);

  const speakCurrent = useCallback(() => {
    if (!current || isAudioPlayingRef.current) return;

    const text = current.hiragana || current.kanji;
    isAudioPlayingRef.current = true;
    setIsAudioPlaying(true);
    setAudioStatus('播放中...');

    const finish = () => {
      audioRef.current = null;
      if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
      isAudioPlayingRef.current = false;
      setIsAudioPlaying(false);
      setAudioStatus('');
    };

    const playBrowserFallback = () => {
      if (!window.speechSynthesis) {
        isAudioPlayingRef.current = false;
        setIsAudioPlaying(false);
        setAudioStatus('当前浏览器无法播放语音');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.82;
      utterance.onend = finish;
      utterance.onerror = finish;
      speechTimerRef.current = window.setTimeout(finish, 12000);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    const audio = new Audio(`${API_URL}/tts/japanese?text=${encodeURIComponent(text)}`);
    audioRef.current = audio;
    audio.onended = finish;
    audio.onerror = playBrowserFallback;
    audio.play().catch(playBrowserFallback);
  }, [current]);

  const resetQuestionState = useCallback(() => {
    stopAudio();
    setUserAnswer('');
    setAnswerState('idle');
  }, [stopAudio]);

  const nextQuestion = useCallback(() => {
    resetQuestionState();
    setCurrentIndex(index => Math.min(index + 1, questions.length));
  }, [questions.length, resetQuestionState]);

  useEffect(() => {
    const fetchMistakes = async () => {
      try {
        const response = await fetch(`${API_URL}/mistakes`);
        if (!response.ok) throw new Error('错题加载失败');
        const data: MistakeRecord[] = await response.json();
        setMistakes(data);

        const pool: ReviewQuestion[] = data.map((item, index) => ({
          id: `${item.kanji}:${item.hiragana}-${index}`,
          kanji: item.kanji,
          hiragana: item.hiragana,
          romaji: item.romaji,
          meaning: item.meaning,
          level: item.level,
          lessonTitle: item.lessonTitle,
          wrongCount: item.wrongCount
        }));

        // 打乱顺序
        for (let i = pool.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        setQuestions(pool);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '错题加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMistakes();
    return stopAudio;
  }, [stopAudio]);

  useEffect(() => {
    if (loading) return undefined;
    if (autoSpeak) {
      const timer = window.setTimeout(speakCurrent, 250);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loading, speakCurrent, autoSpeak, currentIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex, answerState]);

  useEffect(() => {
    if (answerState !== 'correct' || !autoNext) return undefined;
    const timer = window.setTimeout(nextQuestion, 700);
    return () => window.clearTimeout(timer);
  }, [answerState, autoNext, nextQuestion]);

  const acceptedAnswers = useMemo(() => {
    if (!current) return [];
    return [current.kanji, current.hiragana, current.romaji].filter(Boolean).map(normalizeAnswer);
  }, [current]);

  const checkAnswer = () => {
    if (!current || answerState === 'correct' || !userAnswer.trim()) return;

    const isCorrect = acceptedAnswers.includes(normalizeAnswer(userAnswer));
    setTotalAttempts(prev => prev + 1);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (answerState === 'correct') {
      nextQuestion();
      return;
    }

    checkAnswer();
  };

  const clearMistake = async (kanji: string, hiragana: string) => {
    const id = encodeURIComponent(`${kanji}:${hiragana}`);
    try {
      await fetch(`${API_URL}/mistakes/${id}`, { method: 'DELETE' });
      setClearedIds(prev => new Set(prev).add(`${kanji}:${hiragana}`));
    } catch {
      // ignore
    }
  };

  const clearAllMistakes = async () => {
    try {
      await fetch(`${API_URL}/mistakes`, { method: 'DELETE' });
      setQuestions([]);
      setMistakes([]);
    } catch {
      // ignore
    }
  };

  const restart = () => {
    stopAudio();
    const pool = [...questions];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setQuestions(pool);
    setCurrentIndex(0);
    setUserAnswer('');
    setAnswerState('idle');
    setScore(0);
    setTotalAttempts(0);
  };

  if (loading) return <main className="practice-page practice-page--center">错题加载中...</main>;

  if (error) {
    return (
      <main className="practice-page practice-page--center">
        <div className="empty-state">
          <h1>加载失败</h1>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/')}>返回首页</button>
        </div>
      </main>
    );
  }

  const isFinished = currentIndex >= questions.length;

  return (
    <main className="practice-page review-page">
      <nav className="practice-nav">
        <button className="ghost-button" type="button" onClick={() => navigate('/')}>返回</button>
        <div className="practice-meta">
          <span>错题回顾</span>
          <span>{mistakes.length} 道错题</span>
        </div>
      </nav>

      {mistakes.length === 0 ? (
        <section className="finish-panel">
          <p className="eyebrow">Review</p>
          <h1>🎉</h1>
          <p>暂无错题记录，继续保持！</p>
          <div className="finish-actions">
            <button className="primary-button" type="button" onClick={() => navigate('/')}>返回首页</button>
          </div>
        </section>
      ) : !isFinished && current ? (
        <section className="trainer-layout">
          <div className="status-rail">
            <div className="score-block"><span>正确</span><strong>{score}</strong></div>
            <div className="score-block"><span>进度</span><strong>{currentIndex + 1}/{questions.length}</strong></div>
          </div>

          <section className="question-card">
            <div className="progress-track" aria-hidden="true"><div style={{ width: `${progress}%` }} /></div>
            <div className="question-topline">
              <span>第 {currentIndex + 1} 题</span>
              <span>错 {current.wrongCount} 次 · {current.level}</span>
            </div>

            <div className="prompt-panel prompt-panel--meaning">
              <p>中文意思</p>
              <h1>{current.meaning}</h1>
              <button className="prompt-audio-button" type="button" onClick={speakCurrent} disabled={isAudioPlaying}>
                {isAudioPlaying ? '播放中...' : '播放发音'}
              </button>
              {audioStatus && audioStatus !== '播放中...' && <small className="audio-status">{audioStatus}</small>}
            </div>

            {current.lessonTitle && (
              <small className="question-source">来源：{current.lessonTitle}</small>
            )}

            <label className="answer-field">
              <span>输入对应日文</span>
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={event => setUserAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例：ありがとう / arigatou"
                disabled={answerState === 'correct'}
              />
            </label>

            {answerState !== 'idle' && (
              <div className={`result-callout result-callout--${answerState}`}>
                <strong>{answerState === 'correct' ? '正确' : '答案不对，请修改后再试'}</strong>
                <span>{current.kanji} / {current.hiragana} / {current.romaji}</span>
                <small>{current.meaning}</small>
              </div>
            )}

            <div className="action-row action-row--space-between">
              {answerState === 'correct' ? (
                <>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => clearMistake(current.kanji, current.hiragana)}
                  >
                    移出错题本
                  </button>
                  <button className="primary-button" type="button" onClick={nextQuestion}>
                    {currentIndex >= questions.length - 1 ? '查看结果' : '下一题'}
                  </button>
                </>
              ) : (
                <button className="primary-button" type="button" onClick={checkAnswer} disabled={!userAnswer.trim()}>
                  {answerState === 'incorrect' ? '重新提交' : '提交答案'}
                </button>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="finish-panel">
          <p className="eyebrow">Review Complete</p>
          <h1>{totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 0}%</h1>
          <p>正确 {score} / {questions.length} 题，共提交 {totalAttempts} 次</p>

          {clearedIds.size > 0 && (
            <p style={{ color: '#155f4d', fontWeight: 800, margin: '0 0 18px' }}>
              已从错题本移除 {clearedIds.size} 道题
            </p>
          )}

          <div className="finish-actions">
            <button className="primary-button" type="button" onClick={restart}>再练一次</button>
            <button className="ghost-button ghost-button--dark" type="button" onClick={clearAllMistakes}>清空错题本</button>
            <button className="ghost-button" type="button" onClick={() => navigate('/')}>返回首页</button>
          </div>
        </section>
      )}
    </main>
  );
};

export default ReviewPage;
