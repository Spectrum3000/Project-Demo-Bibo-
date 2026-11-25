import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  difficultyLabels,
  type Difficulty,
  type Language,
  type SpeakingPrompt,
} from '../models/prompts';
import type { VocabularyScore } from '../models/scoring';
import {
  useBiboViewModel,
  type Part,
} from '../viewmodels/useBiboViewModel';

const colors = {
  background: '#EAF8FB',
  cream: '#FFF6E9',
  ink: '#403260',
  muted: '#897EAA',
  purple: '#8568DF',
  purpleDark: '#514078',
  teal: '#38B487',
  coral: '#FF6D5A',
  orange: '#FFAD3F',
  white: '#FFFFFF',
  track: '#EEE4D3',
};

function BiboApp() {
  const vm = useBiboViewModel();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.app}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}>
            <View style={styles.brand}>
              <Text style={styles.brandMark}>✦</Text>
              <Text style={styles.brandName}>BIBO</Text>
            </View>
            <View style={styles.languageSwitch}>
              <LanguageButton
                label="EN"
                selected={vm.language === 'en'}
                onPress={() => vm.changeLanguage('en')}
              />
              <LanguageButton
                label="FIL"
                selected={vm.language === 'fil'}
                onPress={() => vm.changeLanguage('fil')}
              />
            </View>
          </View>

          {vm.screen === 'home' && (
            <HomeScreen
              language={vm.language}
              difficulty={vm.difficulty}
              message={vm.message}
              onStart={vm.startExercise}
            />
          )}

          {vm.screen === 'passage' && (
            <PracticeScreen
              part="passage"
              language={vm.language}
              prompt={vm.selectedPrompt}
              transcript={vm.passageTranscript}
              elapsedSeconds={vm.elapsedSeconds}
              isRecording={vm.isRecording}
              isSpeaking={vm.isSpeaking}
              message={vm.message}
              onBack={vm.goHome}
              onToggleRecording={() => vm.toggleRecording('passage')}
              onPlay={() => vm.playText(vm.selectedPrompt.passage[vm.language])}
              onNext={() => {
                if (vm.isRecording) vm.toggleRecording('passage');
                vm.setMessage('');
                vm.setScreen('question');
              }}
            />
          )}

          {vm.screen === 'question' && (
            <PracticeScreen
              part="question"
              language={vm.language}
              prompt={vm.selectedPrompt}
              transcript={vm.answerTranscript}
              elapsedSeconds={vm.elapsedSeconds}
              isRecording={vm.isRecording}
              isSpeaking={vm.isSpeaking}
              message={vm.message}
              onBack={vm.goHome}
              onToggleRecording={() => vm.toggleRecording('question')}
              onPlay={() => vm.playText(vm.selectedPrompt.question[vm.language])}
              onNext={() => {
                if (vm.isRecording) vm.toggleRecording('question');
                vm.setMessage('');
                vm.finishAttempt();
              }}
            />
          )}

          {vm.screen === 'results' && vm.scores && (
            <ResultsScreen
              language={vm.language}
              scores={vm.scores}
              answerTranscript={vm.answerTranscript}
              passageDuration={vm.passageDuration}
              answerDuration={vm.answerDuration}
              rollingAverage={vm.rollingAverage}
              nextDifficulty={vm.nextDifficulty}
              adaptiveHint={vm.adaptiveHint}
              difficultyLabel={vm.localizedDifficulty}
              onPlayAnswer={() => vm.playText(vm.answerTranscript)}
              onNext={vm.startExercise}
            />
          )}
        </ScrollView>

        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <NavButton
            icon="🏠"
            label={vm.language === 'en' ? 'Home' : 'Bahay'}
            active={vm.screen === 'home'}
            onPress={vm.goHome}
          />
          <NavButton
            icon="🎯"
            label={vm.language === 'en' ? 'Play' : 'Laro'}
            active={vm.screen === 'passage' || vm.screen === 'question'}
            onPress={() => {
              if (vm.screen === 'home' || vm.screen === 'results') vm.startExercise();
              else {
                if (vm.isRecording) vm.toggleRecording('passage');
                vm.setScreen('passage');
              }
            }}
          />
          <NavButton
            icon="🗺️"
            label={vm.language === 'en' ? 'Progress' : 'Usad'}
            active={vm.screen === 'results'}
            onPress={() => {
              if (vm.scores) vm.setScreen('results');
              else vm.setMessage(
                vm.language === 'en'
                  ? 'Finish a speaking quest to see your progress.'
                  : 'Tapusin muna ang pagsasanay para makita ang iyong usad.',
              );
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({
  language,
  difficulty,
  message,
  onStart,
}: {
  language: Language;
  difficulty: Difficulty;
  message: string;
  onStart: () => void;
}) {
  const english = language === 'en';
  return (
    <View>
      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>
          {english ? 'Good afternoon, Miguel! ☀️' : 'Magandang araw, Miguel! ☀️'}
        </Text>
        <Text style={styles.heroTitle}>
          {english ? 'Your speaking' : 'Simulan ang'}{' '}
          <Text style={styles.heroAccent}>
            {english ? 'adventure' : 'iyong kuwento'}
          </Text>
          {english ? ' starts here.' : ' ngayon!'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {english
            ? 'Small steps, brave voices, and a little fun every day.'
            : 'Unti-unting hakbang, matatapang na boses, at saya araw-araw.'}
        </Text>
      </View>

      <View style={styles.levelCard}>
        <Text style={styles.levelIcon}>🦜</Text>
        <View style={styles.levelInfo}>
          <Text style={styles.levelName}>{localizedLevelTitle(difficulty, language)}</Text>
          <Text style={styles.levelDescription}>
            {difficultyLabels[difficulty][language]}
            {english ? ' · Keep going!' : ' · Tuloy lang!'}
          </Text>
          <View style={styles.levelTrack}>
            <View style={[styles.levelProgress, { width: `${((difficulty + 1) / 3) * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.levelStar}>⭐</Text>
      </View>

      <SectionHeading
        title={english ? 'KEEP GOING' : 'TULOY LANG'}
        aside={english ? '2 min today' : '2 minuto ngayon'}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [styles.questCard, pressed && styles.pressed]}
      >
        <Text style={styles.questIcon}>🎙️</Text>
        <View style={styles.questCopy}>
          <Text style={styles.questTitle}>
            {english ? 'Tell me about your day!' : 'Ikuwento ang araw mo!'}
          </Text>
          <Text style={styles.questSubtitle}>
            {english ? 'Speak for a minute' : 'Magsalita nang isang minuto'}
          </Text>
        </View>
        <Text style={styles.questArrow}>›</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.coralStat]}>
          <Text style={styles.statValue}>7 🔥</Text>
          <Text style={styles.statLabel}>{english ? 'Day streak' : 'Araw na sunod-sunod'}</Text>
        </View>
        <View style={[styles.statCard, styles.purpleStat]}>
          <Text style={styles.statValue}>128 ⭐</Text>
          <Text style={styles.statLabel}>{english ? 'Stars earned' : 'Mga bituing nakuha'}</Text>
        </View>
      </View>

      <View style={styles.tipStrip}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          {english ? 'Try using a new word today!' : 'Sumubok gumamit ng bagong salita!'}
        </Text>
      </View>
      {!!message && <Text style={styles.errorMessage}>{message}</Text>}
    </View>
  );
}

function PracticeScreen({
  part,
  language,
  prompt,
  transcript,
  elapsedSeconds,
  isRecording,
  isSpeaking,
  message,
  onBack,
  onToggleRecording,
  onPlay,
  onNext,
}: {
  part: Part;
  language: Language;
  prompt: SpeakingPrompt;
  transcript: string;
  elapsedSeconds: number;
  isRecording: boolean;
  isSpeaking: boolean;
  message: string;
  onBack: () => void;
  onToggleRecording: () => void;
  onPlay: () => void;
  onNext: () => void;
}) {
  const english = language === 'en';
  const passagePart = part === 'passage';
  const promptText = passagePart ? prompt.passage[language] : prompt.question[language];
  const canContinue = transcript.trim().length > 0 && !isRecording;
  return (
    <View>
      <View style={styles.screenHeading}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={english ? 'Back to home' : 'Bumalik sa bahay'}
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>×</Text>
        </Pressable>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrowSmall}>
            {english ? 'SPEAKING EXERCISE' : 'PAGSASANAY SA PAGSASALITA'}
          </Text>
          <Text style={styles.screenTitle}>
            {passagePart
              ? english ? 'Tell your story' : 'Ikuwento ang sa iyo'
              : english ? 'Your answer' : 'Ikaw naman'}
          </Text>
        </View>
        <Text style={styles.stepCount}>{passagePart ? '1/2' : '2/2'}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={styles.progressDone} />
        <View style={[styles.progressDone, !passagePart && styles.progressActive]} />
        <View style={styles.progressEmpty} />
        <View style={styles.progressEmpty} />
        <View style={styles.progressEmpty} />
        <View style={styles.progressEmpty} />
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptAvatar}>{passagePart ? '🦜' : '💬'}</Text>
        <View style={styles.promptContent}>
          <Text style={styles.promptLabel}>
            {passagePart
              ? english ? 'READ ALOUD' : 'BASAHIN NANG MALAKAS'
              : english ? 'YOUR TURN' : 'IKAW NAMAN'}
          </Text>
          <Text style={styles.promptText}>{promptText}</Text>
          <Pressable onPress={onPlay} style={styles.playButton}>
            <Text style={styles.playButtonText}>
              {isSpeaking
                ? english ? '⏹ Stop' : '⏹ Ihinto'
                : english ? '🔊 Play again' : '🔊 Pakinggan muli'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.recordZone}>
        <View style={styles.recordOrbit}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? english ? 'Stop recording' : 'Ihinto ang pag-record'
                : english ? 'Start recording' : 'Simulan ang pag-record'
            }
            onPress={onToggleRecording}
            style={[styles.recordButton, isRecording && styles.recordingButton]}
          >
            <View style={[styles.recordDot, isRecording && styles.recordStop]} />
          </Pressable>
        </View>
        <Text style={styles.recordInstruction}>
          {isRecording
            ? english ? 'Listening… tap when you are done' : 'Nakikinig… tapikin kapag tapos na'
            : english ? 'Tap to talk!' : 'Tapikin para magsalita!'}
        </Text>
        <Text style={styles.recordTime}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <View style={styles.transcriptCard}>
        <Text style={styles.transcriptLabel}>
          {english ? 'I HEARD' : 'NARINIG KO'}
        </Text>
        <Text style={[styles.transcriptText, !transcript && styles.transcriptPlaceholder]}>
          {transcript ||
            (english
              ? 'Your words will appear here as you speak.'
              : 'Lalabas dito ang mga salita mo habang nagsasalita ka.')}
        </Text>
      </View>
      <Text style={styles.hint}>
        {passagePart
          ? english
            ? 'Read the whole passage aloud, then stop recording.'
            : 'Basahin nang malakas ang talata, saka ihinto ang pag-record.'
          : english
            ? 'Speak for about 30–60 seconds. There is no wrong answer.'
            : 'Magsalita nang mga 30–60 segundo. Walang maling sagot.'}
      </Text>
      {!!message && <Text style={styles.errorMessage}>{message}</Text>}

      <View style={styles.nextRow}>
        <View />
        <PrimaryButton
          title={passagePart
            ? english ? 'Next  →' : 'Sunod  →'
            : english ? 'See results  →' : 'Tingnan ang resulta  →'}
          disabled={!canContinue}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

function ResultsScreen({
  language,
  scores,
  answerTranscript,
  passageDuration,
  answerDuration,
  rollingAverage,
  nextDifficulty,
  adaptiveHint,
  difficultyLabel,
  onPlayAnswer,
  onNext,
}: {
  language: Language;
  scores: VocabularyScore;
  answerTranscript: string;
  passageDuration: number;
  answerDuration: number;
  rollingAverage: number;
  nextDifficulty: Difficulty;
  adaptiveHint: string;
  difficultyLabel: (level: Difficulty) => string;
  onPlayAnswer: () => void;
  onNext: () => void;
}) {
  const english = language === 'en';
  const scorePercent = Math.round(scores.vocab_score * 100);
  const answerWordCount = answerTranscript.trim()
    ? answerTranscript.trim().split(/\s+/u).length
    : 0;
  const criteria = [
    { key: 'keyword_score', icon: '🎯', name: english ? 'Keyword match' : 'Pagtugma ng mga salita', note: english ? 'Expected topic words recognized' : 'Mga inaasahang salitang nakilala' },
    { key: 'ttr_score', icon: '✨', name: english ? 'Vocabulary range' : 'Lawak ng bokabularyo', note: english ? 'Unique words / total words' : 'Natatanging salita / kabuuang salita' },
  ] as const;
  const bandDescription = {
    'Pre-A1': { en: 'Pre-A1 · Just starting', fil: 'Pre-A1 · Nagsisimula pa lang' },
    A1: { en: 'A1 · Growing', fil: 'A1 · Umunlad' },
    A2: { en: 'A2 · Ready for a challenge', fil: 'A2 · Handa sa hamon' },
  }[scores.band][language];

  return (
    <View>
      <Text style={styles.eyebrow}>{english ? 'YOUR ADVENTURE 🗺️' : 'ANG IYONG PAGLALAKBAY 🗺️'}</Text>
      <Text style={styles.resultsTitle}>{english ? 'Keep growing!' : 'Patuloy na umunlad!'}</Text>

      <View style={styles.badgeCard}>
        <Text style={styles.badgeEmoji}>🏆</Text>
        <View style={styles.badgeCopy}>
          <Text style={styles.promptLabel}>{english ? 'YOUR VOCABULARY BAND' : 'ANTAS NG BOKABULARYO'}</Text>
          <Text style={styles.badgeName}>{bandDescription}</Text>
          <Text style={styles.badgeNote}>
            {english ? 'A practice estimate based on this recording.' : 'Tantya lamang mula sa pagsasanay na ito.'}
          </Text>
        </View>
      </View>

      <View style={styles.scoreHero}>
        <Text style={styles.scoreNumber}>{scorePercent}</Text>
        <Text style={styles.scoreCaption}>
          {english ? 'Vocabulary score out of 100' : 'Marka ng bokabularyo mula sa 100'}
        </Text>
        <Text style={styles.cefrBadge}>{scores.band}</Text>
        <Text style={styles.starRating}>
          {'⭐'.repeat(Math.max(1, Math.ceil(scorePercent / 20)))}
        </Text>
      </View>

      <SectionHeading
        title={english ? 'HOW YOUR VOCABULARY IS GROWING' : 'PAG-UNLAD NG BOKABULARYO'}
        aside={english ? '2 measures' : '2 sukatan'}
      />
      <View style={styles.criteriaCard}>
        {criteria.map((criterion) => {
          const value = scores[criterion.key];
          return (
            <View key={criterion.key} style={styles.criterion}>
              <View style={styles.criterionTop}>
                <Text style={styles.criterionName}>
                  {criterion.icon}  {criterion.name}
                </Text>
                <Text style={styles.criterionValue}>{Math.round(value * 100)}</Text>
              </View>
              <View style={styles.criterionTrack}>
                <View style={[styles.criterionFill, { width: `${value * 100}%` }]} />
              </View>
              <Text style={styles.criterionNote}>{criterion.note}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.answerQuote}>
        <Text style={styles.transcriptLabel}>{english ? 'YOUR ANSWER' : 'ANG IYONG SAGOT'}</Text>
        <Text style={styles.answerText}>
          {answerTranscript || (english ? 'No words were recognized.' : 'Walang salitang nakilala.')}
        </Text>
        {!!answerTranscript && (
          <Pressable onPress={onPlayAnswer} style={styles.listenAgain}>
            <Text style={styles.listenAgainText}>
              {english ? '🔊 Listen to your answer' : '🔊 Pakinggan ang sagot'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.signalCard}>
        <Text style={styles.signalTitle}>
          {english ? 'Response details' : 'Mga detalye ng sagot'}
        </Text>
        <Text style={styles.signalText}>
          {english ? 'Words recognized: ' : 'Mga salitang nakilala: '}
          {answerWordCount}
        </Text>
        <Text style={styles.signalText}>
          {english ? 'Answer recording: ' : 'Pag-record ng sagot: '}
          {formatTime(Math.round(answerDuration))}
          {english ? ' · read-aloud ' : ' · pagbabasa '}
          {formatTime(Math.round(passageDuration))}
        </Text>
      </View>

      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackTitle}>
          {english ? 'Your next adventure' : 'Ang susunod mong pagsasanay'}
        </Text>
        <Text style={styles.feedbackText}>{adaptiveHint}</Text>
        <Text style={styles.adaptiveNote}>
          {english ? '3-exercise average' : 'Katamtaman ng 3 pagsasanay'}: {Math.round(rollingAverage)}
          {' · '}{english ? 'Next level' : 'Susunod na antas'}: {difficultyLabel(nextDifficulty)}
        </Text>
      </View>

      <View style={styles.nextRow}>
        <View />
        <PrimaryButton
          title={english ? 'Try another story  →' : 'Bagong kuwento  →'}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

function localizedLevelTitle(level: Difficulty, language: Language): string {
  const titles = [
    { en: 'Word Builder', fil: 'Tagabuo ng Salita' },
    { en: 'Story Starter', fil: 'Panimula ng Kuwento' },
    { en: 'Brave Speaker', fil: 'Matapang na Tagapagsalita' },
  ];
  return titles[level][language];
}

function LanguageButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.languageButton, selected && styles.languageButtonActive]}
    >
      <Text style={[styles.languageText, selected && styles.languageTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NavButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.navItem}
    >
      <Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({ title, aside }: { title: string; aside: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAside}>{aside}</Text>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.primaryButtonText, disabled && styles.primaryButtonTextDisabled]}>
        {title}
      </Text>
    </Pressable>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function AppView() {
  return <BiboApp />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 112,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.orange,
    color: colors.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20,
    fontWeight: '900',
  },
  brandName: {
    color: colors.purpleDark,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  languageSwitch: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: colors.white,
    gap: 3,
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 11,
  },
  languageButtonActive: {
    backgroundColor: colors.purple,
  },
  languageText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  languageTextActive: {
    color: colors.white,
  },
  heroCopy: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 22,
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroTitle: {
    marginTop: 12,
    color: colors.ink,
    fontSize: 39,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroAccent: {
    color: colors.purple,
  },
  heroSubtitle: {
    maxWidth: 340,
    marginTop: 13,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#746CDB',
    shadowColor: '#5C62B6',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  levelIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderColor: colors.white,
    borderWidth: 3,
    backgroundColor: colors.orange,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 25,
  },
  levelInfo: {
    flex: 1,
    gap: 3,
  },
  levelName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  levelDescription: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.9,
  },
  levelTrack: {
    height: 7,
    marginTop: 5,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  levelProgress: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#FFD55B',
  },
  levelStar: {
    alignSelf: 'flex-start',
    fontSize: 18,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 11,
  },
  sectionTitle: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionAside: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  questIcon: {
    width: 56,
    height: 56,
    marginRight: 13,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFE2CF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 27,
  },
  questCopy: {
    flex: 1,
    gap: 4,
  },
  questTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  questSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  questArrow: {
    color: '#AEA2C7',
    fontSize: 31,
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 17,
  },
  statCard: {
    flex: 1,
    gap: 5,
    padding: 16,
    borderRadius: 20,
  },
  coralStat: {
    backgroundColor: colors.coral,
  },
  purpleStat: {
    backgroundColor: colors.purpleDark,
  },
  statValue: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  tipStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 17,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFF1C9',
  },
  tipIcon: {
    fontSize: 18,
  },
  tipText: {
    flex: 1,
    color: '#886C35',
    fontSize: 12,
    fontWeight: '800',
  },
  screenHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#B7ABCD',
    fontSize: 30,
    lineHeight: 34,
  },
  headingCopy: {
    flex: 1,
  },
  eyebrowSmall: {
    marginBottom: 3,
    color: colors.purple,
    fontSize: 10,
    fontWeight: '900',
  },
  screenTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  stepCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 17,
  },
  progressDone: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.teal,
  },
  progressActive: {
    backgroundColor: colors.teal,
  },
  progressEmpty: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.track,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  promptAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#4DB88F',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 22,
  },
  promptContent: {
    flex: 1,
  },
  promptLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  promptText: {
    marginTop: 5,
    marginBottom: 11,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
  playButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#3DB4DC',
  },
  playButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  recordZone: {
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 13,
  },
  recordOrbit: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 54,
    backgroundColor: '#FFE0D9',
  },
  recordButton: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 7,
    borderColor: colors.white,
    borderRadius: 41,
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  recordingButton: {
    backgroundColor: '#E54C3A',
  },
  recordDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  recordStop: {
    width: 23,
    height: 23,
    borderRadius: 5,
  },
  recordInstruction: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  recordTime: {
    color: colors.coral,
    fontSize: 20,
    fontWeight: '900',
  },
  transcriptCard: {
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  transcriptLabel: {
    marginBottom: 5,
    color: colors.purple,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  transcriptText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  transcriptPlaceholder: {
    color: colors.muted,
  },
  hint: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorMessage: {
    marginTop: 10,
    color: '#AD3F32',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '800',
  },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 19,
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: colors.teal,
    shadowColor: '#164E3A',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D6D1CA',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButtonTextDisabled: {
    color: '#9E9890',
  },
  pressed: {
    opacity: 0.82,
  },
  bottomNav: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopColor: '#F0E9F2',
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  navItem: {
    minWidth: 52,
    alignItems: 'center',
    gap: 3,
  },
  navIcon: {
    fontSize: 19,
    opacity: 0.65,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    color: '#B4A9CA',
    fontSize: 9,
    fontWeight: '900',
  },
  navLabelActive: {
    color: colors.coral,
  },
  resultsTitle: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 27,
    fontWeight: '900',
  },
  badgeCard: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 19,
    padding: 16,
    borderRadius: 21,
    backgroundColor: '#FFB04A',
  },
  badgeEmoji: {
    fontSize: 33,
  },
  badgeCopy: {
    flex: 1,
  },
  badgeName: {
    marginTop: 4,
    color: colors.purpleDark,
    fontSize: 15,
    fontWeight: '900',
  },
  badgeNote: {
    marginTop: 4,
    color: colors.purpleDark,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  scoreHero: {
    alignItems: 'center',
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  scoreNumber: {
    color: colors.purple,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '900',
  },
  scoreCaption: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  cefrBadge: {
    marginTop: 9,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#E2F7EE',
    color: '#258765',
    fontSize: 11,
    fontWeight: '900',
  },
  starRating: {
    marginTop: 7,
    fontSize: 20,
  },
  criteriaCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 13,
  },
  criterion: {
    gap: 5,
  },
  criterionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  criterionName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  criterionValue: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '900',
  },
  criterionTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: colors.track,
  },
  criterionFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: colors.teal,
  },
  criterionNote: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  answerQuote: {
    marginTop: 13,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.purple,
    borderRadius: 14,
    backgroundColor: '#F3EFFF',
  },
  answerText: {
    color: colors.purpleDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  listenAgain: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },
  listenAgainText: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '900',
  },
  signalCard: {
    gap: 6,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  signalTitle: {
    marginBottom: 2,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  signalText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
  feedbackBox: {
    marginTop: 13,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#FFF1C9',
  },
  feedbackTitle: {
    marginBottom: 5,
    color: '#6F5C39',
    fontSize: 13,
    fontWeight: '900',
  },
  feedbackText: {
    color: '#6F5C39',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  adaptiveNote: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(111,92,57,0.2)',
    color: '#6F5C39',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
});
