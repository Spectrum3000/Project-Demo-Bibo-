import type { Difficulty, Language } from './prompts';
import type {
  InteractionScore,
  ReadAloudMatchScore,
  VocabularyBand,
  VocabularyScore,
} from './scoring';

export type LocalizedText = Record<Language, string>;
export type LocalizedKeywords = Record<Language, string[]>;

export type ReadingPassage = {
  id: string;
  active_status: true;
  difficulty: Difficulty;
  is_placeholder?: boolean;
  title: LocalizedText;
  passage: LocalizedText;
};

export type OpenEndedQuestion = {
  id: string;
  active_status: true;
  difficulty: Difficulty;
  is_placeholder?: boolean;
  prompt: LocalizedText;
  hints?: LocalizedText;
  answerKeywords?: LocalizedKeywords;
  relevanceKeywords?: LocalizedKeywords;
};

export type RoundTemplate = {
  id: string;
  difficulty: Difficulty;
  passageIds: string[];
  questionIds: string[];
};

export type RoundItem =
  | { kind: 'readingPassage'; content: ReadingPassage }
  | { kind: 'openEndedQuestion'; content: OpenEndedQuestion };

export type RoundDefinition = {
  id: string;
  difficulty: Difficulty;
  items: RoundItem[];
};

export type RoundItemResult = {
  kind: RoundItem['kind'];
  id: string;
  label: LocalizedText;
  transcript: string;
  durationSeconds: number;
  readAloudMatch?: ReadAloudMatchScore;
  vocabulary?: VocabularyScore;
  interaction?: InteractionScore;
};

export type RoundSummary = {
  roundNumber: number;
  templateId: string;
  difficulty: Difficulty;
  items: RoundItemResult[];
  readAloudAverage: number | null;
  vocabularyAverage: VocabularyScore | null;
  interactionAverage: InteractionScore | null;
  scoredVocabularyQuestionCount: number;
  scoredInteractionQuestionCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDifficulty(value: unknown, context: string): Difficulty {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error(`${context} must have difficulty 0, 1, 2, or 3.`);
}

function parsePlaceholderFlag(value: unknown, context: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${context} is_placeholder must be a boolean.`);
  }
  return value;
}

function parseLocalizedText(value: unknown, context: string): LocalizedText {
  if (
    !isRecord(value)
    || typeof value.en !== 'string'
    || value.en.trim().length === 0
    || typeof value.fil !== 'string'
    || value.fil.trim().length === 0
  ) {
    throw new Error(`${context} must include English (en) and Filipino (fil) text.`);
  }
  return { en: value.en, fil: value.fil };
}

function parseOptionalLocalizedText(
  value: unknown,
  context: string,
): LocalizedText | undefined {
  if (value === undefined || value === null) return undefined;
  return parseLocalizedText(value, context);
}

function parseOptionalLocalizedKeywords(
  value: unknown,
  context: string,
): LocalizedKeywords | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    !isRecord(value)
    || !Array.isArray(value.en)
    || !value.en.every((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)
    || !Array.isArray(value.fil)
    || !value.fil.every((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)
  ) {
    throw new Error(`${context} must include English and Filipino keyword arrays.`);
  }
  return { en: value.en, fil: value.fil };
}

export function parseReadingPassage(id: string, value: unknown): ReadingPassage {
  if (!isRecord(value) || value.active_status !== true) {
    throw new Error(`Reading passage "${id}" is missing or inactive.`);
  }
  return {
    id,
    active_status: true,
    difficulty: parseDifficulty(value.difficulty, `Reading passage "${id}"`),
    is_placeholder: parsePlaceholderFlag(value.is_placeholder, `Reading passage "${id}"`),
    title: parseLocalizedText(value.title, `Reading passage "${id}" title`),
    passage: parseLocalizedText(value.passage, `Reading passage "${id}" passage`),
  };
}

export function parseOpenEndedQuestion(
  id: string,
  value: unknown,
): OpenEndedQuestion {
  if (!isRecord(value) || value.active_status !== true) {
    throw new Error(`Open-ended question "${id}" is missing or inactive.`);
  }
  return {
    id,
    active_status: true,
    difficulty: parseDifficulty(value.difficulty, `Open-ended question "${id}"`),
    is_placeholder: parsePlaceholderFlag(value.is_placeholder, `Open-ended question "${id}"`),
    prompt: parseLocalizedText(value.prompt, `Open-ended question "${id}" prompt`),
    hints: parseOptionalLocalizedText(value.hints, `Open-ended question "${id}" hints`),
    answerKeywords: parseOptionalLocalizedKeywords(
      value.answerKeywords,
      `Open-ended question "${id}" answerKeywords`,
    ),
    relevanceKeywords: parseOptionalLocalizedKeywords(
      value.relevanceKeywords,
      `Open-ended question "${id}" relevanceKeywords`,
    ),
  };
}

export function parseRoundTemplate(id: string, value: unknown): RoundTemplate {
  if (!isRecord(value)) {
    throw new Error(`Round template "${id}" is not a valid document.`);
  }
  const difficulty = parseDifficulty(value.difficulty, `Round template "${id}"`);
  const passageIds = value.passageIds;
  const questionIds = value.questionIds;
  if (
    !Array.isArray(passageIds)
    || passageIds.length !== 3
    || !passageIds.every((item) => typeof item === 'string' && item.trim().length > 0)
    || new Set(passageIds).size !== passageIds.length
  ) {
    throw new Error(`Round template "${id}" must contain three unique passage IDs.`);
  }
  if (
    !Array.isArray(questionIds)
    || questionIds.length !== 7
    || !questionIds.every((item) => typeof item === 'string' && item.trim().length > 0)
    || new Set(questionIds).size !== questionIds.length
  ) {
    throw new Error(`Round template "${id}" must contain seven unique question IDs.`);
  }
  return { id, difficulty, passageIds, questionIds };
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function bandFor(score: number): VocabularyBand {
  return score < 0.4 ? 'Pre-A1' : score < 0.7 ? 'A1' : 'A2';
}

export function summarizeRound(
  roundNumber: number,
  templateId: string,
  difficulty: Difficulty,
  items: RoundItemResult[],
): RoundSummary {
  const readAloudScores = items.flatMap((item) => {
    const score = item.readAloudMatch?.score;
    return typeof score === 'number' ? [score] : [];
  });
  const vocabularyScores = items.flatMap((item) =>
    item.vocabulary ? [item.vocabulary] : [],
  );
  const interactionScores = items.flatMap((item) =>
    item.interaction ? [item.interaction] : [],
  );

  const keywordScore = average(vocabularyScores.map((score) => score.keyword_score));
  const ttrScore = average(vocabularyScores.map((score) => score.ttr_score));
  const vocabularyScore = average(vocabularyScores.map((score) => score.vocab_score));
  const responsivenessScore = average(
    interactionScores.map((score) => score.responsiveness_score),
  );
  const participationScore = average(
    interactionScores.map((score) => score.participation_score),
  );
  const relevanceScore = average(interactionScores.map((score) => score.relevance_score));
  const interactionScore = average(
    interactionScores.map((score) => score.interaction_score),
  );

  return {
    roundNumber,
    templateId,
    difficulty,
    items,
    readAloudAverage: readAloudScores.length > 0 ? average(readAloudScores) : null,
    vocabularyAverage: vocabularyScores.length > 0
      ? {
          keyword_score: keywordScore,
          ttr_score: ttrScore,
          vocab_score: vocabularyScore,
          band: bandFor(vocabularyScore),
        }
      : null,
    interactionAverage: interactionScores.length > 0
      ? {
          responsiveness_score: responsivenessScore,
          participation_score: participationScore,
          relevance_score: relevanceScore,
          interaction_score: interactionScore,
          band: bandFor(interactionScore),
        }
      : null,
    scoredVocabularyQuestionCount: vocabularyScores.length,
    scoredInteractionQuestionCount: interactionScores.length,
  };
}
