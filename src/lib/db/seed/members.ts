import type { MemberWithFacts } from "../members";

// Transcribed from design/project/Members.dc.html + MemberDetail.dc.html + Main.dc.html <script> arrays.
// Fields with no column in `members` live in member_facts (label/value), the CMS-editable place for them:
//   Nationality · Fun fact (repeatable) · Pre-debut · Card rarity (home photocards). Height / MBTI are "TODO · verify" in the design, so no rows.
export const FACT = {
  nationality: "Nationality",
  fun: "Fun fact",
  preDebut: "Pre-debut",
  rarity: "Card rarity",
  height: "Height",
  mbti: "MBTI",
} as const;

interface Row {
  slug: string; stage: string; ko: string; born: string; pos: string[]; color: string; bio: string;
  nat: string; rarity: "holo" | "rare" | "common"; fun: string[]; pre: string;
}

const ROWS: Row[] = [
  { slug: "jiwoo", stage: "Jiwoo", ko: "지우", born: "2006-09-07", pos: ["Leader", "Dancer", "Rapper"], color: "#FFB3CF", nat: "South Korean", rarity: "holo",
    bio: "Cast at a convenience store while topping up her bus card with friends.",
    fun: ["Cast at a convenience store while topping up her bus card with friends.", "Studied ballet for years.", "Auditioned with Red Velvet’s “Peek-A-Boo.”"],
    pre: "Cast at a convenience store while topping up her bus card with friends." },
  { slug: "carmen", stage: "Carmen", ko: "카르멘", born: "2006-03-28", pos: ["Vocalist"], color: "#FFCBA4", nat: "Indonesian", rarity: "rare",
    bio: "Born in Bali; joined through SM’s Jakarta global audition.",
    fun: ["Born in Bali.", "Got into K-pop after watching Girls’ Generation perform.", "Joined through SM’s online and Jakarta global auditions."],
    pre: "Earned a trainee spot through SM’s online and Jakarta global auditions." },
  { slug: "yuha", stage: "Yuha", ko: "유하", born: "2007-04-12", pos: ["Vocalist", "Dancer"], color: "#A9E3CD", nat: "South Korean", rarity: "common",
    bio: "Won first place in a national piano competition in 4th grade.",
    fun: ["Won first place in a national piano competition in 4th grade.", "SM scouted her three times."],
    pre: "SM scouted her three times, including after she became a trainee." },
  { slug: "stella", stage: "Stella", ko: "스텔라", born: "2007-06-18", pos: ["Vocalist"], color: "#A8D8FF", nat: "South Korean · Canadian", rarity: "rare",
    bio: "Spent part of her childhood in Vancouver, Canada.",
    fun: ["Spent part of her childhood in Vancouver, Canada.", "Received casting offers from 32 agencies while training in Busan."],
    pre: "Received casting offers from 32 agencies while training in Busan." },
  { slug: "juun", stage: "Juun", ko: "주은", born: "2008-12-03", pos: ["Main Dancer", "Rapper"], color: "#CDBEFF", nat: "South Korean", rarity: "common",
    bio: "A busking video of her dancing to Red Velvet’s “Red Flavor” drew attention.",
    fun: ["A busking video of her dancing to Red Velvet’s “Red Flavor” drew attention.", "Auditioned with Red Velvet’s “Psycho.”"],
    pre: "A busking video posted by her mom drew a lot of attention." },
  { slug: "ana", stage: "A-na", ko: "에이나", born: "2008-12-20", pos: ["Vocalist", "Rapper"], color: "#FFE08A", nat: "South Korean", rarity: "rare",
    bio: "Sang the national anthem for her vocal test.",
    fun: ["Passed an SM in-house audition about a month after joining a Seoul dance academy.", "Sang the national anthem for her vocal test."],
    pre: "Passed an SM in-house audition about a month after joining a Seoul dance academy." },
  { slug: "ian", stage: "Ian", ko: "이안", born: "2009-10-09", pos: ["Dancer", "Vocalist"], color: "#F9B8DD", nat: "South Korean", rarity: "common",
    bio: "Started out as a kid model and was scouted on Instagram.",
    fun: ["Started out as a kid model and appeared briefly on TV.", "SM scouted her through Instagram."],
    pre: "SM scouted her through Instagram." },
  { slug: "yeon", stage: "Ye-on", ko: "예온", born: "2010-04-19", pos: ["Vocalist"], color: "#BCC6FF", nat: "South Korean", rarity: "holo",
    bio: "Trained in classical singing and musical theater from a young age.",
    fun: ["Trained in classical singing and musical theater from a young age.", "Auditioned with Taeyeon’s “UR” and passed the final audition five days later."],
    pre: "Auditioned with Taeyeon’s “UR” and passed the final audition five days later." },
];

const STAMP = "2025-01-01T00:00:00Z";

export const SEED_MEMBERS: MemberWithFacts[] = ROWS.map((r, i) => ({
  id: r.slug, slug: r.slug, stage_name: r.stage, name_ko: r.ko, real_name: null, birth_date: r.born,
  position: r.pos, color_hex: r.color, bio: r.bio, avatar_id: null, cover_id: null, gallery_ids: [],
  sort_order: i + 1, status: "published", created_at: STAMP, updated_at: STAMP, updated_by: null,
  facts: [
    { label: FACT.nationality, value: r.nat },
    { label: FACT.rarity, value: r.rarity },
    { label: FACT.preDebut, value: r.pre },
    ...r.fun.map((value) => ({ label: FACT.fun, value })),
  ],
}));

// Local stubs until the music module exists (MemberDetail "Timeline", "Photocard collection", "Featured songs").
export interface EraStub { title: string; date: string; body: string }
export const SEED_ERAS: EraStub[] = [
  { title: "The Chase", date: "2025-02-24", body: "Debut with the single album The Chase." },
  { title: "Style", date: "2025-06-18", body: "Digital single." },
  { title: "Focus", date: "2025-10-20", body: "First mini album, after the pre-release “Pretty Please.”" },
  { title: "Rude!", date: "2026-02-20", body: "Digital single, later on Lemon Tang." },
  { title: "Lemon Tang", date: "2026-06-22", body: "Second mini album." },
  { title: "Iconic Heart", date: "2026-08-12", body: "Japanese single." },
];
export interface TrackStub { title: string; album: string }
export const SEED_MEMBER_TRACKS: TrackStub[] = [
  { title: "The Chase", album: "The Chase" },
  { title: "Focus", album: "Focus" },
  { title: "Lemon Tang", album: "Lemon Tang" },
  { title: "Iconic Heart", album: "Iconic Heart" },
];
