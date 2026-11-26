# BIBO speaking practice

BIBO is now an Expo / React Native app. Install dependencies with `npm install`, then create and run a native development build:

```sh
npx expo prebuild
npm install firebase
npx expo install @react-native-async-storage/async-storage
npx expo run:android
```

For iOS, run `npx expo run:ios` on macOS with Xcode installed. The speech-recognition native module is not available in Expo Go; use a development build. Android speech recognition also requires a speech service (the config enables Google's service package).

Expo starts from `index.ts` and renders `App.tsx`. The source is organized with an MVVM-oriented React Native structure:

- `App.tsx` - Expo provider and application entry
- `src/models` - app data and model types
- `src/views` - screens, components, and presentation styles
- `src/viewmodels` - state and interaction logic
- `src/models/rounds.ts` - Firestore content types, validation, and round summaries
- `src/services/exercises.ts` - Firestore round loading
- `src/models/scoring.ts` - read-aloud word matching, vocabulary, interaction, and difficulty adaptation

The app supports English (`en-PH`) and Filipino (`fil-PH`) recognition, interim transcripts, replayable spoken prompts, and child-friendly scoring results. The native speech service may require network access or a downloaded language model depending on the device.

## Firestore round content

The app loads one `roundTemplates` document for the current level. Each template must contain exactly three unique `passageIds` and seven unique `questionIds`. Referenced documents must be active and have the same difficulty as the template. Difficulty 0 is the diagnostic; levels 1, 2, and 3 are Pre-A1, A1, and A2.

- `readingPassages/{id}` requires `active_status`, `difficulty` (0, 1, 2, or 3), bilingual `title` (`en`, `fil`), and bilingual `passage` (`en`, `fil`).
- `openEndedQuestions/{id}` requires `active_status`, `difficulty`, and a bilingual `prompt`. Optional `hints`, `answerKeywords`, and `relevanceKeywords` must also use `en` and `fil`.
- `roundTemplates/{id}` requires `difficulty`, `passageIds`, and `questionIds`.

The round preserves the template's IDs and order in memory. The bulk-edit script seeds the diagnostic and clearly marked placeholder exercises for levels 1–3. The app does not write attempts to Firestore because Firebase Authentication is not configured here. Public content reads still require suitable Firestore read rules and Firebase environment configuration.

## Scoring and adaptation

Read-aloud items are compared with the full reference passage using normalized word edit distance. This is an ASR word-matching proxy, not a pronunciation score; blank readings score zero, while unavailable recognition and missing references are reported separately.

For open-ended questions, `answerKeywords` provide vocabulary-scoring targets and `relevanceKeywords` provide relevance cues; they are not the only acceptable answers. A score is shown only when the corresponding guidance is present. Vocabulary scoring normalizes text, matches keyword prefixes, and combines keyword match (60%) with vocabulary range (40%); scores map to Pre-A1 (<0.40), A1 (0.40–<0.70), or A2 (>=0.70).

Vocabulary and interaction averages are shown separately from read-aloud matching. The diagnostic vocabulary band places the learner into the next level: Pre-A1 → 1, A1 → 2, or A2 → 3. Subsequent level changes happen only after a round completes: the app promotes after three consecutive vocabulary averages of at least 80/100 and steps down when the recent average is below 50/100, without returning to diagnostic. The placeholder exercises are not CEFR-validated. These are practice estimates, not validated language or pronunciation assessments.
