import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import '../styles/PracticePage.css';

type PromptMode = 'meaning' | 'audio' | 'mixed' | 'sentence';
type AnswerState = 'idle' | 'correct' | 'incorrect';
type QuestionKind = 'vocabulary' | 'sentence';

interface ContentSource {
  name: string;
  url: string;
  license: string;
  author?: string;
  translationAuthor?: string;
}

interface VocabularyItem {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  level: string;
  pitch?: string;
  pos?: string;
  lessonTitle?: string;
  source?: ContentSource;
}

interface PracticeQuestion {
  sessionId: string;
  kind: QuestionKind;
  level: string;
  lessonTitle?: string;
  prompt: string;
  speech: string;
  answers: string[];
  meaning: string;
  explanation: string;
  kanji?: string;
  hiragana?: string;
  romaji?: string;
  pitch?: string;
  pos?: string;
  source?: ContentSource;
}

interface KindStats {
  attempts: number;
  correct: number;
}

const emptyStats = (): Record<QuestionKind, KindStats> => ({
  vocabulary: { attempts: 0, correct: 0 },
  sentence: { attempts: 0, correct: 0 }
});

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
  // 先彻底打乱 pool
  const shuffled = shuffle([...pool]);
  const result: PracticeQuestion[] = [];

  if (shuffled.length === 0) return result;

  // 如果 pool 足够大，直接取前 count 个
  if (shuffled.length >= count) {
    for (let i = 0; i < count; i++) {
      result.push({ ...shuffled[i], sessionId: `${shuffled[i].sessionId}-${i}` });
    }
    return result;
  }

  // pool 不够大时，循环取并确保 sessionId 唯一
  let index = 0;
  while (result.length < count) {
    const item = shuffled[index % shuffled.length];
    result.push({ ...item, sessionId: `${item.sessionId}-${result.length}` });
    index++;
  }

  return result;
};


const getAccuracy = (stats: KindStats) => (
  stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0
);

const PracticePage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAudioPlayingRef = useRef(false);
  const speechTimerRef = useRef<number | null>(null);
  const missedIdsRef = useRef(new Set<string>());

  const level = searchParams.get('level') || 'N5';
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
  const [stats, setStats] = useState(emptyStats);
  const [missed, setMissed] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const current = questions[currentIndex];
  const completed = answerState === 'correct' ? currentIndex + 1 : currentIndex;
  const progress = questions.length > 0 ? (completed / questions.length) * 100 : 0;
  const activeMode: PromptMode = mode === 'mixed'
    ? currentIndex % 2 === 0 ? 'meaning' : 'audio'
    : mode;

  // 防止 iOS 输入法弹出时页面自动上滚
  // 使用 visualViewport API 实时修正滚动位置
  const scrollPositionRef = useRef(0);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!isIOS || !vv) return;

    const handleViewportResize = () => {
      // 输入法弹出时 visualViewport 高度会变小，页面被顶上去
      // 立即恢复滚动位置
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

  // 用 Web Audio API 生成音效 — 全局复用 AudioContext
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // 某些浏览器在用户交互后需要 resume
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
        // 叮 — 短促高音 880Hz
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // 哔 — 低沉长音 220Hz
        osc.frequency.value = 220;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // 静默失败，不影响答题
    }
  }, [getAudioCtx]);


  // 音频缓存：避免重复请求相同文本
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 缓存找到的日语语音
  const japaneseVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  /** 查找设备上最佳的日语语音（每次调用都重新尝试，因为 Safari 上 getVoices() 可能延迟加载） */
  const findJapaneseVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voices.length === 0) return null;

    // 优先级：ja-JP 精确匹配 > ja 区域匹配 > 任何日语变体
    const jaJP = voices.find(v => v.lang === 'ja-JP');
    if (jaJP) {
      japaneseVoiceRef.current = jaJP;
      return jaJP;
    }

    const jaAny = voices.find(v => v.lang.startsWith('ja'));
    if (jaAny) {
      japaneseVoiceRef.current = jaAny;
      return jaAny;
    }

    // 实在没有日语语音，用默认语音
    japaneseVoiceRef.current = null;
    return null;
  }, []);

  /** 监听 voiceschanged 事件，等语音列表加载完成后自动查找日语语音 */
  useEffect(() => {
    if (!window.speechSynthesis || !window.speechSynthesis.onvoiceschanged) return;

    const handleVoicesChanged = () => {
      findJapaneseVoice();
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, [findJapaneseVoice]);


  /** 唤醒 SpeechSynthesis（iOS 需要用户手势触发） */
  const warmupSpeech = useCallback(() => {
    if (!window.speechSynthesis) return;
    // iOS Safari 需要先产生一个无声的 utterance 来激活
    try {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
      window.speechSynthesis.cancel();
    } catch {
      // 静默失败
    }
  }, []);

  /** 通过 Netlify Function 调用 OpenAI TTS */
  const speakWithOpenAI = useCallback(async (text: string): Promise<boolean> => {
    // 检查缓存
    const cached = audioCacheRef.current.get(text);
    if (cached) {
      cached.currentTime = 0;
      cached.play().catch(() => {});
      return true;
    }

    try {
      const response = await fetch('/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) return false;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      // 缓存
      audioCacheRef.current.set(text, audio);

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve(true);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(false);
        };
        audio.play().catch(() => resolve(false));
      });
    } catch {
      return false;
    }
  }, []);

  /** 使用设备本地 SpeechSynthesis 播放（fallback） */
  const speakWithDevice = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.82;

      const voice = findJapaneseVoice();
      if (voice) {
        utterance.voice = voice;
      }

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

    // 优先使用 OpenAI TTS
    const openaiSuccess = await speakWithOpenAI(text);
    if (openaiSuccess) {
      finish();
      return;
    }

    // OpenAI 失败，fallback 到设备语音
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

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (mode === 'sentence') {
          // sentence 模式暂不支持，显示提示
          setError('短句填空模式暂不支持，请选择其他模式');
          setLoading(false);
          return;
        }

        if (lessonId) {
          // lesson 模式暂不支持
          setError('课程模式暂不支持，请选择等级模式');
          setLoading(false);
          return;
        }

        // 从静态 JSON 文件读取
        const levelKey = level.toLowerCase();
        const response = await fetch(`/questions/${levelKey}.json`);

        if (!response.ok) throw new Error(`题库加载失败: ${level}`);

        const data: VocabularyItem[] = await response.json();
        const pool = data.map<PracticeQuestion>((item, index) => ({
          sessionId: `${item.kanji}-${item.meaning}-${index}`,
          kind: 'vocabulary',
          level: item.level,
          lessonTitle: item.lessonTitle,
          prompt: item.meaning,
          speech: item.hiragana || item.kanji,
          answers: [item.kanji, item.hiragana, item.romaji],
          meaning: item.meaning,
          explanation: `${item.kanji} / ${item.hiragana} / ${item.romaji}`,
          kanji: item.kanji,
          hiragana: item.hiragana,
          romaji: item.romaji,
          pitch: item.pitch,
          pos: item.pos,
          source: item.source
        }));
        setQuestions(buildQuestionSet(pool, requestedCount));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '题库加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
    return stopAudio;
  }, [lessonId, level, mode, requestedCount, stopAudio]);

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

  const acceptedAnswers = useMemo(() => (
    current ? current.answers.filter(Boolean).map(normalizeAnswer) : []
  ), [current]);

  const checkAnswer = async () => {
    if (!current || answerState === 'correct' || checkingAnswer || !userAnswer.trim()) return;

    setCheckingAnswer(true);

    const isCorrect = acceptedAnswers.includes(normalizeAnswer(userAnswer));

    setStats(previous => ({
      ...previous,
      [current.kind]: {
        attempts: previous[current.kind].attempts + 1,
        correct: previous[current.kind].correct + (isCorrect ? 1 : 0)
      }
    }));

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
    setStats(emptyStats());
    setMissed([]);
    missedIdsRef.current.clear();
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

  const isFinished = currentIndex >= questions.length;
  const totalAttempts = stats.vocabulary.attempts + stats.sentence.attempts;
  const totalCorrect = stats.vocabulary.correct + stats.sentence.correct;
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const modeLabel = mode === 'meaning'
    ? '中文意思'
    : mode === 'audio'
      ? '日文发音'
      : mode === 'sentence'
        ? '短句填空'
        : '混合模式';

  return (
    <main className="practice-page">
      <nav className="practice-nav">
        <button className="ghost-button" type="button" onClick={() => navigate('/')}>返回</button>
        <div className="practice-meta"><span>{level}</span><span>{modeLabel}</span></div>
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
              <span>{current.lessonTitle || (current.kind === 'sentence' ? '短句填空' : current.level)}</span>
            </div>
            {current.kind === 'vocabulary' && (current.pitch || current.pos) && (
              <div className="vocab-tags">
                {current.pitch && <span className="tag tag--pitch">{current.pitch}</span>}
                {current.pos && <span className="tag tag--pos">{current.pos}</span>}
              </div>
            )}

            <div className={`prompt-panel prompt-panel--${activeMode}`}>
              {current.kind === 'sentence' ? (
                <>
                  <p>补全短句</p>
                  <h1 className="sentence-prompt">{current.prompt}</h1>
                  <small className="sentence-meaning">{current.meaning}</small>
                  <button className="prompt-audio-button" type="button" onClick={speakCurrent} disabled={isAudioPlaying}>
                    {isAudioPlaying ? '播放中...' : '播放短句'}
                  </button>
                </>
              ) : activeMode === 'meaning' ? (
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
              <span>{current.kind === 'sentence' ? '填写空缺内容' : '输入对应日文'}</span>
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={event => setUserAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={current.kind === 'sentence' ? '输入汉字、假名或罗马音' : '例：ありがとう / arigatou'}
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
          <p>完成 {score} / {questions.length} 题，共提交 {totalAttempts} 次</p>

          <div className="accuracy-breakdown">
            {stats.vocabulary.attempts > 0 && (
              <div><span>词汇题正确率</span><strong>{getAccuracy(stats.vocabulary)}%</strong><small>{stats.vocabulary.correct}/{stats.vocabulary.attempts} 次</small></div>
            )}
            {stats.sentence.attempts > 0 && (
              <div><span>短句题正确率</span><strong>{getAccuracy(stats.sentence)}%</strong><small>{stats.sentence.correct}/{stats.sentence.attempts} 次</small></div>
            )}
          </div>

          {missed.length > 0 && (
            <div className="missed-list">
              <h2>需要复习</h2>
              {missed.slice(0, 8).map(item => (
                <div key={item.sessionId}><span>{item.kind === 'sentence' ? item.prompt : item.kanji}</span><small>{item.explanation} · {item.meaning}</small></div>
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
