import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import CourseScreen from './screens/CourseScreen';
import LessonScreen from './screens/LessonScreen';
import PracticeSetupScreen from './screens/PracticeSetupScreen';
import PracticeScreen from './screens/PracticeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#667eea'
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold'
          }
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: '日本語学習' }}
        />
        <Stack.Screen 
          name="Course" 
          component={CourseScreen}
          options={{ title: 'コース' }}
        />
        <Stack.Screen 
          name="Lesson" 
          component={LessonScreen}
          options={{ title: 'レッスン' }}
        />
        <Stack.Screen 
          name="PracticeSetup" 
          component={PracticeSetupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Practice" 
          component={PracticeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
