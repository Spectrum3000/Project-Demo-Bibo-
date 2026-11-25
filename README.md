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
- `src/models/prompts.ts` - prompts and expected vocabulary keywords
- `src/models/scoring.ts` - vocabulary scoring and difficulty adaptation

The app supports English (`en-PH`) and Filipino (`fil-PH`) recognition, interim transcripts, replayable spoken prompts, and child-friendly scoring results. The native speech service may require network access or a downloaded language model depending on the device.

## Scoring and adaptation

Each prompt defines expected keywords in English and Filipino. `computeVocabularyScore` normalizes the learner's answer, matches expected words (including word-form prefixes such as `pula` in `pulang`), and calculates vocabulary range using type-token ratio. The selected exercise language applies a purity multiplier using the corresponding bilingual prompt text as a topic word list; fillers and words outside both lists are excluded from the purity denominator, so words recognized as belonging only to the other language reduce range. Responses shorter than three words receive a base TTR score of 0.3 before purity is applied. The composite is 60% keyword match and 40% TTR, and maps to Pre-A1 (<0.40), A1 (0.40–<0.70), or A2 (>=0.70).

Adaptive exercise difficulty uses three levels: 0 = Pre-A1, 1 = A1, and 2 = A2. The app averages the latest three vocabulary scores, promotes after three consecutive scores of at least 80/100, and steps down when the rolling average is below 50/100. These are transparent, rule-based practice estimates, not a validated language certification.
