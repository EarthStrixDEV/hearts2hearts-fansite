// Seed = arrays transcribed from design/project/Game.dc.html (<script>). Payload shapes: docs/game-payload.md
export interface QuestionPayload { text: string; options: string[]; answer: string; note: string }
export interface CardPayload { name: string; color_hex: string }
export interface SeedGameItem<P> { id: string; kind: "question" | "card"; payload: P; is_active: boolean; sort_order: number }

export interface GameCatalogEntry {
  key: "quiz" | "memory" | "song";
  name: string;
  desc: string;
  difficulty: "Easy" | "Medium" | "Hard";
  diffBg: string;
  bg: string;
  locked: boolean;
  cta: string;
}

const Q: QuestionPayload[] = [
  { text: "Who was born in Bali?", options: ["Stella", "Carmen", "Yuha", "Ian"], answer: "Carmen", note: "Carmen joined through SM’s Jakarta global audition." },
  { text: "Who spent part of her childhood in Vancouver, Canada?", options: ["Stella", "Jiwoo", "A-na", "Ye-on"], answer: "Stella", note: "Stella later trained in Busan." },
  { text: "Who won first place in a national piano competition in 4th grade?", options: ["Juun", "Ian", "Yuha", "Carmen"], answer: "Yuha", note: "SM scouted Yuha three times." },
  { text: "Who is the leader of Hearts2Hearts?", options: ["A-na", "Jiwoo", "Juun", "Stella"], answer: "Jiwoo", note: "Jiwoo also studied ballet for years." },
  { text: "Who auditioned with Taeyeon’s “UR”?", options: ["Ye-on", "Yuha", "Ian", "A-na"], answer: "Ye-on", note: "She passed the final audition five days later." },
];

const COLORS: Record<string, string> = {
  Jiwoo: "#FFB3CF", Carmen: "#FFCBA4", Yuha: "#A9E3CD", Stella: "#A8D8FF",
  Juun: "#CDBEFF", "A-na": "#FFE08A", Ian: "#F9B8DD", "Ye-on": "#BCC6FF",
};

export const SEED_QUESTIONS: SeedGameItem<QuestionPayload>[] = Q.map((payload, i) => ({
  id: `seed-q${i + 1}`, kind: "question", payload, is_active: true, sort_order: i,
}));

export const SEED_CARDS: SeedGameItem<CardPayload>[] = Object.entries(COLORS).map(([name, color_hex], i) => ({
  id: `seed-c${i + 1}`, kind: "card", payload: { name, color_hex }, is_active: true, sort_order: i,
}));

export const GAME_CATALOG: GameCatalogEntry[] = [
  { key: "quiz", name: "Quiz", desc: "Five questions from verified profile facts, beat the timer.", difficulty: "Easy", diffBg: "#BFF0DA", bg: "linear-gradient(135deg,#FFB6D5,#C9B6FF)", locked: false, cta: "Play quiz" },
  { key: "memory", name: "Memory Match", desc: "Flip the photocards and find all eight member pairs.", difficulty: "Medium", diffBg: "#FFF1B8", bg: "linear-gradient(135deg,#A8D8FF,#C9B6FF)", locked: false, cta: "Play memory" },
  { key: "song", name: "Guess the Song", desc: "Name the track from a three-second Spotify preview.", difficulty: "Hard", diffBg: "#FFE0E6", bg: "linear-gradient(135deg,#FFE08A,#FF9EC3)", locked: true, cta: "Needs Spotify previews" },
];
