import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type { Difficulty } from '../models/prompts';
import {
  parseOpenEndedQuestion,
  parseReadingPassage,
  parseRoundTemplate,
  type RoundDefinition,
  type RoundItem,
} from '../models/rounds';
import { db } from './firebase';

export async function loadRound(difficulty: Difficulty): Promise<RoundDefinition> {
  const templateSnapshot = await getDocs(
    query(collection(db, 'roundTemplates'), where('difficulty', '==', difficulty)),
  );
  if (templateSnapshot.empty) {
    throw new Error(`No round template is configured for difficulty ${difficulty}.`);
  }

  const templates = templateSnapshot.docs.map((snapshot) =>
    parseRoundTemplate(snapshot.id, snapshot.data()),
  );
  const template = templates[Math.floor(Math.random() * templates.length)];

  const [passageSnapshots, questionSnapshots] = await Promise.all([
    Promise.all(template.passageIds.map((id) =>
      getDoc(doc(db, 'readingPassages', id)),
    )),
    Promise.all(template.questionIds.map((id) =>
      getDoc(doc(db, 'openEndedQuestions', id)),
    )),
  ]);
  const passages = passageSnapshots.map((snapshot) => {
    const passage = parseReadingPassage(snapshot.id, snapshot.exists() ? snapshot.data() : undefined);
    if (passage.difficulty !== difficulty) {
      throw new Error(`Reading passage "${passage.id}" does not match the round difficulty.`);
    }
    return passage;
  });
  const questions = questionSnapshots.map((snapshot) => {
    const question = parseOpenEndedQuestion(snapshot.id, snapshot.exists() ? snapshot.data() : undefined);
    if (question.difficulty !== difficulty) {
      throw new Error(`Open-ended question "${question.id}" does not match the round difficulty.`);
    }
    return question;
  });

  const items: RoundItem[] = [
    ...passages.map((content) => ({ kind: 'readingPassage' as const, content })),
    ...questions.map((content) => ({ kind: 'openEndedQuestion' as const, content })),
  ];

  return { id: template.id, difficulty, items };
}
