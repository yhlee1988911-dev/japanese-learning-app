import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar
} from 'react-native';

type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type PromptMode = 'meaning' | 'audio' | 'mixed' | 'sentence';

const levels: Array<{ id: Level; title: string; subtitle: string }> = [
  { id: 'N5', title: 'N5', subtitle: '入门词汇' },
  { id: 'N4', title: 'N4', subtitle: '日常基础' },
  { id: 'N3', title: 'N3', subtitle: '中级表达' },
  { id: 'N2', title: 'N2', subtitle: '进阶商务' },
  { id: 'N1', title: 'N1', subtitle: '高阶语感' }
];

const modes: Array<{ id: PromptMode; label: string; description: string }> = [
  { id: 'meaning', label: '中文意思', description: '看中文，输入日文' },
  { id: 'audio', label: '日文发音', description: '听发音，输入日文' },
  { id: 'mixed', label: '混合模式', description: '中文和发音交替' },
  { id: 'sentence', label: '短句填空', description: '根据短句补全日文' }
];

const countOptions = [5, 10, 20, 50];

export default function PracticeSetupScreen({ navigation }: any) {
  const [selectedLevel, setSelectedLevel] = useState<Level>('N5');
  const [mode, setMode] = useState<PromptMode>('meaning');
  const [count, setCount] = useState(10);
  const [countInput, setCountInput] = useState('10');
  const [autoNext, setAutoNext] = useState(true);

  const startPractice = () => {
    const safeCount = Math.min(200, Math.max(1, Math.round(Number(countInput) || 10)));
    navigation.navigate('Practice', {
      level: selectedLevel,
      mode,
      count: safeCount,
      autoNext
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>词汇记忆训练</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{selectedLevel}</Text>
            <Text style={styles.levelBadgeLabel}>今日练习</Text>
          </View>
        </View>

        {/* Step 1: Select Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.stepMark}>1</Text>
            <Text style={styles.sectionTitle}>选择难度</Text>
          </View>
          <View style={styles.levelGrid}>
            {levels.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelTile,
                  selectedLevel === level.id && styles.levelTileSelected
                ]}
                onPress={() => setSelectedLevel(level.id)}
              >
                <Text style={[
                  styles.levelTitle,
                  selectedLevel === level.id && styles.levelTitleSelected
                ]}>{level.title}</Text>
                <Text style={[
                  styles.levelSubtitle,
                  selectedLevel === level.id && styles.levelSubtitleSelected
                ]}>{level.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Select Mode */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.stepMark}>2</Text>
            <Text style={styles.sectionTitle}>出题方式</Text>
          </View>
          {modes.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.modeOption,
                mode === item.id && styles.modeOptionSelected
              ]}
              onPress={() => setMode(item.id)}
            >
              <Text style={[
                styles.modeLabel,
                mode === item.id && styles.modeLabelSelected
              ]}>{item.label}</Text>
              <Text style={[
                styles.modeDesc,
                mode === item.id && styles.modeDescSelected
              ]}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 3: Question Count */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.stepMark}>3</Text>
            <Text style={styles.sectionTitle}>题量</Text>
          </View>
          <View style={styles.countRow}>
            {countOptions.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.countButton,
                  count === opt && styles.countButtonSelected
                ]}
                onPress={() => {
                  setCount(opt);
                  setCountInput(String(opt));
                }}
              >
                <Text style={[
                  styles.countButtonText,
                  count === opt && styles.countButtonTextSelected
                ]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customCountRow}>
            <Text style={styles.customCountLabel}>自定义</Text>
            <TextInput
              style={styles.countInput}
              keyboardType="number-pad"
              value={countInput}
              onChangeText={text => {
                const digits = text.replace(/\D/g, '').slice(0, 3);
                const corrected = Number(digits) > 200 ? '200' : digits;
                setCountInput(corrected);
                if (corrected) setCount(Math.min(200, Math.max(1, Number(corrected))));
              }}
              onBlur={() => {
                const next = Math.min(200, Math.max(1, Math.round(Number(countInput) || 10)));
                setCount(next);
                setCountInput(String(next));
              }}
            />
            <Text style={styles.customCountHint}>1-200</Text>
          </View>
        </View>

        {/* Auto Next Toggle */}
        <View style={styles.autoNextRow}>
          <Text style={styles.autoNextLabel}>答对后自动进入下一题</Text>
          <Switch
            value={autoNext}
            onValueChange={setAutoNext}
            trackColor={{ false: '#ddd', true: '#667eea' }}
            thumbColor={autoNext ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Summary & Start */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{selectedLevel}</Text>
          </View>
          <Text style={styles.summaryTitle}>
            {levels.find(l => l.id === selectedLevel)?.subtitle}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>提示</Text>
            <Text style={styles.summaryValue}>
              {modes.find(m => m.id === mode)?.label}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>题量</Text>
            <Text style={styles.summaryValue}>{count} 题</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>输入</Text>
            <Text style={styles.summaryValue}>日文 / 假名 / 罗马音</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>切题</Text>
            <Text style={styles.summaryValue}>
              {autoNext ? '答对自动跳转' : '按钮切换'}
            </Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={startPractice}>
            <Text style={styles.startButtonText}>开始练习</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea'
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    paddingBottom: 40
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center'
  },
  levelBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  levelBadgeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  stepMark: {
    backgroundColor: '#667eea',
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
    overflow: 'hidden'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  levelTile: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  levelTileSelected: {
    backgroundColor: '#eef0ff',
    borderColor: '#667eea'
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666'
  },
  levelTitleSelected: {
    color: '#667eea'
  },
  levelSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  levelSubtitleSelected: {
    color: '#667eea'
  },
  modeOption: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  modeOptionSelected: {
    backgroundColor: '#eef0ff',
    borderColor: '#667eea'
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  modeLabelSelected: {
    color: '#667eea'
  },
  modeDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  modeDescSelected: {
    color: '#667eea'
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  countButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  countButtonSelected: {
    backgroundColor: '#eef0ff',
    borderColor: '#667eea'
  },
  countButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  countButtonTextSelected: {
    color: '#667eea'
  },
  customCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  customCountLabel: {
    fontSize: 14,
    color: '#666'
  },
  countInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    color: '#333'
  },
  customCountHint: {
    fontSize: 12,
    color: '#999'
  },
  autoNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  autoNextLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  summaryBadge: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8
  },
  summaryBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#999'
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  startButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 60,
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
