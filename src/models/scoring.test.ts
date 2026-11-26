import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeReadAloudMatchScore,
  computeInteractionScore,
  computeVocabularyScore,
  diagnosticPlacementForBand,
  updateDifficulty,
} from './scoring';

function scoreInEnglish(transcript: string, expectedKeywords: string[]) {
  return computeVocabularyScore(transcript, expectedKeywords, 'english', {
    english: [transcript],
    filipino: [],
  });
}

test('scores read-aloud word matches after normalizing case and punctuation', () => {
  const result = computeReadAloudMatchScore(
    'lina FINDS a tiny seed!',
    'Lina finds a tiny seed.',
  );

  assert.deepEqual(result, {
    score: 1,
    editErrors: 0,
    referenceWords: 5,
    status: 'scored',
  });
});

test('uses word edit distance for omissions and substitutions', () => {
  const omission = computeReadAloudMatchScore(
    'Lina finds seed',
    'Lina finds tiny seed',
  );
  const substitution = computeReadAloudMatchScore(
    'Lina found tiny seed',
    'Lina finds tiny seed',
  );

  assert.equal(omission.score, 0.75);
  assert.equal(omission.editErrors, 1);
  assert.equal(omission.status, 'scored');
  assert.equal(substitution.score, 0.75);
  assert.equal(substitution.editErrors, 1);
});

test('distinguishes blank, unavailable, and missing reference transcripts', () => {
  assert.deepEqual(computeReadAloudMatchScore('', 'Say these words.'), {
    score: 0,
    editErrors: 3,
    referenceWords: 3,
    status: 'blank',
  });
  assert.equal(computeReadAloudMatchScore(null, 'Say these words.').status, 'unavailable');
  assert.equal(computeReadAloudMatchScore('some words', '!!!').status, 'no-reference');
});

test('scores a responsive, relevant interaction answer', () => {
  const result = computeInteractionScore(
    ['I like the green leaf!'],
    ['leaf'],
    1,
  );

  assert.deepEqual(result, {
    responsiveness_score: 1,
    participation_score: 1,
    relevance_score: 1,
    interaction_score: 1,
    band: 'A2',
  });
});

test('counts a non-empty answer under two words as attempted and relevant only', () => {
  const result = computeInteractionScore(['Leaf!'], ['leaf'], 1);

  assert.equal(result.responsiveness_score, 0);
  assert.equal(result.participation_score, 1);
  assert.equal(result.relevance_score, 1);
  assert.equal(result.interaction_score, 0.6);
  assert.equal(result.band, 'A1');
});

test('scores an irrelevant answer and assigns the 0.70 threshold to A2', () => {
  const result = computeInteractionScore(['I like soccer.'], ['leaf'], 1);

  assert.equal(result.responsiveness_score, 1);
  assert.equal(result.participation_score, 1);
  assert.equal(result.relevance_score, 0);
  assert.equal(result.interaction_score, 0.7);
  assert.equal(result.band, 'A2');
});

test('counts a blank or skipped answer in the expected-turn denominator', () => {
  const result = computeInteractionScore(['  '], ['leaf'], 1);

  assert.equal(result.responsiveness_score, 0);
  assert.equal(result.participation_score, 0);
  assert.equal(result.relevance_score, 0);
  assert.equal(result.interaction_score, 0);
  assert.equal(result.band, 'Pre-A1');
});

test('scores multiple turns against the expected-turn denominator and 0.40 threshold', () => {
  const result = computeInteractionScore(
    ['leaf', 'leaf', ''],
    ['leaf'],
    3,
  );

  assert.equal(result.responsiveness_score, 0);
  assert.equal(result.participation_score, 2 / 3);
  assert.equal(result.relevance_score, 2 / 3);
  assert.equal(result.interaction_score, 0.4);
  assert.equal(result.band, 'A1');
});

test('handles zero expected turns safely', () => {
  const result = computeInteractionScore(['green leaf'], ['leaf'], 0);

  assert.equal(result.interaction_score, 0);
  assert.equal(result.band, 'Pre-A1');
});

test('matches normalized keywords and prefixes', () => {
  const result = scoreInEnglish('Pulang bahay, playing!', ['pula', 'bahay', 'play', 'aso']);

  assert.equal(result.keyword_score, 0.75);
  assert.equal(result.ttr_score, 1);
  assert.equal(result.vocab_score, 0.85);
  assert.equal(result.band, 'A2');
});

test('uses the fixed low TTR score for responses shorter than three words', () => {
  const result = scoreInEnglish('Pulang bahay!', ['pula', 'bahay', 'aso']);

  assert.equal(result.keyword_score, 2 / 3);
  assert.equal(result.ttr_score, 0.3);
  assert.equal(result.vocab_score, 0.52);
  assert.equal(result.band, 'A1');
});

test('calculates TTR from unique normalized transcript words', () => {
  const result = scoreInEnglish('Pula, pula bahay.', ['pula', 'aso']);

  assert.equal(result.keyword_score, 0.5);
  assert.equal(result.ttr_score, 2 / 3);
  assert.equal(result.vocab_score, (0.6 * 0.5) + (0.4 * (2 / 3)));
});

test('penalizes Filipino words in an English exercise, excluding fillers and unknown words', () => {
  const result = computeVocabularyScore(
    'cat aso uh mystery bright',
    ['cat', 'missing'],
    'english',
    {
      english: ['cat bright'],
      filipino: ['aso araw'],
    },
  );

  assert.equal(result.keyword_score, 0.5);
  assert.equal(result.ttr_score, 2 / 3);
});

test('penalizes English words in a Filipino exercise', () => {
  const result = computeVocabularyScore(
    'aso cat ano mystery araw',
    ['aso'],
    'filipino',
    {
      english: ['cat bright'],
      filipino: ['aso araw'],
    },
  );

  assert.equal(result.keyword_score, 1);
  assert.equal(result.ttr_score, 2 / 3);
});

test('applies language purity to the fixed short-response TTR', () => {
  const result = computeVocabularyScore(
    'cat aso',
    ['cat'],
    'english',
    {
      english: ['cat'],
      filipino: ['aso'],
    },
  );

  assert.equal(result.ttr_score, 0.15);
});

test('assigns the requested band thresholds', () => {
  const preA1 = scoreInEnglish('one one one', ['missing']);
  const a1 = scoreInEnglish('one two three', []);
  const a2 = scoreInEnglish('pula bahay aso', ['pula', 'missing']);

  assert.equal(preA1.band, 'Pre-A1');
  assert.equal(a1.vocab_score, 0.4);
  assert.equal(a1.band, 'A1');
  assert.equal(a2.vocab_score, 0.7);
  assert.equal(a2.band, 'A2');
});

test('scores empty input with no recognized topic words as zero range', () => {
  const result = computeVocabularyScore('!!!', [], 'english', {
    english: [],
    filipino: [],
  });

  assert.deepEqual(result, {
    keyword_score: 0,
    ttr_score: 0,
    vocab_score: 0,
    band: 'Pre-A1',
  });
});

test('maps diagnostic bands to their assigned follow-up levels', () => {
  assert.equal(diagnosticPlacementForBand('Pre-A1'), 1);
  assert.equal(diagnosticPlacementForBand('A1'), 2);
  assert.equal(diagnosticPlacementForBand('A2'), 3);
});

test('adapts through levels 1 to 3 without promoting past A2', () => {
  assert.equal(updateDifficulty(0, [80, 90, 85]).next, 1);
  assert.equal(updateDifficulty(1, [20]).next, 1);
  assert.equal(updateDifficulty(1, [80, 90]).next, 1);
  assert.equal(updateDifficulty(1, [80, 90, 85]).next, 2);
  assert.equal(updateDifficulty(2, [80, 90, 85]).next, 3);
  assert.equal(updateDifficulty(3, [80, 90, 85]).next, 3);
  assert.equal(updateDifficulty(3, [70, 40, 35]).next, 2);
});
