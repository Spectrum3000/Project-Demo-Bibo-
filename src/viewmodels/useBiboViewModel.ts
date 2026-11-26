import { useEffect, useMemo, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  difficultyLabels,
  type Difficulty,
  type Language,
} from '../models/prompts';
import {
  summarizeRound,
  type RoundDefinition,
  type RoundItem,
  type RoundItemResult,
  type RoundSummary,
} from '../models/rounds';
import {
  computeInteractionScore,
  computeReadAloudMatchScore,
  computeVocabularyScore,
  updateDifficulty,
  type TargetLanguage,
} from '../models/scoring';
import { loadRound } from '../services/exercises';

type RecognitionResultEvent = {
  results: Array<{ transcript: string }>;
};

type RecognitionErrorEvent = {
  error?: string;
  message?: string;
};

type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
};

type SpeechRecognitionEventName = 'result' | 'error' | 'end';
type SpeechRecognitionEventListener = (
  event: RecognitionResultEvent | RecognitionErrorEvent | undefined,
) => void;

export type Screen = 'home' | 'passage' | 'question' | 'results';
export type Part = 'passage' | 'question';

let ExpoSpeechRecognitionModule: SpeechRecognitionModule | null = null;
let nativeUseSpeechRecognitionEvent: (
  eventName: SpeechRecognitionEventName,
  listener: SpeechRecognitionEventListener,
) => void = () => undefined;

try {
  const speechRecognition = require('expo-speech-recognition') as {
    ExpoSpeechRecognitionModule: SpeechRecognitionModule;
    useSpeechRecognitionEvent: (
      eventName: SpeechRecognitionEventName,
      listener: SpeechRecognitionEventListener,
    ) => void;
  };
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  nativeUseSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
} catch {
  // Expo Go does not include this native module.
}

function partForItem(item: RoundItem): Part {
  return item.kind === 'readingPassage' ? 'passage' : 'question';
}

export function useBiboViewModel() {
  const [screen, setScreen] = useState<Screen>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [difficulty, setDifficulty] = useState<Difficulty>(0);
  const [nextDifficulty, setNextDifficulty] = useState<Difficulty>(0);
  const [recentRoundScores, setRecentRoundScores] = useState<number[]>([]);
  const [rollingAverage, setRollingAverage] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [round, setRound] = useState<RoundDefinition | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [itemResults, setItemResults] = useState<RoundItemResult[]>([]);
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentDuration, setCurrentDuration] = useState(0);
  const [recognitionUnavailable, setRecognitionUnavailable] = useState(false);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognitionStopping, setIsRecognitionStopping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const activePart = useRef<Part | null>(null);
  const startedAt = useRef(0);

  const currentItem = round?.items[itemIndex] ?? null;
  const currentPart = currentItem ? partForItem(currentItem) : null;
  const currentPrompt = currentItem
    ? currentItem.kind === 'readingPassage'
      ? currentItem.content.passage[language]
      : currentItem.content.prompt[language]
    : '';

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = setInterval(() => {
      setCurrentDuration((Date.now() - startedAt.current) / 1000);
    }, 250);
    return () => clearInterval(timer);
  }, [isRecording]);

  nativeUseSpeechRecognitionEvent('result', (event) => {
    if (!event || !('results' in event) || !activePart.current) return;
    setCurrentTranscript(event.results.map((result) => result.transcript).join(' ').trim());
  });

  nativeUseSpeechRecognitionEvent('error', (event) => {
    if (!event || !('error' in event)) return;
    if (startedAt.current !== 0) {
      setCurrentDuration(Math.max((Date.now() - startedAt.current) / 1000, 1));
    }
    startedAt.current = 0;
    activePart.current = null;
    setIsRecording(false);
    setIsRecognitionStopping(false);
    if (event.error !== 'no-speech') setRecognitionUnavailable(true);
    if (event.error === 'language-not-supported') {
      setMessage('This device does not support speech recognition for the selected language.');
    } else if (event.error === 'not-allowed') {
      setMessage('Allow microphone and speech recognition access in device settings.');
    } else if (event.error === 'no-speech') {
      setMessage('No speech was detected. You can try again or skip this item.');
    } else {
      setMessage(event.message || 'Speech recognition stopped. Please try again or skip this item.');
    }
  });

  nativeUseSpeechRecognitionEvent('end', () => {
    if (startedAt.current !== 0) {
      setCurrentDuration(Math.max((Date.now() - startedAt.current) / 1000, 1));
    }
    startedAt.current = 0;
    activePart.current = null;
    setIsRecording(false);
    setIsRecognitionStopping(false);
  });

  async function startRound() {
    if (isLoadingRound) return;
    if (isRecording || isRecognitionStopping) {
      setMessage('Wait for speech recognition to stop before starting a new round.');
      return;
    }
    Speech.stop();
    setIsSpeaking(false);
    setMessage('');
    setIsLoadingRound(true);
    setScreen('home');
    try {
      const loadedRound = await loadRound(difficulty);
      setRound(loadedRound);
      setItemIndex(0);
      setItemResults([]);
      setRoundSummary(null);
      setCurrentTranscript('');
      setCurrentDuration(0);
      setRecognitionUnavailable(false);
      setRoundNumber((current) => current + 1);
      setScreen(partForItem(loadedRound.items[0]) === 'passage' ? 'passage' : 'question');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Firestore error.';
      setMessage(`Could not load a round: ${detail}`);
    } finally {
      setIsLoadingRound(false);
    }
  }

  async function startRecording(part: Part) {
    Speech.stop();
    setIsSpeaking(false);
    setMessage('');
    try {
      if (!ExpoSpeechRecognitionModule || !ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setRecognitionUnavailable(true);
        setMessage('Speech recognition requires a BIBO development build, not Expo Go.');
        return;
      }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setRecognitionUnavailable(true);
        setMessage('Allow microphone and speech recognition access to begin.');
        return;
      }
      activePart.current = part;
      startedAt.current = Date.now();
      setCurrentTranscript('');
      setCurrentDuration(0);
      setRecognitionUnavailable(false);
      setIsRecognitionStopping(false);
      setIsRecording(true);
      ExpoSpeechRecognitionModule.start({
        lang: language === 'en' ? 'en-PH' : 'fil-PH',
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        addsPunctuation: true,
        contextualStrings: ['um', 'umm', 'uh', 'uhm', 'hmm', 'ano', 'kasi', 'like', 'then', 'but', 'because', 'tapos', 'pero', 'kaya'],
      });
    } catch {
      activePart.current = null;
      startedAt.current = 0;
      setRecognitionUnavailable(true);
      setIsRecording(false);
      setIsRecognitionStopping(false);
      setMessage('Could not start speech recognition. Please try again.');
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    const duration = Math.max((Date.now() - startedAt.current) / 1000, 1);
    setCurrentDuration(duration);
    setIsRecording(false);
    setIsRecognitionStopping(true);
    startedAt.current = 0;
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {
      activePart.current = null;
      setIsRecognitionStopping(false);
      setMessage('Speech recognition could not be stopped cleanly.');
    }
  }

  function toggleRecording(part: Part) {
    if (isRecording) stopRecording();
    else if (!isRecognitionStopping) void startRecording(part);
  }

  function playText(text: string) {
    if (isRecording) stopRecording();
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    Speech.speak(text, {
      language: language === 'en' ? 'en-PH' : 'fil-PH',
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        setMessage('Voice playback is not available on this device.');
      },
    });
    setIsSpeaking(true);
  }

  function finishCurrentItem() {
    if (!round || !currentItem || isRecording || isRecognitionStopping) return;
    const result: RoundItemResult = {
      kind: currentItem.kind,
      id: currentItem.content.id,
      label: currentItem.kind === 'readingPassage'
        ? currentItem.content.title
        : currentItem.content.prompt,
      transcript: currentTranscript,
      durationSeconds: currentDuration,
    };

    if (currentItem.kind === 'readingPassage') {
      result.readAloudMatch = computeReadAloudMatchScore(
        recognitionUnavailable ? null : currentTranscript,
        currentItem.content.passage[language],
      );
    } else {
      const targetLanguage: TargetLanguage = language === 'en' ? 'english' : 'filipino';
      const answerKeywords = currentItem.content.answerKeywords?.[language] ?? [];
      const relevanceKeywords = currentItem.content.relevanceKeywords?.[language]
        ?? currentItem.content.answerKeywords?.[language]
        ?? [];
      if (answerKeywords.length > 0) {
        result.vocabulary = computeVocabularyScore(
          currentTranscript,
          answerKeywords,
          targetLanguage,
          {
            english: [currentItem.content.prompt.en, currentItem.content.hints?.en ?? ''],
            filipino: [currentItem.content.prompt.fil, currentItem.content.hints?.fil ?? ''],
          },
        );
      }
      if (relevanceKeywords.length > 0) {
        result.interaction = computeInteractionScore([currentTranscript], relevanceKeywords, 1);
      }
    }

    const updatedResults = [...itemResults, result];
    setItemResults(updatedResults);
    setMessage('');

    if (itemIndex + 1 < round.items.length) {
      const nextIndex = itemIndex + 1;
      const nextItem = round.items[nextIndex];
      setItemIndex(nextIndex);
      setCurrentTranscript('');
      setCurrentDuration(0);
      setRecognitionUnavailable(false);
      setScreen(partForItem(nextItem) === 'passage' ? 'passage' : 'question');
      return;
    }

    const summary = summarizeRound(
      roundNumber,
      round.id,
      round.difficulty,
      updatedResults,
    );
    setRoundSummary(summary);
    if (summary.vocabularyAverage) {
      const updatedRoundScores = [
        ...recentRoundScores,
        summary.vocabularyAverage.vocab_score * 100,
      ].slice(-3);
      const adaptation = updateDifficulty(round.difficulty, updatedRoundScores);
      setRecentRoundScores(updatedRoundScores);
      setNextDifficulty(adaptation.next);
      setRollingAverage(adaptation.rollingAverage);
      setDifficulty(adaptation.next);
    } else {
      setNextDifficulty(round.difficulty);
      setRollingAverage(updateDifficulty(round.difficulty, recentRoundScores).rollingAverage);
    }
    setScreen('results');

    const stars = summary.vocabularyAverage
      ? Math.max(1, Math.ceil(summary.vocabularyAverage.vocab_score * 100 / 20))
      : null;
    const feedback = stars === null
      ? language === 'en' ? 'Round complete!' : 'Tapos na ang round!'
      : language === 'en'
        ? `Round complete! You earned ${stars} ${stars === 1 ? 'star' : 'stars'}.`
        : `Tapos na ang round! Nakakuha ka ng ${stars} na bituin.`;
    Speech.speak(feedback, {
      language: language === 'en' ? 'en-PH' : 'fil-PH',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  }

  function resumeCurrentItem() {
    if (!currentItem) return;
    setScreen(partForItem(currentItem) === 'passage' ? 'passage' : 'question');
  }

  const localizedDifficulty = (level: Difficulty) =>
    difficultyLabels[level][language];

  const adaptiveHint = useMemo(() => {
    const completedDifficulty = roundSummary?.difficulty ?? difficulty;
    if (nextDifficulty > completedDifficulty) {
      return language === 'en'
        ? 'Great work! Your next round will have a little more challenge.'
        : 'Magaling! Mas magiging hamon nang kaunti ang susunod na round.';
    }
    if (nextDifficulty < completedDifficulty) {
      return language === 'en'
        ? 'Your next round will have extra help and a gentler pace.'
        : 'Mas maraming gabay at mas banayad na bilis ang susunod na round.';
    }
    return language === 'en'
      ? 'Keep practicing at your current round level.'
      : 'Magpatuloy sa pagsasanay sa kasalukuyang antas.';
  }, [difficulty, language, nextDifficulty, roundSummary]);

  function goHome() {
    if (isRecording) stopRecording();
    Speech.stop();
    setIsSpeaking(false);
    setScreen('home');
  }

  function changeLanguage(next: Language) {
    if (next === language) return;
    if (isRecording) stopRecording();
    Speech.stop();
    setIsSpeaking(false);
    setLanguage(next);
    if (screen === 'passage' || screen === 'question') {
      activePart.current = null;
      setCurrentTranscript('');
      setCurrentDuration(0);
      setRecognitionUnavailable(false);
      setMessage('');
      if (currentItem) {
        setScreen(partForItem(currentItem) === 'passage' ? 'passage' : 'question');
      }
    }
  }

  return {
    screen,
    setScreen,
    language,
    difficulty,
    nextDifficulty,
    rollingAverage,
    roundNumber,
    round,
    currentItem,
    currentPart,
    currentPrompt,
    currentTranscript,
    currentDuration,
    recognitionUnavailable,
    itemIndex,
    itemResults,
    roundSummary,
    isLoadingRound,
    isRecording,
    isRecognitionStopping,
    isSpeaking,
    message,
    setMessage,
    adaptiveHint,
    localizedDifficulty,
    startRound,
    finishCurrentItem,
    toggleRecording,
    playText,
    resumeCurrentItem,
    goHome,
    changeLanguage,
  };
}
