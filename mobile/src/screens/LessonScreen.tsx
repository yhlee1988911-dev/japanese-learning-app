import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Vocabulary {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  vocabulary: Vocabulary[];
}

export default function LessonScreen({ route }: any) {
  const { lessonId } = route.params;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}`);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text>レッスンが見つかりません</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.description}>{lesson.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>語彙</Text>
        {lesson.vocabulary.map((word, idx) => (
          <View key={idx} style={styles.vocabularyCard}>
            <View style={styles.vocabularyRow}>
              <Text style={styles.vocabLabel}>漢字:</Text>
              <Text style={styles.vocabValue}>{word.kanji}</Text>
            </View>
            <View style={styles.vocabularyRow}>
              <Text style={styles.vocabLabel}>ひらがな:</Text>
              <Text style={styles.vocabValue}>{word.hiragana}</Text>
            </View>
            <View style={styles.vocabularyRow}>
              <Text style={styles.vocabLabel}>ローマ字:</Text>
              <Text style={styles.vocabValue}>{word.romaji}</Text>
            </View>
            <View style={styles.vocabularyRow}>
              <Text style={styles.vocabLabel}>意味:</Text>
              <Text style={styles.vocabValue}>{word.meaning}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    color: 'white'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10
  },
  description: {
    fontSize: 14,
    color: '#f0f0f0'
  },
  section: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  vocabularyCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea'
  },
  vocabularyRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  vocabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    minWidth: 80
  },
  vocabValue: {
    fontSize: 14,
    color: '#333',
    flex: 1
  }
});
