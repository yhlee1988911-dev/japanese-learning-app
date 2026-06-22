import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { api, getTtsUrl } from '../services/api';

type PromptMode = 'meaning' | 'audio' | 'mixed' | 'sentence';
type AnswerState = 'idle' | 'correct' | 'incorrect';
type QuestionKind = 'vocabulary' | 'sentence';

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
}

interface KindStats {
  attempts: number;
  correct: number;
}

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

const buildQuestionSet = (pool: PracticeQuestion[], count: number) => {
  const result: PracticeQuestion[] = [];
  if (pool.length === 0) return result;
  while (result.length < count) {
    const batch = shuffle(pool);
    for (const question of batch) {
      if (result.length >= count) break;
      result.push({ ...question, sessionId: `${question.sessionId}-${result.length}` });
    }
  }
  return result;
};

export default function PracticeScreen({ route, navigation }: any) {
  const { level, mode: initialMode, count: requestedCount, autoNext } = route.params;
  const inputRef = useRef<TextInput>(null);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState<Record<QuestionKind, KindStats>>({
    vocabulary: { attempts: 0, correct: 0 },
    sentence: { attempts: 0, correct: 0 }
  });
  const [missed, setMissed] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const missedIdsRef = useRef(new Set<string>());

  const current = questions[currentIndex];
  const completed = answerState === 'correct' ? currentIndex + 1 : currentIndex;
  const progress = questions.length > 0 ? (completed / questions.length) * 100 : 0;
  const activeMode: PromptMode = initialMode === 'mixed'
    ? currentIndex % 2 === 0 ? 'meaning' : 'audio'
    : initialMode;

  const speakCurrent = useCallback(() => {
    if (!current || isAudioPlaying) return;
    setIsAudioPlaying(true);

    const text = current.speech;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.82;
    utterance.onend = () => setIsAudioPlaying(false);
    utterance.onerror = () => setIsAudioPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [current, isAudioPlaying]);

  const resetQuestionState = useCallback(() => {
    setUserAnswer('');
    setAnswerState('idle');
  }, []);

  const nextQuestion = useCallback(() => {
    resetQuestionState();
    setCurrentIndex(index => Math.min(index + 1, questions.length));
  }, [questions.length, resetQuestionState]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const endpoint = initialMode === 'sentence'
          ? `/sentences/level/${level}`
          : `/vocabulary/level/${level}`;
        const response = await api.get<any[]>(endpoint);

        if (initialMode === 'sentence') {
          const pool = response.map<PracticeQuestion>((item: any) => ({
            sessionId: item.id,
            kind: 'sentence',
            level: item.level,
            prompt: item.sentence,
            speech: item.speech,
            answers: item.answers,
            meaning: item.meaning,
            explanation: item.explanation
          }));
          setQuestions(buildQuestionSet(pool, requestedCount));
        } else {
          const pool = response.map<PracticeQuestion>((item: any, index: number) => ({
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
            romaji: item.romaji
          }));
          setQuestions(buildQuestionSet(pool, requestedCount));
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '题库加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [level, initialMode, requestedCount]);

  useEffect(() => {
    if (!loading && activeMode === 'audio') {
      const timer = setTimeout(speakCurrent, 500);
      return () => clearTimeout(timer);
    }
  }, [activeMode, loading, speakCurrent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex, answerState]);

  useEffect(() => {
    if (answerState !== 'correct' || !autoNext) return;
    const timer = setTimeout(nextQuestion, 700);
    return () => clearTimeout(timer);
  }, [answerState, autoNext, nextQuestion]);

  const acceptedAnswers = useMemo(() => (
    current ? current.answers.filter(Boolean).map(normalizeAnswer) : []
  ), [current]);

  const checkAnswer = async () => {
    if (!current || answerState === 'correct' || checkingAnswer || !userAnswer.trim()) return;

    setCheckingAnswer(true);
    const isCorrect = acceptedAnswers.includes(normalizeAnswer(userAnswer));

    setStats(prev => ({
      ...prev,
      [current.kind]: {
        attempts: prev[current.kind].attempts + 1,
        correct: prev[current.kind].correct + (isCorrect ? 1 : 0)
      }
    }));

    if (isCorrect) {
      setScore(v => v + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
      if (!missedIdsRef.current.has(current.sessionId)) {
        missedIdsRef.current.add(current.sessionId);
        setMissed(items => [...items, current]);
      }
    }
    setCheckingAnswer(false);
  };

  const restart = () => {
    setQuestions(items => shuffle(items).map((item, index) => ({
      ...item,
      sessionId: `${item.sessionId}-r${index}`
    })));
    setCurrentIndex(0);
    setUserAnswer('');
    setAnswerState('idle');
    setScore(0);
    setStats({ vocabulary: { attempts: 0, correct: 0 }, sentence: { attempts: 0, correct: 0 } });
    setMissed([]);
    missedIdsRef.current.clear();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>题库加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>没有找到题目</Text>
          <Text style={styles.errorText}>{error || `${level} 暂无可练习内容`}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>返回设置</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFinished = currentIndex >= questions.length;
  const totalAttempts = stats.vocabulary.attempts + stats.sentence.attempts;
  const totalCorrect = stats.vocabulary.correct + stats.sentence.correct;
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const modeLabel = initialMode === 'meaning' ? '中文意思'
    : initialMode === 'audio' ? '日文发音'
    : initialMode === 'sentence' ? '短句填空' : '混合模式';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {!isFinished && current ? (
        <View style={styles.practiceContainer}>
          {/* Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.navBack}>返回</Text>
            </TouchableOpacity>
            <View style={styles.navMeta}>
              <Text style={styles.navMetaText}>{level}</Text>
              <Text style={styles.navMetaText}>{modeLabel}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContent}>
            {/* Score & Progress */}
            <View style={styles.statusRow}>
              <View style={styles.statusBlock}>
                <Text style={styles.statusLabel}>完成</Text>
                <Text style={styles.statusValue}>{score}</Text>
              </View>
              <View style={styles.statusBlock}>
                <Text style={styles.statusLabel}>进度</Text>
                <Text style={styles.statusValue}>{currentIndex + 1}/{questions.length}</Text>
              </View>
            </View>

            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.questionTopline}>
                <Text style={styles.questionNumber}>第 {currentIndex + 1} 题</Text>
                <Text style={styles.questionTag}>
                  {current.lessonTitle || (current.kind === 'sentence' ? '短句填空' : current.level)}
                </Text>
              </View>

              {/* Prompt */}
              <View style={styles.promptPanel}>
                {current.kind === 'sentence' ? (
                  <>
                    <Text style={styles.promptLabel}>补全短句</Text>
                    <Text style={styles.sentencePrompt}>{current.prompt}</Text>
                    <Text style={styles.sentenceMeaning}>{current.meaning}</Text>
                    <TouchableOpacity
                      style={styles.audioButton}
                      onPress={speakCurrent}
                      disabled={isAudioPlaying}
                    >
                      <Text style={styles.audioButtonText}>
                        {isAudioPlaying ? '播放中...' : '播放短句'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : activeMode === 'meaning' ? (
                  <>
                    <Text style={styles.promptLabel}>中文意思</Text>
                    <Text style={styles.promptText}>{current.meaning}</Text>
                    <TouchableOpacity
                      style={styles.audioButton}
                      onPress={speakCurrent}
                      disabled={isAudioPlaying}
                    >
                      <Text style={styles.audioButtonText}>
                        {isAudioPlaying ? '播放中...' : '播放发音'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.promptLabel}>日文发音</Text>
                    <TouchableOpacity
                      style={[styles.audioButton, styles.audioButtonLarge]}
                      onPress={speakCurrent}
                      disabled={isAudioPlaying}
                    >
                      <Text style={styles.audioButtonText}>
                        {isAudioPlaying ? '播放中...' : '播放'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Answer Input */}
              <View style={styles.answerSection}>
                <Text style={styles.answerLabel}>
                  {current.kind === 'sentence' ? '填写空缺内容' : '输入对应日文'}
                </Text>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.answerInput,
                    answerState === 'correct' && styles.answerInputCorrect,
                    answerState === 'incorrect' && styles.answerInputIncorrect
                  ]}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder={current.kind === 'sentence' ? '输入汉字、假名或罗马音' : '例：ありがとう'}
                  placeholderTextColor="#bbb"
                  editable={answerState !== 'correct' && !checkingAnswer}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={checkAnswer}
                />
              </View>

              {/* Result */}
              {answerState !== 'idle' && (
                <View style={[
                  styles.resultCallout,
                  answerState === 'correct' ? styles.resultCorrect : styles.resultIncorrect
                ]}>
                  <Text style={styles.resultTitle}>
                    {answerState === 'correct' ? '✓ 正确' : '✗ 答案不对'}
                  </Text>
                  <Text style={styles.resultExplanation}>{current.explanation}</Text>
                  <Text style={styles.resultMeaning}>{current.meaning}</Text>
                </View>
              )}

              {/* Action Button */}
              <View style={styles.actionRow}>
                {answerState === 'correct' ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={nextQuestion}
                    disabled={autoNext}
                  >
                    <Text style={styles.primaryButtonText}>
                      {autoNext ? '即将进入下一题' :
                       currentIndex >= questions.length - 1 ? '查看结果' : '下一题'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (!userAnswer.trim() || checkingAnswer) && styles.primaryButtonDisabled
                    ]}
                    onPress={checkAnswer}
                    disabled={!userAnswer.trim() || checkingAnswer}
                  >
                    <Text style={styles.primaryButtonText}>
                      {checkingAnswer ? '判断中...' :
                       answerState === 'incorrect' ? '重新提交' : '提交答案'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        /* Finish Screen */
        <ScrollView style={styles.finishContainer} contentContainerStyle={styles.finishContent}>
          <Text style={styles.finishEyebrow}>Session Complete</Text>
          <Text style={styles.finishScore}>{accuracy}%</Text>
          <Text style={styles.finishDetail}>
            完成 {score} / {questions.length} 题，共提交 {totalAttempts} 次
          </Text>

          {stats.vocabulary.attempts > 0 && (
            <View style={styles.accuracyRow}>
              <Text style={styles.accuracyLabel}>词汇题正确率</Text>
              <Text style={styles.accuracyValue}>
                {Math.round((stats.vocabulary.correct / stats.vocabulary.attempts) * 100)}%
              </Text>
              <Text style={styles.accuracyDetail}>
                ({stats.vocabulary.correct}/{stats.vocabulary.attempts} 次)
              </Text>
            </View>
          )}
          {stats.sentence.attempts > 0 && (
            <View style={styles.accuracyRow}>
              <Text style={styles.accuracyLabel}>短句题正确率</Text>
              <Text style={styles.accuracyValue}>
                {Math.round((stats.sentence.correct / stats.sentence.attempts) * 100)}%
              </Text>
              <Text style={styles.accuracyDetail}>
                ({stats.sentence.correct}/{stats.sentence.attempts} 次)
              </Text>
            </View>
          )}

          {missed.length > 0 && (
            <View style={styles.missedSection}>
              <Text style={styles.missedTitle}>需要复习</Text>
              {missed.slice(0, 8).map(item => (
                <View key={item.sessionId} style={styles.missedItem}>
                  <Text style={styles.missedItemText}>
                    {item.kind === 'sentence' ? item.prompt : item.kanji}
                  </Text>
                  <Text style={styles.missedItemDetail}>
                    {item.explanation} · {item.meaning}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.finishActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={restart}>
              <Text style={styles.primaryButtonText}>再练一次</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.ghostButtonText}>更换设置</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center'
  },
  backButton: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  practiceContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  topNav: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  navBack: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  navMeta: {
    flexDirection: 'row',
    gap: 12
  },
  navMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2
  },
  questionScroll: {
    flex: 1
  },
  questionContent: {
    padding: 16,
    paddingBottom: 40
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  statusBlock: {
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  statusValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#667eea'
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  questionTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  questionNumber: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500'
  },
  questionTag: {
    fontSize: 12,
    color: '#667eea',
    backgroundColor: '#eef0ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden'
  },
  promptPanel: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16
  },
  promptLabel: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 8
  },
  promptText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12
  },
  sentencePrompt: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  sentenceMeaning: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12
  },
  audioButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 8
  },
  audioButtonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 40
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  answerSection: {
    marginBottom: 16
  },
  answerLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500'
  },
  answerInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e8e8e8'
  },
  answerInputCorrect: {
    borderColor: '#4caf50',
    backgroundColor: '#f0faf0'
  },
  answerInputIncorrect: {
    borderColor: '#f44336',
    backgroundColor: '#fef0f0'
  },
  resultCallout: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  resultCorrect: {
    backgroundColor: '#f0faf0'
  },
  resultIncorrect: {
    backgroundColor: '#fef0f0'
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6
  },
  resultExplanation: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  resultMeaning: {
    fontSize: 12,
    color: '#999'
  },
  actionRow: {
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  primaryButtonDisabled: {
    opacity: 0.5
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  finishContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  finishContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40
  },
  finishEyebrow: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8
  },
  finishScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8
  },
  finishDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center'
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    width: '100%'
  },
  accuracyLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666'
  },
  accuracyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginRight: 8
  },
  accuracyDetail: {
    fontSize: 12,
    color: '#999'
  },
  missedSection: {
    width: '100%',
    marginTop: 16,
    marginBottom: 24
  },
  missedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  missedItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336'
  },
  missedItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  missedItemDetail: {
    fontSize: 12,
    color: '#999'
  },
  finishActions: {
    width: '100%',
    gap: 12
  },
  ghostButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea'
  },
  ghostButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600'
  }
});
