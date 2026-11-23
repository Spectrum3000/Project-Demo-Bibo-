# BIBO speaking practice

BIBO is now an Expo / React Native app. Install dependencies with `npm install`, then create and run a native development build:

```sh
npx expo prebuild
npx expo run:android
```

For iOS, run `npx expo run:ios` on macOS with Xcode installed. The speech-recognition native module is not available in Expo Go; use a development build. Android speech recognition also requires a speech service (the config enables Google's service package).

Expo starts from `index.ts` and renders `App.tsx`. The source is organized with an MVVM-oriented React Native structure:

- `App.tsx` - Expo provider and application entry
- `src/models` - app data and model types
- `src/views` - screens, components, and presentation styles
- `src/viewmodels` - state and interaction logic
- `src/prompts.ts` - prompts
- `src/scoring.ts` - scoring rules

The app supports English (`en-PH`) and Filipino (`fil-PH`) recognition, interim transcripts, replayable spoken prompts, and child-friendly scoring results. The native speech service may require network access or a downloaded language model depending on the device.

## Scoring and adaptation

The PDF defines Fluency, Accuracy, Range, and Coherence, plus the 60–120 WPM target, score bands, and three-exercise difficulty rules. It does not prescribe criterion weights or a numeric penalty curve. BIBO therefore uses equal 25% criterion weights, a piecewise 60–120 WPM pace score, and the draft's 60/40 pace-to-filler fluency split. Filler density is penalized by `min(100, fillerCount / wordCount * 250)`. Accuracy is word overlap against the read-aloud passage; Range is type-token ratio; Coherence uses connector density.

The composite uses 30% Accuracy, 30% Fluency, 20% Range, and 20% Coherence. Accuracy supports mixed English-Filipino speech and close recognition matches, with a fallback to the answer transcript if the read-aloud transcript is empty.

Scores map to Pre-A1 (0–39), A1-Low (40–59), A1-Mid (60–79), and A1-High (80–100). The app averages the latest three exercise scores, promotes after three consecutive scores of at least 80, and steps down when the rolling average is below 50. These are transparent, rule-based estimates for practice, not a validated language certification.
