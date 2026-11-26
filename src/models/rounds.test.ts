import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseOpenEndedQuestion,
  parseReadingPassage,
  parseRoundTemplate,
  summarizeRound,
} from './rounds';

test('validates bilingual passage and open-ended question documents', () => {
  const passage = parseReadingPassage('passage_1', {
    active_status: true,
    difficulty: 0,
    is_placeholder: true,
    title: { en: 'The Seed', fil: 'Ang Binhi' },
    passage: { en: 'A seed grows.', fil: 'Lumalaki ang binhi.' },
  });
  const question = parseOpenEndedQuestion('question_1', {
    active_status: true,
    difficulty: 0,
    prompt: { en: 'What would you grow?', fil: 'Ano ang itatanim mo?' },
    hints: { en: 'A plant, or another idea.', fil: 'Halaman o ibang ideya.' },
  });

  assert.equal(passage.passage.en, 'A seed grows.');
  assert.equal(passage.is_placeholder, true);
  assert.equal(question.hints?.fil, 'Halaman o ibang ideya.');
  assert.equal(question.answerKeywords, undefined);
});

test('accepts A2 difficulty 3 for placeholder rounds', () => {
  const template = parseRoundTemplate('a2-template', {
    difficulty: 3,
    passageIds: ['passage_1', 'passage_2', 'passage_3'],
    questionIds: Array.from({ length: 7 }, (_, index) => `question_${index + 1}`),
  });

  assert.equal(template.difficulty, 3);
});

test('rejects round templates that do not contain three unique passages and seven questions', () => {
  assert.throws(
    () => parseRoundTemplate('small-template', {
      difficulty: 1,
      passageIds: ['passage_1', 'passage_2'],
      questionIds: Array.from({ length: 7 }, (_, index) => `question_${index + 1}`),
    }),
    /three unique passage IDs/u,
  );
  assert.throws(
    () => parseRoundTemplate('duplicate-template', {
      difficulty: 1,
      passageIds: ['passage_1', 'passage_2', 'passage_3'],
      questionIds: ['question_1', 'question_2', 'question_3', 'question_4', 'question_5', 'question_6', 'question_6'],
    }),
    /seven unique question IDs/u,
  );
});

test('summarizes each round score separately and excludes unavailable read-aloud scores', () => {
  const summary = summarizeRound(
    1,
    'template_0',
    0,
    [
      {
        kind: 'readingPassage',
        id: 'passage_1',
        label: { en: 'The Seed', fil: 'Ang Binhi' },
        transcript: 'A seed grows.',
        durationSeconds: 8,
        readAloudMatch: {
          score: 0.8,
          editErrors: 1,
          referenceWords: 5,
          status: 'scored',
        },
      },
      {
        kind: 'readingPassage',
        id: 'passage_2',
        label: { en: 'The Bird', fil: 'Ang Ibon' },
        transcript: '',
        durationSeconds: 0,
        readAloudMatch: {
          score: null,
          editErrors: 0,
          referenceWords: 5,
          status: 'unavailable',
        },
      },
      {
        kind: 'openEndedQuestion',
        id: 'question_1',
        label: { en: 'What would you grow?', fil: 'Ano ang itatanim mo?' },
        transcript: 'I would grow a plant.',
        durationSeconds: 4,
        vocabulary: {
          keyword_score: 0.5,
          ttr_score: 0.6,
          vocab_score: 0.54,
          band: 'A1',
        },
        interaction: {
          responsiveness_score: 1,
          participation_score: 1,
          relevance_score: 0,
          interaction_score: 0.7,
          band: 'A2',
        },
      },
    ],
  );

  assert.equal(summary.readAloudAverage, 0.8);
  assert.equal(summary.vocabularyAverage?.vocab_score, 0.54);
  assert.equal(summary.interactionAverage?.interaction_score, 0.7);
  assert.equal(summary.items.length, 3);
});

test('leaves score types unavailable when no scoring guidance or ASR result exists', () => {
  const summary = summarizeRound(
    1,
    'template_0',
    0,
    [{
      kind: 'readingPassage',
      id: 'passage_1',
      label: { en: 'The Seed', fil: 'Ang Binhi' },
      transcript: '',
      durationSeconds: 0,
      readAloudMatch: {
        score: null,
        editErrors: 0,
        referenceWords: 4,
        status: 'unavailable',
      },
    }],
  );

  assert.equal(summary.readAloudAverage, null);
  assert.equal(summary.vocabularyAverage, null);
  assert.equal(summary.interactionAverage, null);
});
