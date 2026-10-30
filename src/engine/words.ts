/** Everyday, family friendly words that count when banked in word mode. */
const RAW = `
ace act add age ago aid aim air all and ant any ape arc are arm art ash ask bad bag bat bed bee big bit box boy bud
bug bus but buy cab can cap car cat cow cry cup cut dad day den dig dog dot dry due ear eat egg end eye fan far fat
fed few fin fit fix fly fog for fox fun gap gas get gum guy had ham has hat hen her hid him his hot how hug ice ink
inn its jam jar jaw joy key kid kit lag lap law lay leg let lid lie lip log lot low mad man map mat men mix mud mug
nap net new nod not now nut oak oat odd off oil old one our out owl pad pan pat paw pay pea pen pet pie pig pin pit
pot pun put rag ran rat raw ray red rib rid rim rip rod row rub rug run sad sat saw say sea see set sew she shy sip
sit six sky sly son sub sum sun tab tag tan tap tea ten the tie tin tip toe ton top toy try tub two use van via wax
way web wet who why win wit won yes yet you zip zoo
able also area army away baby back ball band bank base bath bean bear beat bell belt bird blue boat body bone book
boot born both bowl cake call calm came camp card care cart case cave chat city clay coal coat cold come cook cool
corn cost crew crop dark data date dawn deal deep deer dish door down draw drop drum duck dust each east easy edge
face fact fair fall farm fast fear feel fell fire fish five flat flow food foot form four free from fuel full game
gift girl give glad goat gold good grow hair half hall hand hard have head hear heat help hide high hill hold home
hope hour huge hunt idea into iron jump keep kind king know lake lamp land last late lazy lead leaf lean life lift
like lime line lion list live long look lost loud love luck made mail main make male many mark mean meat meet mild
milk mind mine miss moon more most move much name near neck need nest nice nine noon nose note once only open over
pack page pain pair palm park part past path peak pick pink plan play plum pond pool poor port pull pure push race
rain rare read real rest rice rich ride ring rise road rock roof room root rope rose rule safe sail salt same sand
seat seed seem self sell ship shoe shop show side sign silk sing sink size skin slow snow soft soil some song soon
sort soul soup star stay step stop such sure swim tail take tale talk tall tank team tell tent test than that them
then they thin this tide tile time tiny tire told tone tool town tree trip true tube turn twin type unit upon used
very view walk wall want warm wash wave weak wear week well went were west what when wide wife wild will wind wine
wing wise wish with wolf wood wool word work worm yard year zero zone
apple beach bread bride brook candy chair charm cloud dance dream earth field flame flute frog fruit giant glass
grape green happy heart honey house juice lemon light magic maple money mouse music night ocean paper peace plant
queen river shell sleep smile snake solar sound space spoon stone storm story sugar sunny sweet table tiger tulip
water whale wheat world
bridge garden family flower window summer winter sunset island forest planet yellow orange purple rabbit silver
`;

export const WORDS: readonly string[] = Array.from(new Set(RAW.trim().split(/\s+/).map((w) => w.toUpperCase())));

const DICTIONARY: ReadonlySet<string> = new Set(WORDS);

export const MIN_WORD = 3;
export const TRAY_SIZE = 7;

export function isWord(letters: string): boolean {
  return letters.length >= MIN_WORD && DICTIONARY.has(letters.toUpperCase());
}

/** Letters used for gaps. Repeats make common letters turn up more often. */
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LETTER_POOL = 'EEEEAAAIIOOUTTNNRRSSLLDDCMHPBGWFYK';

const NARROW = 'IJLTFR';
const WIDE = 'MW';

export type LetterSize = 'narrow' | 'medium' | 'wide';

/** Thin letters get tight gaps, M and W get roomy ones. */
export function letterSize(letter: string): LetterSize {
  if (NARROW.includes(letter)) return 'narrow';
  if (WIDE.includes(letter)) return 'wide';
  return 'medium';
}

export const GAP_WIDTH: Record<LetterSize, number> = { narrow: 42, medium: 62, wide: 90 };

export function gapWidthForLetter(letter: string): number {
  return GAP_WIDTH[letterSize(letter)];
}
