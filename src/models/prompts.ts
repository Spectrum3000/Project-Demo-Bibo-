export type Language = 'en' | 'fil';
export type Difficulty = 0 | 1 | 2;

export type SpeakingPrompt = {
  id: string;
  difficulty: Difficulty;
  passage: Record<Language, string>;
  question: Record<Language, string>;
  expectedKeywords: Record<Language, string[]>;
};

export const difficultyLabels = [
  { en: 'Pre-A1', fil: 'Pre-A1' },
  { en: 'A1', fil: 'A1' },
  { en: 'A2', fil: 'A2' },
] as const;

export const speakingPrompts: SpeakingPrompt[] = [
  {
    id: 'seed',
    difficulty: 0,
    passage: {
      en: 'Lina finds a tiny seed. She plants it in a cup and gives it water. Soon, a green leaf grows.',
      fil: 'Nakakita si Lina ng maliit na buto. Itinanim niya ito sa tasa at diniligan. Di nagtagal, tumubo ang berdeng dahon.',
    },
    question: {
      en: 'What do you like to do after school?',
      fil: 'Ano ang gusto mong gawin pagkatapos ng klase?',
    },
    expectedKeywords: {
      en: ['seed', 'plant', 'water', 'leaf'],
      fil: ['buto', 'itanim', 'dilig', 'dahon'],
    },
  },
  {
    id: 'kite',
    difficulty: 0,
    passage: {
      en: 'Sam takes a red kite to the park. The wind lifts it high. Sam smiles and holds the string.',
      fil: 'Nagdala si Sam ng pulang saranggola sa parke. Itinaas ito ng hangin. Ngumiti si Sam habang hawak ang pisi.',
    },
    question: {
      en: 'What game do you like to play?',
      fil: 'Anong laro ang gusto mong laruin?',
    },
    expectedKeywords: {
      en: ['kite', 'wind', 'park', 'string'],
      fil: ['saranggola', 'hangin', 'parke', 'pisi'],
    },
  },
  {
    id: 'pancakes',
    difficulty: 1,
    passage: {
      en: 'Mia helps her grandpa make pancakes. She mixes the batter while he warms the pan. Their first pancake is lumpy, but it tastes good.',
      fil: 'Tumutulong si Mia sa lolo niya gumawa ng pancake. Hinahalo niya ang masa habang pinaiinit ng lolo ang kawali. Maumbok ang unang pancake, pero masarap ito.',
    },
    question: {
      en: 'What food do you enjoy, and what does it taste like?',
      fil: 'Anong pagkain ang gusto mo, at ano ang lasa nito?',
    },
    expectedKeywords: {
      en: ['pancake', 'grandpa', 'mix', 'taste'],
      fil: ['pancake', 'lolo', 'halo', 'masarap'],
    },
  },
  {
    id: 'turtle',
    difficulty: 1,
    passage: {
      en: 'Pip the turtle walks past a yellow flower and a smooth stone. Then Pip crosses a puddle and rests beside a shady pond.',
      fil: 'Dumaan si Pip na pagong sa dilaw na bulaklak at makinis na bato. Pagkatapos, tumawid siya sa tubig at nagpahinga sa tabi ng malilim na lawa.',
    },
    question: {
      en: 'Which animal would you like to be for a day, and why?',
      fil: 'Anong hayop ang gusto mong maging sa isang araw, at bakit?',
    },
    expectedKeywords: {
      en: ['turtle', 'flower', 'stone', 'pond'],
      fil: ['pagong', 'bulaklak', 'bato', 'lawa'],
    },
  },
  {
    id: 'library',
    difficulty: 1,
    passage: {
      en: 'Eli chooses a book about space from the library story corner. He pretends the blue cushions are a rocket, then begins his reading adventure.',
      fil: 'Pumili si Eli ng aklat tungkol sa kalawakan sa sulok-pambasa ng aklatan. Nagkunwari siyang rocket ang mga asul na unan, saka nagsimula sa kanyang pagbabasa.',
    },
    question: {
      en: 'Tell me about a story you enjoy. What happens in it?',
      fil: 'Ikuwento ang isang kuwentong gusto mo. Ano ang nangyayari rito?',
    },
    expectedKeywords: {
      en: ['book', 'space', 'library', 'rocket'],
      fil: ['aklat', 'kalawakan', 'aklatan', 'rocket'],
    },
  },
  {
    id: 'rainy-day',
    difficulty: 1,
    passage: {
      en: 'Dark clouds gather above the playground. Kai brings the soccer ball inside and builds a tall block tower. When the rain stops, the tower is still standing.',
      fil: 'Nagdilim ang mga ulap sa ibabaw ng palaruan. Ipinasok ni Kai ang bola at nagtayo ng mataas na tore mula sa mga bloke. Nang tumila ang ulan, nakatayo pa rin ito.',
    },
    question: {
      en: 'What do you do on a rainy day, and who do you spend time with?',
      fil: 'Ano ang ginagawa mo kapag umuulan, at sino ang kasama mo?',
    },
    expectedKeywords: {
      en: ['rain', 'playground', 'ball', 'tower'],
      fil: ['ulan', 'palaruan', 'bola', 'tore'],
    },
  },
  {
    id: 'garden',
    difficulty: 2,
    passage: {
      en: 'Ruby carries a basket of apples from the garden. One rolls beside a bench, so she picks it up, gives it a shine, and shares it with her little sister.',
      fil: 'Nag-uwi si Ruby ng basket ng mansanas mula sa hardin. Gumulong ang isa sa tabi ng bangko, kaya pinulot niya ito, pinunasan, at ibinahagi sa nakababatang kapatid.',
    },
    question: {
      en: 'Tell me about a time you shared something. What happened next?',
      fil: 'Ikuwento ang pagkakataong may ibinahagi ka. Ano ang nangyari pagkatapos?',
    },
    expectedKeywords: {
      en: ['apple', 'garden', 'share', 'sister'],
      fil: ['mansanas', 'hardin', 'bahagi', 'kapatid'],
    },
  },
  {
    id: 'island',
    difficulty: 2,
    passage: {
      en: 'Ella draws a map to a make-believe island with a candy forest, a tall volcano, and a bridge made of clouds. She gives the map to her cousin for an adventure.',
      fil: 'Gumuhit si Ella ng mapa ng kathang-isip na pulo na may gubat ng kendi, mataas na bulkan, at tulay na ulap. Ibinigay niya ang mapa sa pinsan para sa isang pakikipagsapalaran.',
    },
    question: {
      en: 'Imagine your own island. What would be there, and what would you do?',
      fil: 'Isipin ang sarili mong pulo. Ano ang makikita roon, at ano ang gagawin mo?',
    },
    expectedKeywords: {
      en: ['island', 'forest', 'volcano', 'cloud'],
      fil: ['pulo', 'gubat', 'bulkan', 'ulap'],
    },
  },
];

export function promptForDifficulty(
  difficulty: Difficulty,
  previousId?: string,
): SpeakingPrompt {
  const choices = speakingPrompts.filter(
    (prompt) => prompt.difficulty === difficulty && prompt.id !== previousId,
  );
  const prompts = choices.length > 0
    ? choices
    : speakingPrompts.filter((prompt) => prompt.difficulty === difficulty);
  return prompts[Math.floor(Math.random() * prompts.length)];
}
