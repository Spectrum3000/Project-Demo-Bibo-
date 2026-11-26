export type Language = 'en' | 'fil';
export type Difficulty = 0 | 1 | 2 | 3;

export const difficultyLabels = [
  { en: 'Diagnostic', fil: 'Diagnostic' },
  { en: 'Pre-A1', fil: 'Pre-A1' },
  { en: 'A1', fil: 'A1' },
  { en: 'A2', fil: 'A2' },
] as const;