import { useEffect, useMemo, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  difficultyLabels,
  promptForDifficulty,
  type Difficulty,
  type Language,
  type SpeakingPrompt,
} from '../models/prompts';
import {
  computeVocabularyScore,
  updateDifficulty,
  type TargetLanguage,
  type VocabularyScore,
} from '../models/scoring';

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

export function useBiboViewModel() {
  const [screen, setScreen] = useState<Screen>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [difficulty, setDifficulty] = useState<Difficulty>(0);
  const [nextDifficulty, setNextDifficulty] = useState<Difficulty>(0);
  const [recentScores, setRecentScores] = useState<number[]>([]);
  const [rollingAverage, setRollingAverage] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt>(
    () => promptForDifficulty(0),
  );
  const [passageTranscript, setPassageTranscript] = useState('');
  const [answerTranscript, setAnswerTranscript] = useState('');
  const [passageDuration, setPassageDuration] = useState(0);
  const [answerDuration, setAnswerDuration] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState('');
  const [scores, setScores] = useState<VocabularyScore | null>(null);
  const activePart = useRef<Part | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [isRecording]);

  nativeUseSpeechRecognitionEvent('result', (event) => {
    if (!event || !('results' in event)) return;
    const part = activePart.current;
    if (!part) return;
    const text = event.results.map((result) => result.transcript).join(' ').trim();
    if (part === 'passage') setPassageTranscript(text);
    else setAnswerTranscript(text);
  });

  nativeUseSpeechRecognitionEvent('error', (event) => {
    if (!event || !('error' in event)) return;
    setIsRecording(false);
    if (event.error === 'language-not-supported') {
      setMessage('This device does not support speech recognition for the selected language.');
    } else if (event.error === 'not-allowed') {
      setMessage('Allow microphone and speech recognition access in device settings.');
    } else if (event.error === 'no-speech') {
      setMessage('No speech was detected. Try speaking a little closer to the microphone.');
    } else {
      setMessage(event.message || 'Speech recognition stopped. Please try again.');
    }
  });

  nativeUseSpeechRecognitionEvent('end', () => {
    if (startedAt.current === 0) return;
    const duration = Math.max((Date.now() - startedAt.current) / 1000, 1);
    if (activePart.current === 'passage') setPassageDuration(duration);
    if (activePart.current === 'question') setAnswerDuration(duration);
    startedAt.current = 0;
    setIsRecording(false);
  });

  function resetAttempt(prompt: SpeakingPrompt) {
    Speech.stop();
    setIsSpeaking(false);
    activePart.current = null;
    setSelectedPrompt(prompt);
    setPassageTranscript('');
    setAnswerTranscript('');
    setPassageDuration(0);
    setAnswerDuration(0);
    setElapsedSeconds(0);
    setScores(null);
    setMessage('');
    setScreen('passage');
  }

  function startExercise() {
    resetAttempt(promptForDifficulty(difficulty, selectedPrompt.id));
  }

  async function startRecording(part: Part) {
    Speech.stop();
    setIsSpeaking(false);
    setMessage('');
    try {
      if (!ExpoSpeechRecognitionModule || !ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setMessage('Speech recognition requires a BIBO development build, not Expo Go.');
        return;
      }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setMessage('Allow microphone and speech recognition access to begin.');
        return;
      }
      activePart.current = part;
      startedAt.current = Date.now();
      setElapsedSeconds(0);
      if (part === 'passage') setPassageTranscript('');
      else setAnswerTranscript('');
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
      setIsRecording(false);
      setMessage('Could not start speech recognition. Please try again.');
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    const duration = Math.max((Date.now() - startedAt.current) / 1000, 1);
    const part = activePart.current;
    setIsRecording(false);
    startedAt.current = 0;
    if (part === 'passage') setPassageDuration(duration);
    if (part === 'question') setAnswerDuration(duration);
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {
      setMessage('Speech recognition could not be stopped cleanly.');
    }
  }

  function toggleRecording(part: Part) {
    if (isRecording) stopRecording();
    else void startRecording(part);
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

  function finishAttempt() {
    const targetLanguage: TargetLanguage = language === 'en' ? 'english' : 'filipino';
    const result = computeVocabularyScore(
      answerTranscript,
      selectedPrompt.expectedKeywords[language],
      targetLanguage,
      {
        english: [selectedPrompt.passage.en, selectedPrompt.question.en],
        filipino: [selectedPrompt.passage.fil, selectedPrompt.question.fil],
      },
    );
    const updatedScores = [...recentScores, result.vocab_score * 100].slice(-3);
    const adaptation = updateDifficulty(difficulty, updatedScores);
    setScores(result);
    setRecentScores(updatedScores);
    setNextDifficulty(adaptation.next);
    setRollingAverage(adaptation.rollingAverage);
    setDifficulty(adaptation.next);
    setScreen('results');
    const stars = Math.max(1, Math.ceil(result.vocab_score * 100 / 20));
    const feedback = language === 'en'
      ? `Great talking! You earned ${stars} ${stars === 1 ? 'star' : 'stars'}.`
      : `Magaling magsalita! Nakakuha ka ng ${stars} na bituin.`;
    Speech.speak(feedback, {
      language: language === 'en' ? 'en-PH' : 'fil-PH',
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  }

  const localizedDifficulty = (level: Difficulty) =>
    difficultyLabels[level][language];

  const adaptiveHint = useMemo(() => {
    if (nextDifficulty > selectedPrompt.difficulty) {
      return language === 'en'
        ? 'Great work! Your next story will have a little more challenge.'
        : 'Magaling! Mas magiging hamon nang kaunti ang susunod na kuwento.';
    }
    if (nextDifficulty < selectedPrompt.difficulty) {
      return language === 'en'
        ? 'Your next story will have extra help and a gentler pace.'
        : 'Mas maraming gabay at mas banayad na bilis ang susunod na kuwento.';
    }
    return language === 'en'
      ? 'Keep practicing at your current story level.'
      : 'Magpatuloy sa pagsasanay sa kasalukuyang antas.';
  }, [language, nextDifficulty, selectedPrompt.difficulty]);

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
      setPassageTranscript('');
      setAnswerTranscript('');
      setPassageDuration(0);
      setAnswerDuration(0);
      setElapsedSeconds(0);
      setMessage('');
      setScreen('passage');
    }
  }

  return {
    screen,
    setScreen,
    language,
    difficulty,
    nextDifficulty,
    rollingAverage,
    selectedPrompt,
    passageTranscript,
    answerTranscript,
    passageDuration,
    answerDuration,
    elapsedSeconds,
    isRecording,
    isSpeaking,
    message,
    setMessage,
    scores,
    adaptiveHint,
    localizedDifficulty,
    startExercise,
    toggleRecording,
    playText,
    finishAttempt,
    goHome,
    changeLanguage,
  };
}
