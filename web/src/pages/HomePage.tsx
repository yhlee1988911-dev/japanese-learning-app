import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type PromptMode = 'meaning' | 'audio' | 'mixed' | 'sentence';

const levels: Array<{
  id: Level;
  title: string;
  subtitle: string;
  tone: string;
}> = [
  { id: 'N5', title: 'N5', subtitle: '入门词汇', tone: 'fresh' },
  { id: 'N4', title: 'N4', subtitle: '日常基础', tone: 'mint' },
  { id: 'N3', title: 'N3', subtitle: '中级表达', tone: 'sky' },
  { id: 'N2', title: 'N2', subtitle: '进阶商务', tone: 'amber' },
  { id: 'N1', title: 'N1', subtitle: '高阶语感', tone: 'rose' }
];

const modes: Array<{
  id: PromptMode;
  label: string;
  description: string;
}> = [
  { id: 'meaning', label: '中文意思', description: '看中文，输入日文' },
  { id: 'audio', label: '日文发音', description: '听发音，输入日文' },
  { id: 'mixed', label: '混合模式', description: '中文和发音交替出现' },
  { id: 'sentence', label: '短句填空', description: '根据短句与释义补全日文' }
];

const counts = [5, 10, 20, 50];

const clampCount = (value: number) => Math.min(200, Math.max(1, Math.round(value || 1)));

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<Level>('N5');
  const [mode, setMode] = useState<PromptMode>('meaning');
  const [count, setCount] = useState(10);
  const [countInput, setCountInput] = useState('10');
  const [autoNext, setAutoNext] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const selectedLevelMeta = useMemo(
    () => levels.find(level => level.id === selectedLevel) || levels[0],
    [selectedLevel]
  );

  const startPractice = () => {
    const safeCount = clampCount(Number(countInput));
    setCount(safeCount);
    setCountInput(String(safeCount));
    const params = new URLSearchParams({
      level: selectedLevel,
      mode,
      count: String(safeCount),
      autoNext: String(autoNext),
      autoSpeak: String(autoSpeak)
    });

    navigate(`/practice?${params.toString()}`);
  };

  return (
    <main className="home-shell">
      <section className="practice-studio">
        <div className="studio-header">
          <div className="studio-header__left">
            <img src="/icons/icon.svg" alt="Logo" className="studio-logo" />
            <div>
              <p className="eyebrow">日本語 Vocabulary Trainer</p>
              <h1>词汇记忆训练</h1>
            </div>
          </div>
          <div className="daily-chip">
            <span className="daily-chip__value">{selectedLevel}</span>
            <span>今日练习</span>
          </div>
        </div>

        <div className="studio-grid">
          <section className="setup-panel">
            <div className="section-heading">
              <span className="step-mark">1</span>
              <h2>选择难度</h2>
            </div>

            <div className="level-grid" aria-label="选择考试词汇难度">
              {levels.map(level => (
                <button
                  key={level.id}
                  className={`level-tile level-tile--${level.tone} ${selectedLevel === level.id ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedLevel(level.id)}
                >
                  <span className="level-title">{level.title}</span>
                  <span className="level-subtitle">{level.subtitle}</span>
                </button>
              ))}
              <button
                className="level-tile level-tile--review"
                type="button"
                onClick={() => navigate(`/review?autoNext=${autoNext}&autoSpeak=${autoSpeak}`)}
              >
                <span className="level-title">错题回顾</span>
                <span className="level-subtitle">巩固记忆</span>
              </button>
            </div>

            <div className="section-heading">
              <span className="step-mark">2</span>
              <h2>出题方式</h2>
            </div>

            <div className="mode-control" role="tablist" aria-label="出题方式">
              {modes.map(item => (
                <button
                  key={item.id}
                  className={`mode-option ${mode === item.id ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => setMode(item.id)}
                >
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>

            <div className="section-heading">
              <span className="step-mark">3</span>
              <h2>题量</h2>
            </div>

            <div className="count-control" aria-label="选择题量">
              {counts.map(item => (
                <button
                  key={item}
                  className={count === item ? 'is-selected' : ''}
                  type="button"
                  onClick={() => {
                    setCount(item);
                    setCountInput(String(item));
                  }}
                >
                  {item}
                </button>
              ))}
              <label className="custom-count">
                <span>自定义</span>
                <input
                  aria-label="自定义题量，1到200题"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={countInput}
                  onChange={event => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 3);
                    const corrected = Number(digits) > 200 ? '200' : digits;
                    setCountInput(corrected);
                    if (corrected) setCount(clampCount(Number(corrected)));
                  }}
                  onBlur={() => {
                    const nextCount = clampCount(Number(countInput));
                    setCount(nextCount);
                    setCountInput(String(nextCount));
                  }}
                />
                <small>1-200</small>
              </label>
            </div>

            <label className="auto-next-control">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={event => setAutoNext(event.target.checked)}
              />
              <span aria-hidden="true" />
              <strong>答对后自动进入下一题</strong>
            </label>
            <label className="auto-next-control">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={event => setAutoSpeak(event.target.checked)}
              />
              <span aria-hidden="true" />
              <strong>自动朗读题目</strong>
            </label>
          </section>

          <aside className="session-panel">
            <div className={`session-badge session-badge--${selectedLevelMeta.tone}`}>
              {selectedLevelMeta.title}
            </div>
            <h2>{selectedLevelMeta.subtitle}</h2>
            <dl className="session-summary">
              <div>
                <dt>提示</dt>
                <dd>{modes.find(item => item.id === mode)?.label}</dd>
              </div>
              <div>
                <dt>题量</dt>
                <dd>{count} 题</dd>
              </div>
              <div>
                <dt>输入</dt>
                <dd>日文 / 假名 / 罗马音</dd>
              </div>
              <div>
                <dt>切题</dt>
                <dd>{autoNext ? '答对自动跳转' : '回车或按钮'}</dd>
              </div>
              <div>
                <dt>朗读</dt>
                <dd>{autoSpeak ? '自动朗读' : '手动播放'}</dd>
              </div>
            </dl>
            <button className="start-button" type="button" onClick={startPractice}>
              开始练习
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
