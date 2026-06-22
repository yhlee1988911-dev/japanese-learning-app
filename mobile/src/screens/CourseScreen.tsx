import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Lesson {
  _id: string;
  title: string;
  description: string;
  order: number;
}

export default function CourseScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/lessons/course/${courseId}`);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {lessons.map(lesson => (
        <TouchableOpacity
          key={lesson._id}
          style={styles.lessonCard}
          onPress={() => navigation.navigate('Lesson', { lessonId: lesson._id })}
        >
          <Text style={styles.lessonNumber}>レッスン {lesson.order}</Text>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonDescription}>{lesson.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10
  },
  lessonCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  lessonNumber: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 5
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  lessonDescription: {
    fontSize: 14,
    color: '#666'
  }
});
