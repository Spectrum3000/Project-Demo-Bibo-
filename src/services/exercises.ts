import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export async function loadExercises() {
  const result = await getDocs(
    query(
      collection(db, 'exercises'),
      where('active_status', '==', true),
    ),
  );

  return result.docs.map((exercise) => ({
    ...exercise.data(),
    id: exercise.id,
  }));
}
