import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeVocabularyScore,
  updateDifficulty,
} from './scoring';

test('matches normalized keywords and Taglish prefixes', () => {
  const result = computeVocabularyScore(
    'Pulang bahay, playing!',
    ['pula', 'bahay', 'play', 'aso'],
  );

  assert.equal(result.keyword_score, 0.75);
  assert.equal(result.ttr_score, 1);
  assert.equal(result.vocab_score, 0.85);
  assert.equal(result.band, 'A2');
});

test('uses the fixed low TTR score for responses shorter than three words', () => {
  const result = computeVocabularyScore('Pulang bahay!', ['pula', 'bahay', 'aso']);

  assert.equal(result.keyword_score, 2 / 3);
  assert.equal(result.ttr_score, 0.3);
  assert.equal(result.vocab_score, 0.52);
  assert.equal(result.band, 'A1');
});

test('calculates TTR from unique normalized transcript words', () => {
  const result = computeVocabularyScore('Pula, pula bahay.', ['pula', 'aso']);

  assert.equal(result.keyword_score, 0.5);
  assert.equal(result.ttr_score, 2 / 3);
  assert.equal(result.vocab_score, (0.6 * 0.5) + (0.4 * (2 / 3)));
});

test('assigns the requested band thresholds', () => {
  const preA1 = computeVocabularyScore('one one one', ['missing']);
  const a1 = computeVocabularyScore('one two three', []);
  const a2 = computeVocabularyScore('pula bahay aso', ['pula', 'missing']);

  assert.equal(preA1.band, 'Pre-A1');
  assert.equal(a1.vocab_score, 0.4);
  assert.equal(a1.band, 'A1');
  assert.equal(a2.vocab_score, 0.7);
  assert.equal(a2.band, 'A2');
});

test('scores empty input safely when no expected keywords are provided', () => {
  const result = computeVocabularyScore('!!!', []);

  assert.deepEqual(result, {
    keyword_score: 0,
    ttr_score: 0.3,
    vocab_score: 0.12,
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
