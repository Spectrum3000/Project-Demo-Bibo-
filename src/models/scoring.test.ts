import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeVocabularyScore,
  updateDifficulty,
} from './scoring';

function scoreInEnglish(transcript: string, expectedKeywords: string[]) {
  return computeVocabularyScore(transcript, expectedKeywords, 'english', {
    english: [transcript],
    filipino: [],
  });
}

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

test('adapts across Pre-A1, A1, and A2 without promoting past A2', () => {
  assert.equal(updateDifficulty(0, [80, 90, 85]).next, 1);
  assert.equal(updateDifficulty(1, [80, 90]).next, 1);
  assert.equal(updateDifficulty(1, [80, 90, 85]).next, 2);
  assert.equal(updateDifficulty(2, [80, 90, 85]).next, 2);
  assert.equal(updateDifficulty(2, [70, 40, 35]).next, 1);
});
