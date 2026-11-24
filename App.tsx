import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppView from './src/views/AppView';
import { useEffect } from 'react';
import { loadExercises } from './src/services/exercises';


export default function App() {
  useEffect(() => {
    loadExercises()
      .then((items) => console.log('Firestore exercises:', items))
      .catch((error) => console.error('Firestore read failed:', error));
  }, []);

  return (
    <SafeAreaProvider>
      <AppView />
    </SafeAreaProvider>
  );
}
