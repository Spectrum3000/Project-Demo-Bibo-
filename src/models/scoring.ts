import type { Difficulty } from './prompts';

export type VocabularyBand = 'Pre-A1' | 'A1' | 'A2';
export type TargetLanguage = 'english' | 'filipino';
export type TopicWordLists = {
  english: string[];
  filipino: string[];
};

export type VocabularyScore = {
  keyword_score: number;
  ttr_score: number;
  vocab_score: number;
  band: VocabularyBand;
};

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

const fillerWords = new Set(['um', 'uh', 'uhm', 'umm', 'ano', 'kasi']);

export function computeVocabularyScore(
  transcript: string,
  expectedKeywords: string[],
  targetLanguage: TargetLanguage,
  topicWordLists: TopicWordLists,
): VocabularyScore {
  // Step 1: lowercase and remove punctuation, then match each expected keyword once.
  const transcriptWords = tokenize(transcript);
  const normalizedKeywords = Array.from(new Set(
    expectedKeywords.flatMap((keyword) => tokenize(keyword)),
  )).sort((left, right) => right.length - left.length);
  const unmatchedWords = [...transcriptWords];
  let matchedKeywords = 0;

  for (const keyword of normalizedKeywords) {
    const matchIndex = unmatchedWords.findIndex((word) => word.startsWith(keyword));
    if (matchIndex !== -1) {
      matchedKeywords++;
      unmatchedWords.splice(matchIndex, 1);
    }
  }

  const keyword_score = normalizedKeywords.length === 0
    ? 0
    : matchedKeywords / normalizedKeywords.length;

  // Step 2: short responses get a fixed low range score; otherwise use unique/total words.
  const rawTtr = transcriptWords.length < 3
    ? 0.3
    : new Set(transcriptWords).size / transcriptWords.length;
  const ttr_score = applyLanguagePurity(
    rawTtr,
    transcriptWords,
    targetLanguage,
    topicWordLists,
  );

  // Step 3: combine keyword accuracy and vocabulary range into one 0–1 score.
  const vocab_score = (0.6 * keyword_score) + (0.4 * ttr_score);

  // Step 4: map the composite score to the requested CEFR vocabulary band.
  const band: VocabularyBand = vocab_score < 0.4
    ? 'Pre-A1'
    : vocab_score < 0.7
      ? 'A1'
      : 'A2';

  return { keyword_score, ttr_score, vocab_score, band };
}

function applyLanguagePurity(
  ttr: number,
  transcriptWords: string[],
  targetLanguage: TargetLanguage,
  topicWordLists: TopicWordLists,
): number {
  const englishWords = new Set(topicWordLists.english.flatMap(tokenize));
  const filipinoWords = new Set(topicWordLists.filipino.flatMap(tokenize));
  const classifiedWords = transcriptWords.filter((word) => {
    if (fillerWords.has(word)) return false;
    return englishWords.has(word) || filipinoWords.has(word);
  });
  if (classifiedWords.length === 0) return 0;

  const targetWords = targetLanguage === 'english' ? englishWords : filipinoWords;
  const languagePurity = classifiedWords.filter((word) => targetWords.has(word)).length
    / classifiedWords.length;
  return ttr * languagePurity;
}

export function updateDifficulty(
  current: Difficulty,
  recentScores: number[],
): { next: Difficulty; rollingAverage: number } {
  const recent = recentScores.slice(-3);
  if (recent.length === 0) return { next: current, rollingAverage: 0 };

  const rollingAverage = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const masteredThree = recent.length === 3 && recent.every((score) => score >= 80);

  if (masteredThree && current < 2) {
    return { next: (current + 1) as Difficulty, rollingAverage };
  }
  if (rollingAverage < 50 && current > 0) {
    return { next: (current - 1) as Difficulty, rollingAverage };
  }
  return { next: current, rollingAverage };
}
