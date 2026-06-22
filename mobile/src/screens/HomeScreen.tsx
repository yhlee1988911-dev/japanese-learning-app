import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Course {
  _id: string;
  title: string;
  description: string;
  level: string;
  totalLessons: number;
}

export default function HomeScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('http://192.168.31.120:5001/api/courses');
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>日本語を学ぶ</Text>
      </View>

      {/* Practice Entry */}
      <TouchableOpacity
        style={styles.practiceCard}
        onPress={() => navigation.navigate('PracticeSetup')}
      >
        <View style={styles.practiceCardContent}>
          <Text style={styles.practiceCardTitle}>词汇记忆训练</Text>
          <Text style={styles.practiceCardDescription}>
            选择难度和出题方式，开始日语词汇练习
          </Text>
        </View>
        <Text style={styles.practiceCardArrow}>›</Text>
      </TouchableOpacity>

      {courses.map(course => (
        <TouchableOpacity
          key={course._id}
          style={styles.courseCard}
          onPress={() => navigation.navigate('Course', { courseId: course._id })}
        >
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDescription}>{course.description}</Text>
          <Text style={styles.courseInfo}>レベル: {course.level}</Text>
          <Text style={styles.courseInfo}>レッスン数: {course.totalLessons}</Text>
        </TouchableOpacity>
      ))}
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
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  courseCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  courseInfo: {
    fontSize: 12,
    color: '#999'
  },
  practiceCard: {
    backgroundColor: '#667eea',
    margin: 10,
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  practiceCardContent: {
    flex: 1
  },
  practiceCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  practiceCardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)'
  },
  practiceCardArrow: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8
  }
});
