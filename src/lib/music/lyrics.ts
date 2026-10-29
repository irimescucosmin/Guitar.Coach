import type { ChordId } from "./chords";
import type { Section } from "./songs";

/** One part of a song as played: its chords per bar, and the words sung over each bar on every repeat. */
export interface SungSection {
  name: Section["name"]; // "verse" | "chorus" (never "loop")
  bars: readonly ChordId[];
  /** words[r][i]: what is sung over bar i on repeat r; as many rows as repeats. */
  words: readonly (readonly string[])[];
}

/*
 * Conventions.
 * - One chord per bar. Where the real song changes chord inside a bar, the bar
 *   keeps the chord that sits under its strong beat; seventh chords (D7, G7)
 *   are played as the plain triad.
 * - The pickup that opens a sung line goes with the bar it leads into, as in a
 *   songbook: "Oh, when the saints" sits over the bar where "saints" falls.
 * - A word split across bars carries a hyphen: "Doo-" then "ley".
 * - "" is a bar of held note or plain strumming.
 */

// Tom Dooley: only the chorus, which is the old ballad's. The verses people
// know come from the Kingston Trio and Proffitt/Warner versions, whose rights
// are contested: the verse here is strummed, with no words.
const TOM_DOOLEY_CHORUS = [
  "Hang down your head, Tom", "Doo-ley,", "hang down your head and", "cry;",
  "hang down your head, Tom", "Doo-ley,", "poor boy, you're bound to", "die.",
];
const TOM_DOOLEY_VERSE = ["", "", "", "", "", "", "", ""];

// Will the Circle: Habershon's verse moves to D at the half line; the refrain
// has the C under the first "by and by".
const CIRCLE_VERSE: readonly ChordId[] = ["G", "G", "G", "D", "G", "G", "D", "G"];
const CIRCLE_REFRAIN: readonly ChordId[] = ["G", "G", "C", "G", "G", "G", "D", "G"];

const SKIP_CHORUS = [
  "Lou, Lou,", "skip to my Lou,", "Lou, Lou,", "skip to my Lou,",
  "Lou, Lou,", "skip to my Lou,", "skip to my Lou, my", "dar-ling.",
];
const SKIP: readonly ChordId[] = ["G", "G", "D", "D", "G", "G", "D", "G"];

const CLEMENTINE: readonly ChordId[] = ["G", "G", "G", "D", "D", "G", "D", "G"];
const CLEMENTINE_CHORUS = [
  "Oh my dar-ling,", "oh my dar-ling,", "oh my dar-ling", "Clem-en-tine!",
  "You are lost and", "gone for-ev-er,", "dread-ful sor-ry,", "Clem-en-tine.",
];

const SUSANNA_VERSE: readonly ChordId[] = ["G", "G", "G", "D", "G", "G", "D", "G"];

// Camptown Races: the 2/4 bars of Foster's score, one per bar here.
const CAMPTOWN_VERSE: readonly ChordId[] = ["G", "G", "G", "D", "G", "G", "D", "G"];
const CAMPTOWN_CHORUS_BARS: readonly ChordId[] = ["G", "G", "G", "C", "G", "G", "D", "G"];
const CAMPTOWN_CHORUS = [
  "Go-in' to run all", "night!", "go-in' to run all", "day!",
  "I'll bet my mon-ey on the", "bob-tail nag,", "some-bo-dy bet on the", "bay.",
];

// When the Saints: G7 before "number" played as G.
const SAINTS: readonly ChordId[] = ["G", "G", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"];
const SAINTS_CHORUS = [
  "Oh, when the saints", "go march-ing", "in,", "",
  "oh, when the saints", "go march-ing", "in,", "",
  "oh Lord, I want to be", "in that", "num-ber,", "",
  "oh, when the saints go", "march-ing", "in.", "",
];

const SWING_LOW: readonly ChordId[] = ["G", "C", "G", "D", "G", "C", "D", "G"];
const SWING_LOW_CHORUS = [
  "Swing low,", "sweet char-i-ot,", "com-in' for to car-ry me", "home;",
  "swing low,", "sweet char-i-ot,", "com-in' for to car-ry me", "home.",
];

// Michael: the catalogue's harmonisation (Em, Am before the cadence) is a
// common folk-revival choice; the plainest versions stay on G, C and D.
const MICHAEL: readonly ChordId[] = ["G", "C", "G", "G", "Em", "Am", "D", "G"];
const MICHAEL_CHORUS = [
  "Mi-chael, row the", "boat a-shore,", "hal-le-", "lu-jah!",
  "Mi-chael, row the", "boat a-shore,", "hal-le-", "lu-jah!",
];

// Auld Lang Syne: verse and chorus share the harmony in the usual setting.
// Bar 7 moves Em to D inside the bar ("auld lang"): kept as Em, which holds
// both the G and the E of the melody.
const AULD: readonly ChordId[] = ["G", "D", "G", "C", "G", "D", "Em", "G"];
const AULD_CHORUS = [
  "For auld lang syne, my", "dear,", "for auld lang", "syne;",
  "we'll take a cup o'", "kind-ness yet", "for auld lang", "syne.",
];

// Red River Valley: verse and chorus share the tune.
const RED_RIVER: readonly ChordId[] = ["G", "G", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "D", "D", "G", "G"];

// Drunken Sailor in D minor (Dorian): Dm and C, verse and chorus share the harmony.
const SAILOR: readonly ChordId[] = ["Dm", "Dm", "C", "C", "Dm", "Dm", "C", "Dm"];
const SAILOR_CHORUS = [
  "Way, hay, and", "up she ris-es,", "way, hay, and", "up she ris-es,",
  "way, hay, and", "up she ris-es,", "ear-ly in the", "mor-ning!",
];

// Swap of key for the A version: G becomes A, D becomes E.
const inA = (bars: readonly ChordId[]): ChordId[] =>
  bars.map((c) => (c === "G" ? "A" : c === "D" ? "E" : c));
const TOM_DOOLEY: readonly ChordId[] = ["G", "G", "G", "D", "D", "D", "D", "G"];

/** Public-domain traditional songs with their words. The catalogue's chords come from here. */
export const SUNG: Readonly<Record<string, readonly SungSection[]>> = {
  "skip-to-my-lou": [
    { name: "chorus", bars: SKIP, words: [SKIP_CHORUS] },
    { name: "verse", bars: SKIP, words: [[
      "Lost my part-ner,", "what'll I do?", "Lost my part-ner,", "what'll I do?",
      "Lost my part-ner,", "what'll I do?", "Skip to my Lou, my", "dar-ling.",
    ]] },
    { name: "chorus", bars: SKIP, words: [SKIP_CHORUS] },
    { name: "verse", bars: SKIP, words: [[
      "Flies in the but-ter-milk,", "shoo, fly, shoo,", "flies in the but-ter-milk,", "shoo, fly, shoo,",
      "flies in the but-ter-milk,", "shoo, fly, shoo,", "skip to my Lou, my", "dar-ling.",
    ]] },
    { name: "chorus", bars: SKIP, words: [SKIP_CHORUS] },
  ],

  // The D comes on "cry" and stays until "die".
  "tom-dooley": [
    { name: "chorus", bars: TOM_DOOLEY, words: [TOM_DOOLEY_CHORUS] },
    { name: "verse", bars: TOM_DOOLEY, words: [TOM_DOOLEY_VERSE] },
    { name: "chorus", bars: TOM_DOOLEY, words: [TOM_DOOLEY_CHORUS] },
  ],

  // No chorus: each stanza is two halves on the same eight bars (D7 played as D).
  "down-in-the-valley": [
    { name: "verse", bars: ["G", "G", "D", "D", "D", "D", "G", "G"], words: [
      ["Down in the val-ley,", "the val-ley so", "low;", "", "hang your head o-ver,", "hear the wind", "blow.", ""],
      ["Hear the wind blow, dear,", "hear the wind", "blow;", "", "hang your head o-ver,", "hear the wind", "blow.", ""],
      ["Ro-ses love sun-shine,", "vio-lets love", "dew;", "", "an-gels in hea-ven", "know I love", "you.", ""],
      ["Know I love you, dear,", "know I love", "you;", "", "an-gels in hea-ven", "know I love", "you.", ""],
    ] },
  ],

  clementine: [
    { name: "verse", bars: CLEMENTINE, words: [[
      "In a cav-ern,", "in a can-yon,", "ex-ca-va-ting", "for a mine,",
      "dwelt a mi-ner,", "for-ty-ni-ner,", "and his daugh-ter", "Clem-en-tine.",
    ]] },
    { name: "chorus", bars: CLEMENTINE, words: [CLEMENTINE_CHORUS] },
    { name: "verse", bars: CLEMENTINE, words: [[
      "Drove she duck-lings", "to the wa-ter", "ev-ery mor-ning", "just at nine;",
      "hit her foot a-", "gainst a splin-ter,", "fell in-to the", "foam-ing brine.",
    ]] },
    { name: "chorus", bars: CLEMENTINE, words: [CLEMENTINE_CHORUS] },
  ],

  // Habershon and Gabriel, 1907: verses 1 and 2 and the refrain.
  "will-the-circle": [
    { name: "verse", bars: CIRCLE_VERSE, words: [[
      "There are loved ones", "in the glo-ry,", "whose dear forms you", "of-ten miss;",
      "when you close your", "earth-ly sto-ry,", "will you join them", "in their bliss?",
    ]] },
    { name: "chorus", bars: CIRCLE_REFRAIN, words: [[
      "Will the cir-cle", "be un-bro-ken", "by and by,", "by and by?",
      "Is a bet-ter", "home a-wait-ing", "in the sky,", "in the sky?",
    ]] },
    { name: "verse", bars: CIRCLE_VERSE, words: [[
      "In the joy-ous", "days of child-hood", "oft they told of", "won-drous love,",
      "point-ed to the", "dy-ing Sav-ior;", "now they dwell with", "Him a-bove.",
    ]] },
    { name: "chorus", bars: CIRCLE_REFRAIN, words: [[
      "Will the cir-cle", "be un-bro-ken", "by and by,", "by and by?",
      "Is a bet-ter", "home a-wait-ing", "in the sky,", "in the sky?",
    ]] },
  ],

  // Foster, 1848: only the first verse and the chorus; the other verses are
  // minstrel-show caricature and stay out. The 2/4 bars of the score, one per bar.
  "oh-susanna": [
    { name: "verse", bars: SUSANNA_VERSE, words: [
      ["I come from Al-a-", "bam-a with my", "ban-jo on my", "knee;", "I'm go-ing to Lou-", "i-si-an-a, my", "true love for to", "see."],
      ["It rained all night the", "day I left, the", "weath-er it was", "dry;", "the sun so hot I", "froze to death; Su-", "san-na, don't you", "cry."],
    ] },
    { name: "chorus", bars: ["C", "C", "G", "D", "G", "G", "D", "G"], words: [[
      "Oh! Su-", "san-na,", "oh, don't you", "cry for me;",
      "for I come from Al-a-", "bam-a with my", "ban-jo on my", "knee.",
    ]] },
  ],

  // Foster, 1850: verses 1 and 2 in plain spelling, no dialect.
  "camptown-races": [
    { name: "verse", bars: CAMPTOWN_VERSE, words: [
      ["The Camp-town la-dies", "sing this song,", "doo-dah!", "doo-dah!", "The Camp-town race-track's", "five miles long,", "oh, doo-dah", "day!"],
      ["I come down there with my", "hat caved in,", "doo-dah!", "doo-dah!", "I go back home with a", "pock-et full of tin,", "oh, doo-dah", "day!"],
    ] },
    { name: "chorus", bars: CAMPTOWN_CHORUS_BARS, words: [CAMPTOWN_CHORUS] },
    { name: "verse", bars: CAMPTOWN_VERSE, words: [
      ["The long-tail fil-ly and the", "big black horse,", "doo-dah!", "doo-dah!", "They fly the track and they", "both cut a-cross,", "oh, doo-dah", "day!"],
      ["The blind horse stick-in' in a", "big mud hole,", "doo-dah!", "doo-dah!", "Can't touch bot-tom with a", "ten-foot pole,", "oh, doo-dah", "day!"],
    ] },
    { name: "chorus", bars: CAMPTOWN_CHORUS_BARS, words: [CAMPTOWN_CHORUS] },
  ],

  // One verse in the song: the same verse twice, the second time softer if you like.
  // Line 1 stays on G, line 2 on D until "comes", the third line goes to C.
  "coming-round-the-mountain": [
    { name: "verse", bars: ["G", "G", "G", "G", "D", "D", "G", "G", "G", "C", "C", "C", "G", "D", "G", "G"], words: [
      [
        "She'll be com-ing 'round the", "moun-tain when she", "comes,", "",
        "she'll be com-ing 'round the", "moun-tain when she", "comes,", "",
        "she'll be com-ing 'round the", "moun-tain,", "she'll be com-ing 'round the", "moun-tain,",
        "she'll be com-ing 'round the", "moun-tain when she", "comes.", "",
      ],
      [
        "She'll be driv-ing six white", "hors-es when she", "comes,", "",
        "she'll be driv-ing six white", "hors-es when she", "comes,", "",
        "she'll be driv-ing six white", "hors-es,", "she'll be driv-ing six white", "hors-es,",
        "she'll be driv-ing six white", "hors-es when she", "comes.", "",
      ],
    ] },
  ],

  "when-the-saints": [
    { name: "chorus", bars: SAINTS, words: [SAINTS_CHORUS] },
    { name: "verse", bars: SAINTS, words: [[
      "Oh, when the sun", "re-fuse to", "shine,", "",
      "oh, when the sun", "re-fuse to", "shine,", "",
      "oh Lord, I want to be", "in that", "num-ber,", "",
      "oh, when the sun re-", "fuse to", "shine.", "",
    ]] },
    { name: "chorus", bars: SAINTS, words: [SAINTS_CHORUS] },
  ],

  // Fisk Jubilee Singers, 1872: the verses have their own tune over the same chords.
  "swing-low": [
    { name: "chorus", bars: SWING_LOW, words: [SWING_LOW_CHORUS] },
    { name: "verse", bars: SWING_LOW, words: [[
      "I looked o-ver Jor-dan,", "and what did I see,", "com-in' for to car-ry me", "home?",
      "A band of an-gels", "com-in' af-ter me,", "com-in' for to car-ry me", "home.",
    ]] },
    { name: "chorus", bars: SWING_LOW, words: [SWING_LOW_CHORUS] },
    { name: "verse", bars: SWING_LOW, words: [[
      "If you get there", "be-fore I do,", "com-in' for to car-ry me", "home,",
      "tell all my friends", "I'm com-in' too,", "com-in' for to car-ry me", "home.",
    ]] },
    { name: "chorus", bars: SWING_LOW, words: [SWING_LOW_CHORUS] },
  ],

  // Verses from "Slave Songs of the United States" (1867), in plain spelling;
  // not the 1950s revival verses ("the river is deep and wide").
  "michael-row": [
    { name: "chorus", bars: MICHAEL, words: [MICHAEL_CHORUS] },
    { name: "verse", bars: MICHAEL, words: [[
      "Bro-ther, lend a", "help-ing hand,", "hal-le-", "lu-jah!",
      "Sis-ter, help to", "trim the boat,", "hal-le-", "lu-jah!",
    ]] },
    { name: "chorus", bars: MICHAEL, words: [MICHAEL_CHORUS] },
    { name: "verse", bars: MICHAEL, words: [[
      "Jor-dan stream is", "wide and deep,", "hal-le-", "lu-jah!",
      "Je-sus stand on the", "oth-er side,", "hal-le-", "lu-jah!",
    ]] },
    { name: "chorus", bars: MICHAEL, words: [MICHAEL_CHORUS] },
  ],

  // Burns, 1788: first and last verse, in the usual sung English.
  "auld-lang-syne": [
    { name: "verse", bars: AULD, words: [[
      "Should auld ac-quain-tance", "be for-got,", "and nev-er brought to", "mind?",
      "Should auld ac-quain-tance", "be for-got,", "and auld lang", "syne?",
    ]] },
    { name: "chorus", bars: AULD, words: [AULD_CHORUS] },
    { name: "verse", bars: AULD, words: [[
      "And there's a hand, my", "trus-ty friend,", "and gie's a hand o'", "thine;",
      "we'll tak' a right guid-", "wil-lie waught", "for auld lang", "syne.",
    ]] },
    { name: "chorus", bars: AULD, words: [AULD_CHORUS] },
  ],

  // The traditional ballad (Elfin Knight family), never the "canticle" of 1966.
  // A minor with the Dorian D major; no chorus, three verses.
  "scarborough-fair": [
    { name: "verse", bars: ["Am", "Am", "G", "Am", "C", "Am", "D", "Am", "Am", "C", "G", "Am", "G", "Am", "G", "Am"], words: [
      [
        "Are you", "go-ing to", "Scar-bor-ough", "Fair?", "Pars-ley,", "sage, rose-", "ma-ry and", "thyme;",
        "re-mem-ber", "me to one who", "lives", "there,", "for once she was", "a true", "love of", "mine.",
      ],
      [
        "Tell her to", "make me a", "cam-bric", "shirt,", "Pars-ley,", "sage, rose-", "ma-ry and", "thyme;",
        "with-out a-ny", "seam or nee-dle-", "work,", "", "then she'll be", "a true", "love of", "mine.",
      ],
      [
        "Tell her to", "find me an", "a-cre of", "land,", "Pars-ley,", "sage, rose-", "ma-ry and", "thyme;",
        "be-tween the salt", "wa-ter and the", "sea", "strand,", "then she'll be", "a true", "love of", "mine.",
      ],
    ] },
  ],

  // Verse 1 and chorus (same tune). "Smile" is a half cadence on D, "while" closes on G.
  "red-river-valley": [
    { name: "verse", bars: RED_RIVER, words: [[
      "From this val-ley they", "say you are", "go-ing,", "",
      "we will miss your bright", "eyes and sweet", "smile,", "",
      "for they say you are", "tak-ing the", "sun-shine", "",
      "that has bright-ened our", "path-way a", "while.", "",
    ]] },
    { name: "chorus", bars: RED_RIVER, words: [[
      "Come and sit by my", "side if you", "love me,", "",
      "do not has-ten to", "bid me a-", "dieu,", "",
      "but re-mem-ber the", "Red Riv-er", "Val-ley", "",
      "and the cow-boy who", "loved you so", "true.", "",
    ]] },
  ],

  // Higley, 1873, in the Lomax text (1910). The chorus opens on D (D7 in most books).
  "home-on-the-range": [
    { name: "verse", bars: ["G", "G", "C", "C", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"], words: [[
      "Oh, give me a home", "where the", "buf-fa-lo", "roam,",
      "where the deer", "and the an-te-lope", "play,", "",
      "where sel-dom is heard", "a dis-", "cour-ag-ing", "word,",
      "and the skies", "are not cloud-y all", "day.", "",
    ]] },
    { name: "chorus", bars: ["D", "D", "G", "G", "G", "G", "D", "D", "G", "G", "C", "C", "G", "D", "G", "G"], words: [[
      "Home,", "home on the", "range,", "",
      "where the deer", "and the an-te-lope", "play,", "",
      "where sel-dom is heard", "a dis-", "cour-ag-ing", "word,",
      "and the skies", "are not cloud-y all", "day.", "",
    ]] },
  ],

  // Newton, 1779: verses 1 to 3. Em on "blind" is the usual hymnal harmony.
  "amazing-grace": [
    { name: "verse", bars: ["G", "G", "C", "G", "G", "G", "D", "D", "G", "G", "C", "G", "Em", "D", "G", "G"], words: [
      ["A-ma-zing", "grace! How", "sweet the", "sound that", "saved a", "wretch like", "me!", "", "I once was", "lost, but", "now am", "found, was", "blind, but", "now I", "see.", ""],
      ["'Twas grace that", "taught my", "heart to", "fear, and", "grace my", "fears re-", "lieved;", "", "how pre-cious", "did that", "grace ap-", "pear the", "hour I", "first be-", "lieved.", ""],
      ["Through ma-ny", "dan-gers,", "toils and", "snares, I", "have al-", "read-y", "come;", "", "'tis grace hath", "brought me", "safe thus", "far, and", "grace will", "lead me", "home.", ""],
    ] },
  ],

  // Some books put Am on "early in the"; C keeps it to the two chords of the lesson.
  "drunken-sailor": [
    { name: "verse", bars: SAILOR, words: [[
      "What shall we do with a", "drunk-en sai-lor?", "What shall we do with a", "drunk-en sai-lor?",
      "What shall we do with a", "drunk-en sai-lor,", "ear-ly in the", "mor-ning?",
    ]] },
    { name: "chorus", bars: SAILOR, words: [SAILOR_CHORUS] },
    { name: "verse", bars: SAILOR, words: [[
      "Put him in the long-boat", "till he's so-ber,", "put him in the long-boat", "till he's so-ber,",
      "put him in the long-boat", "till he's so-ber,", "ear-ly in the", "mor-ning!",
    ]] },
    { name: "chorus", bars: SAILOR, words: [SAILOR_CHORUS] },
    { name: "verse", bars: SAILOR, words: [[
      "Shave his bel-ly with a", "rus-ty ra-zor,", "shave his bel-ly with a", "rus-ty ra-zor,",
      "shave his bel-ly with a", "rus-ty ra-zor,", "ear-ly in the", "mor-ning!",
    ]] },
    { name: "chorus", bars: SAILOR, words: [SAILOR_CHORUS] },
  ],

  "tom-dooley-in-a": [
    { name: "chorus", bars: inA(TOM_DOOLEY), words: [TOM_DOOLEY_CHORUS] },
    { name: "verse", bars: inA(TOM_DOOLEY), words: [TOM_DOOLEY_VERSE] },
    { name: "chorus", bars: inA(TOM_DOOLEY), words: [TOM_DOOLEY_CHORUS] },
  ],
};
