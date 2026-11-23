import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findConnectors,
  findFillers,
  proficiencyBand,
  scoreSpeaking,
  updateDifficulty,
} from './scoring';

test('finds repeated English and Filipino hesitation words', () => {
  assert.deepEqual(findFillers('Umm, uh, ano, kasi, and ummm.'), [
    'umm',
    'uh',
    'ano',
    'kasi',
    'ummm',
  ]);
  assert.deepEqual(findFillers('Hmm, I think so.'), ['hmm']);
});

test('scores recognized passage keywords despite punctuation', () => {
  const result = scoreSpeaking(
    'Lina plants a tiny seed and gives it water.',
    'Lina plants tiny seed, gives water.',
    'I play with my friend because it is fun.',
    10,
  );
  assert.equal(result.accuracy, 100);
});

test('scores mixed-language answers and fuzzy word matches', () => {
  const mixed = scoreSpeaking(
    'the dog is running fast',
    '',
    'ang dog ay running fast',
    4,
  );
  assert.equal(mixed.accuracy, 100);
  assert.equal(mixed.overall, 80);

  const typo = scoreSpeaking(
    'the dog is running fast',
    'the dog is running fastr',
    '',
    4,
  );
  assert.ok(typo.accuracy >= 90);
});

test('counts but and then as connectors, not fillers', () => {
  const result = scoreSpeaking(
    'Lina plants a seed.',
    'Lina plants a seed.',
    'I played, but then I went home.',
    4,
  );
  assert.equal(result.fillerCount, 0);
  assert.equal(result.connectorCount, 2);
  assert.equal(result.coherence, 100);
  assert.deepEqual(findConnectors('I played, but then I went home.'), ['but', 'then']);
});

test('hesitation words reduce fluency', () => {
  const clear = scoreSpeaking('Mia makes pancakes.', 'Mia makes pancakes.', 'I play outside today.', 3);
  const hesitant = scoreSpeaking(
    'Mia makes pancakes.',
    'Mia makes pancakes.',
    'Um, I play outside today.',
    4,
  );
  assert.ok(hesitant.fluency < clear.fluency);
  assert.equal(hesitant.fillerCount, 1);
});

test('uses the PDF A1 score bands', () => {
  assert.equal(proficiencyBand(39), 0);
  assert.equal(proficiencyBand(40), 1);
  assert.equal(proficiencyBand(60), 2);
  assert.equal(proficiencyBand(80), 3);
});

test('promotes only after three strong exercises and scaffolds below 50%', () => {
  assert.equal(updateDifficulty(1, [80, 90]).next, 1);
  assert.equal(updateDifficulty(1, [80, 90, 85]).next, 2);
  assert.equal(updateDifficulty(2, [70, 40, 35]).next, 1);
});
