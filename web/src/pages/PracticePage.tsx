import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadCourseData, loadVocabulary, parseLevel } from '../services/learningData';
import { updateLessonProgress } from '../services/progressStorage';
import { recordMistake } from '../services/reviewStorage';
import { VocabularyWord } from '../types/learning';
import '../styles/PracticePage.css';

type PromptMode = 'meaning' | 'audio' | 'mixed' | 'sentence';
type AnswerState = 'idle' | 'correct' | 'incorrect';

// ========== 练习题目 ==========
interface PracticeQuestion {
  sessionId: string;
  wordId: string;
  lessonId: string;
  prompt: string;       // 题目提示（中文意思 或 空）
  speech: string;       // 用于 TTS 的文本
  answers: string[];    // 可接受的答案列表
  meaning: string;      // 中文意思
  explanation: string;  // 显示用
  word: string;         // 日语词
  kana: string;         // 假名
  romaji: string;       // 罗马音
  accent: string;
  pos: string;
  lessonTitle?: string;
}

// ========== 工具函数 ==========
const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }
  return copy;
};

const normalizeAnswer = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '').replace(/[ー－]/g, '-');

const getPromptMode = (value: string | null): PromptMode => {
  if (value === 'audio' || value === 'mixed' || value === 'sentence') return value;
  return 'meaning';
};

const clampCount = (value: number) => Math.min(200, Math.max(1, Math.round(value || 10)));

const buildQuestionSet = (pool: PracticeQuestion[], count: number) => {
  const shuffled = shuffle([...pool]);
  const result: PracticeQuestion[] = [];
  if (shuffled.length === 0) return result;
  if (shuffled.length >= count) {
    for (let i = 0; i < count; i++) {
      result.push({ ...shuffled[i], sessionId: `${shuffled[i].sessionId}-${i}` });
    }
    return result;
  }
  let index = 0;
  while (result.length < count) {
    const item = shuffled[index % shuffled.length];
    result.push({ ...item, sessionId: `${item.sessionId}-${result.length}` });
    index++;
  }
  return result;
};

// ========== 主组件 ==========
const PracticePage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAudioPlayingRef = useRef(false);
  const speechTimerRef = useRef<number | null>(null);
  const missedIdsRef = useRef(new Set<string>());
  const progressSavedRef = useRef(false);

  const levelParam = searchParams.get('level');
  const parsedLevel = parseLevel(levelParam);
  const level = parsedLevel || 'N5';
  const invalidLevel = Boolean(levelParam && !parsedLevel);
  const mode = getPromptMode(searchParams.get('mode'));
  const requestedCount = clampCount(Number(searchParams.get('count') || 10));
  const autoNext = searchParams.get('autoNext') === 'true';
  const autoSpeak = searchParams.get('autoSpeak') !== 'false';

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState('');
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');

  const current = questions[currentIndex];
  const isFinished = questions.length > 0 && currentIndex >= questions.length;
  const completed = answerState === 'correct' ? currentIndex + 1 : currentIndex;
  const progress = questions.length > 0 ? (completed / questions.length) * 100 : 0;
  const activeMode: PromptMode = mode === 'mixed'
    ? currentIndex % 2 === 0 ? 'meaning' : 'audio'
    : mode;

  // iOS 输入法滚动修正
  const scrollPositionRef = useRef(0);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!isIOS || !vv) return;
    const handleViewportResize = () => {
      if (document.activeElement?.tagName === 'INPUT') {
        window.scrollTo(0, scrollPositionRef.current);
      }
    };
    vv.addEventListener('resize', handleViewportResize);
    return () => vv.removeEventListener('resize', handleViewportResize);
  }, [isIOS]);

  const handleInputFocus = useCallback(() => {
    if (!isIOS) return;
    scrollPositionRef.current = window.scrollY;
  }, [isIOS]);

  const handleInputBlur = useCallback(() => {
    if (!isIOS) return;
    window.scrollTo(0, scrollPositionRef.current);
  }, [isIOS]);

  // 音效
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((type: 'correct' | 'incorrect') => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'correct') {
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.value = 220;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch { /* ignore */ }
  }, [getAudioCtx]);

  // TTS
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const japaneseVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const findJapaneseVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voices.length === 0) return null;
    const jaJP = voices.find(v => v.lang === 'ja-JP');
    if (jaJP) { japaneseVoiceRef.current = jaJP; return jaJP; }
    const jaAny = voices.find(v => v.lang.startsWith('ja'));
    if (jaAny) { japaneseVoiceRef.current = jaAny; return jaAny; }
    japaneseVoiceRef.current = null;
    return null;
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis || !window.speechSynthesis.onvoiceschanged) return;
    const handleVoicesChanged = () => { findJapaneseVoice(); };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, [findJapaneseVoice]);

  const warmupSpeech = useCallback(() => {
    if (!window.speechSynthesis) return;
    try {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
      window.speechSynthesis.cancel();
    } catch { /* ignore */ }
  }, []);

  const speakWithOpenAI = useCallback(async (text: string): Promise<boolean> => {
    try {
      const cached = audioCacheRef.current.get(text);
      if (cached) {
        cached.currentTime = 0;
        await cached.play().catch(() => {});
        return true;
      }
      const response = await fetch('/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return false;
      const blob = await response.blob();
      if (blob.size === 0) return false;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioCacheRef.current.set(text, audio);
      return new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        audio.play().catch(() => { URL.revokeObjectURL(url); resolve(false); });
      });
    } catch { return false; }
  }, []);

  const speakWithDevice = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.82;
      const voice = findJapaneseVoice();
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }, [findJapaneseVoice]);

  const stopAudio = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
    speechTimerRef.current = null;
    isAudioPlayingRef.current = false;
    setIsAudioPlaying(false);
    setAudioStatus('');
  }, []);

  const speakCurrent = useCallback(async () => {
    if (!current || isAudioPlayingRef.current) return;
    const text = current.speech;
    isAudioPlayingRef.current = true;
    setIsAudioPlaying(true);
    setAudioStatus('播放中...');
    const finish = () => {
      if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
      isAudioPlayingRef.current = false;
      setIsAudioPlaying(false);
      setAudioStatus('');
    };
    speechTimerRef.current = window.setTimeout(finish, 12000);
    const openaiSuccess = await speakWithOpenAI(text);
    if (openaiSuccess) { finish(); return; }
    setAudioStatus('使用设备语音...');
    await speakWithDevice(text);
    finish();
  }, [current, speakWithOpenAI, speakWithDevice]);

  const resetQuestionState = useCallback(() => {
    stopAudio();
    setUserAnswer('');
    setAnswerState('idle');
  }, [stopAudio]);

  const nextQuestion = useCallback(() => {
    resetQuestionState();
    setCurrentIndex(index => Math.min(index + 1, questions.length));
  }, [questions.length, resetQuestionState]);

  // ========== 加载数据 ==========
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (mode === 'sentence') {
          setError('短句填空模式暂不支持，请选择其他模式');
          setLoading(false);
          return;
        }

        if (invalidLevel) throw new Error(`不支持的等级: ${levelParam}`);

        const courseData = lessonId ? await loadCourseData(level) : null;
        const wordData = courseData?.vocabulary || await loadVocabulary(level);
        const lessonsData = courseData?.lessons || null;

        let pool: PracticeQuestion[] = [];
        let lessonTitle = '';

        if (lessonId) {
          // 课程模式：按课程过滤
          if (!lessonsData) throw new Error(`课程题单加载失败: ${level}`);
          const lesson = lessonsData.lessons.find(l => l.id === lessonId);
          if (!lesson) throw new Error(`未找到课程: ${lessonId}`);
          lessonTitle = lesson.title;
          setCurrentLessonTitle(lesson.title);
          const wordMap = new Map(wordData.words.map(w => [w.id, w]));
          const missingWordIds = lesson.wordIds.filter(id => !wordMap.has(id));
          if (missingWordIds.length > 0) {
            throw new Error(`课程词汇缺失: ${missingWordIds.join(', ')}`);
          }
          pool = lesson.wordIds
            .map(id => wordMap.get(id))
            .filter((w): w is VocabularyWord => !!w)
            .map((w, i) => wordToQuestion(w, i, lesson.title, lesson.id));
        } else {
          // 随机模式：全部词
          pool = wordData.words.map((w, i) => wordToQuestion(w, i, ''));
        }

        setQuestions(buildQuestionSet(pool, lessonId ? pool.length : requestedCount));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '题库加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return stopAudio;
  }, [invalidLevel, lessonId, level, levelParam, mode, requestedCount, stopAudio]);

  const wordToQuestion = (
    w: VocabularyWord,
    index: number,
    lessonTitle: string,
    activeLessonId?: string
  ): PracticeQuestion => ({
    sessionId: `${w.id}-${index}`,
    wordId: w.id,
    lessonId: activeLessonId || w.primaryLessonId || w.lessonIds[0] || `${level.toLowerCase()}_random`,
    prompt: w.meaning,
    speech: w.kana || w.word,
    answers: [w.word, w.kana, w.romaji].filter(Boolean),
    meaning: w.meaning,
    explanation: `${w.word} / ${w.kana} / ${w.romaji}`,
    word: w.word,
    kana: w.kana,
    romaji: w.romaji,
    accent: w.accent,
    pos: w.pos,
    lessonTitle: lessonTitle || undefined,
  });

  useEffect(() => {
    if (loading) return undefined;
    if (activeMode === 'audio' || autoSpeak) {
      const timer = window.setTimeout(speakCurrent, 250);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeMode, loading, speakCurrent, autoSpeak]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex, answerState]);

  useEffect(() => {
    if (answerState !== 'correct' || !autoNext) return undefined;
    const timer = window.setTimeout(nextQuestion, 700);
    return () => window.clearTimeout(timer);
  }, [answerState, autoNext, nextQuestion]);

  useEffect(() => {
    progressSavedRef.current = false;
  }, [lessonId]);

  useEffect(() => {
    if (isFinished && lessonId && !progressSavedRef.current) {
      progressSavedRef.current = true;
      const firstTryCorrect = Math.max(0, questions.length - missed.length);
      updateLessonProgress(level, lessonId, firstTryCorrect, questions.length);
    }
  }, [isFinished, lessonId, level, missed.length, questions.length]);

  const acceptedAnswers = useMemo(() => (
    current ? current.answers.filter(Boolean).map(normalizeAnswer) : []
  ), [current]);

  const checkAnswer = async () => {
    if (!current || answerState === 'correct' || checkingAnswer || !userAnswer.trim()) return;
    setCheckingAnswer(true);
    const isCorrect = acceptedAnswers.includes(normalizeAnswer(userAnswer));
    if (isCorrect) {
      playSound('correct');
      setScore(value => value + 1);
      setAnswerState('correct');
    } else {
      playSound('incorrect');
      setAnswerState('incorrect');
      if (!missedIdsRef.current.has(current.sessionId)) {
        missedIdsRef.current.add(current.sessionId);
        setMissed(items => [...items, current]);
        recordMistake(level, current.lessonId, current.wordId);
      }
    }
    setCheckingAnswer(false);
  };

  const restart = () => {
    stopAudio();
    setQuestions(items => shuffle(items).map((item, index) => ({ ...item, sessionId: `${item.sessionId}-r${index}` })));
    setCurrentIndex(0);
    setUserAnswer('');
    setAnswerState('idle');
    setScore(0);
    setMissed([]);
    missedIdsRef.current.clear();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (answerState === 'correct') { nextQuestion(); return; }
    checkAnswer();
  };

  // ========== 渲染 ==========
  if (loading) return <main className="practice-page practice-page--center">题库加载中...</main>;

  if (error || questions.length === 0) {
    return (
      <main className="practice-page practice-page--center">
        <div className="empty-state">
          <h1>没有找到题目</h1>
          <p>{error || `${level} 暂无可练习内容`}</p>
          <button type="button" onClick={() => navigate('/')}>返回首页</button>
        </div>
      </main>
    );
  }

  const totalAttempts = score + missed.length;
  const accuracy = totalAttempts ? Math.round((score / totalAttempts) * 100) : 0;
  const modeLabel = mode === 'meaning' ? '中文意思' : mode === 'audio' ? '日文发音' : mode === 'sentence' ? '短句填空' : '混合模式';

  return (
    <main className="practice-page">
      <nav className="practice-nav">
        <button className="ghost-button" type="button" onClick={() => navigate('/')}>返回</button>
        <div className="practice-meta">
          <span>{level}</span>
          <span>{modeLabel}</span>
          {currentLessonTitle && <span className="lesson-badge">{currentLessonTitle}</span>}
        </div>
      </nav>

      {!isFinished && current ? (
        <section className="trainer-layout">
          <div className="status-rail">
            <div className="score-block"><span>完成</span><strong>{score}</strong></div>
            <div className="score-block"><span>进度</span><strong>{currentIndex + 1}/{questions.length}</strong></div>
          </div>

          <section className="question-card">
            <div className="progress-track" aria-hidden="true"><div style={{ width: `${progress}%` }} /></div>
            <div className="question-topline">
              <span>第 {currentIndex + 1} 题</span>
              <div className="question-topline-actions">
                <span>{current.lessonTitle || level}</span>
                <button className="skip-question-button" type="button" onClick={nextQuestion}>下一题</button>
              </div>
            </div>
            {(current.accent || current.pos) && (
              <div className="vocab-tags">
                {current.accent && <span className="tag tag--pitch">{current.accent}</span>}
                {current.pos && <span className="tag tag--pos">{current.pos}</span>}
              </div>
            )}

            <div className={`prompt-panel prompt-panel--${activeMode}`}>
              {activeMode === 'meaning' ? (
                <>
                  <p>中文意思</p>
                  <h1>{current.meaning}</h1>
                  <button className="prompt-audio-button" type="button" onClick={speakCurrent} disabled={isAudioPlaying}>
                    {isAudioPlaying ? '播放中...' : '播放发音'}
                  </button>
                </>
              ) : (
                <>
                  <p>日文发音</p>
                  <button className="audio-button" type="button" onClick={speakCurrent} disabled={isAudioPlaying}>
                    {isAudioPlaying ? '播放中...' : '播放'}
                  </button>
                </>
              )}
              {audioStatus && audioStatus !== '播放中...' && <small className="audio-status">{audioStatus}</small>}
            </div>

            <label className="answer-field">
              <span>输入对应日文</span>
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={event => setUserAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="例：ありがとう / arigatou"
                disabled={answerState === 'correct' || checkingAnswer}
              />
            </label>

            {answerState !== 'idle' && (
              <div className={`result-callout result-callout--${answerState}`}>
                <strong>{answerState === 'correct' ? '正确' : '答案不对，请修改后再试'}</strong>
                <span>{current.explanation}</span>
                <small>{current.meaning}</small>
              </div>
            )}

            <div className="action-row">
              {answerState === 'correct' ? (
                <button className="primary-button" type="button" onClick={nextQuestion}>
                  {currentIndex >= questions.length - 1 ? '查看结果' : '下一题'}
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={checkAnswer} disabled={checkingAnswer || !userAnswer.trim()}>
                  {checkingAnswer ? '判断中...' : answerState === 'incorrect' ? '重新提交' : '提交答案'}
                </button>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="finish-panel">
          <p className="eyebrow">Session Complete</p>
          <h1>{accuracy}%</h1>
          <p>完成 {score} / {questions.length} 题</p>

          {missed.length > 0 && (
            <div className="missed-list">
              <h2>需要复习</h2>
              {missed.slice(0, 8).map(item => (
                <div key={item.sessionId}>
                  <span>{item.word}</span>
                  <small>{item.explanation} · {item.meaning}</small>
                </div>
              ))}
            </div>
          )}

          <div className="finish-actions">
            <button className="primary-button" type="button" onClick={restart}>再练一次</button>
            <button className="ghost-button ghost-button--dark" type="button" onClick={() => navigate('/')}>更换设置</button>
          </div>
        </section>
      )}
    </main>
  );
};

export default PracticePage;
