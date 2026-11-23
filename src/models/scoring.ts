import type { Difficulty } from './prompts';

export type SpeakingScores = {
  accuracy: number;
  fluency: number;
  range: number;
  coherence: number;
  overall: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerCount: number;
  fillers: string[];
  connectorCount: number;
  band: Difficulty;
};

const fillerPattern =
  /\b(?:u+m+|u+h+m*|e+r+m*|a+h+|h+m+|ano|kasi|like|you\s+know|kind\s+of|sort\s+of)\b/giu;

const connectorWords = new Set([
  'and',
  'also',
  'after',
  'before',
  'because',
  'but',
  'so',
  'then',
  'however',
  'therefore',
  'at',
  'kaya',
  'tapos',
  'pero',
  'saka',
  'kasi',
]);

const stopWords = new Set([
  'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'to', 'of',
  'in', 'on', 'at', 'for', 'and', 'or', 'but', 'with', 'by', 'from', 'it',
  'this', 'that', 'she', 'he', 'they', 'we', 'you', 'i', 'her', 'his',
  'their', 'my', 'your', 'our', 'as', 'while', 'when', 'then', 'has', 'have',
  'do', 'does', 'did', 'ni', 'ang', 'ng', 'sa', 'si', 'na', 'ay', 'ito',
  'iyan', 'iyon', 'mga', 'at', 'o', 'para', 'kay', 'kina', 'nang', 'rin',
  'din', 'siya', 'niya', 'kami', 'tayo', 'ako', 'mo', 'ko', 'isang',
]);

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function levenshteinDistance(left: string, right: string): number {
  const matrix = Array.from({ length: right.length + 1 }, () =>
    Array<number>(left.length + 1).fill(0),
  );
  for (let column = 0; column <= left.length; column++) matrix[0][column] = column;
  for (let row = 0; row <= right.length; row++) matrix[row][0] = row;

  for (let row = 1; row <= right.length; row++) {
    for (let column = 1; column <= left.length; column++) {
      const substitutionCost = left[column - 1] === right[row - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }
  return matrix[right.length][left.length];
}

function wordSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  if (longest === 0) return 1;
  return 1 - levenshteinDistance(left, right) / longest;
}

export function findFillers(transcript: string): string[] {
  return Array.from(transcript.matchAll(fillerPattern), (match) =>
    match[0].toLocaleLowerCase(),
  );
}

export function findConnectors(transcript: string): string[] {
  return tokenize(transcript).filter((word) => connectorWords.has(word));
}

function accuracyScore(expectedText: string, transcript: string): number {
  const expectedWords = new Set(
    tokenize(expectedText).filter((word) => !stopWords.has(word)),
  );
  const spokenWords = tokenize(transcript);
  if (expectedWords.size === 0) return 0;
  const usedSpokenWords = new Set<number>();
  let matchedSimilarity = 0;

  for (const expectedWord of expectedWords) {
    let bestSimilarity = 0;
    let bestIndex = -1;

    spokenWords.forEach((spokenWord, index) => {
      if (usedSpokenWords.has(index)) return;
      const similarity = wordSimilarity(expectedWord, spokenWord);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = index;
      }
    });

    if (bestSimilarity >= 0.75) {
      matchedSimilarity += bestSimilarity;
      if (bestIndex >= 0) usedSpokenWords.add(bestIndex);
    }
  }

  return Math.round((matchedSimilarity / expectedWords.size) * 100);
}

function fluencyScore(
  durationSeconds: number,
  wordCount: number,
  fillers: string[],
): { score: number; wordsPerMinute: number } {
  if (wordCount === 0) return { score: 0, wordsPerMinute: 0 };

  const wordsPerMinute = Math.round(wordCount / (Math.max(durationSeconds, 1) / 60));
  const paceScore = wordsPerMinute >= 60 && wordsPerMinute <= 120
    ? 100
    : wordsPerMinute < 60
      ? (wordsPerMinute / 60) * 100
      : Math.max(0, 100 - ((wordsPerMinute - 120) / 60) * 100);
  const fillerRatio = fillers.length / wordCount;
  const fillerPenalty = Math.min(100, fillerRatio * 250);
  const score = Math.round(paceScore * 0.6 + (100 - fillerPenalty) * 0.4);

  return { score, wordsPerMinute };
}

function rangeScore(words: string[]): number {
  if (words.length === 0) return 0;
  return Math.round((new Set(words).size / words.length) * 100);
}

function coherenceScore(words: string[]): { score: number; connectorCount: number } {
  if (words.length === 0) return { score: 0, connectorCount: 0 };
  const connectorCount = words.filter((word) => connectorWords.has(word)).length;
  const expectedConnectors = Math.max(words.length / 15, 1);
  const score = Math.round(Math.min((connectorCount / expectedConnectors) * 100, 100));
  return { score, connectorCount };
}

export function proficiencyBand(score: number): Difficulty {
  if (score < 40) return 0;
  if (score < 60) return 1;
  if (score < 80) return 2;
  return 3;
}

export function updateDifficulty(
  current: Difficulty,
  recentScores: number[],
): { next: Difficulty; rollingAverage: number } {
  const recent = recentScores.slice(-3);
  if (recent.length === 0) return { next: current, rollingAverage: 0 };

  const rollingAverage = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const masteredThree = recent.length === 3 && recent.every((score) => score >= 80);

  if (masteredThree && current < 3) {
    return { next: (current + 1) as Difficulty, rollingAverage };
  }
  if (rollingAverage < 50 && current > 0) {
    return { next: (current - 1) as Difficulty, rollingAverage };
  }
  return { next: current, rollingAverage };
}

export function scoreSpeaking(
  expectedPassage: string,
  passageTranscript: string,
  answerTranscript: string,
  answerDurationSeconds: number,
): SpeakingScores {
  const answerWords = tokenize(answerTranscript);
  const fillers = findFillers(answerTranscript);
  const fluency = fluencyScore(
    answerDurationSeconds,
    answerWords.length,
    fillers,
  );
  const coherence = coherenceScore(answerWords);
  const passageAccuracy = accuracyScore(expectedPassage, passageTranscript);
  const answerAccuracy = accuracyScore(expectedPassage, answerTranscript);
  const accuracy = Math.max(passageAccuracy, answerAccuracy);
  const range = rangeScore(answerWords);
  const overall = Math.round(
    accuracy * 0.30
      + fluency.score * 0.30
      + range * 0.20
      + coherence.score * 0.20,
  );

  return {
    accuracy,
    fluency: fluency.score,
    range,
    coherence: coherence.score,
    overall,
    wordCount: answerWords.length,
    wordsPerMinute: fluency.wordsPerMinute,
    fillerCount: fillers.length,
    fillers,
    connectorCount: coherence.connectorCount,
    band: proficiencyBand(overall),
  };
}
