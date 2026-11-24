// Seed for /photos. Eras come from design/project/Photos.dc.html. Photos are hotlinked, never copied:
//  - COMMONS_PHOTOS: freely licensed Wikimedia Commons files (attribution shown in the viewer);
//  - official Short stills: the member x era thumbnails in db/data/photocards.json (© SM Entertainment, credited and linked).
import cards from "../../../../db/data/photocards.json";
import type { EraPhoto, PhotoEra } from "../photos";
import { COMMONS_PHOTOS } from "./commons-photos";
import { SEED_MEMBERS } from "./members";

const OFFICIAL = "Official Hearts2Hearts YouTube channel (SM Entertainment)";

/** photocards.json era titles to era ids. Pretty Please was FOCUS's pre-release single. */
const CARD_ERA: Record<string, string> = { "The Chase": "chase", STYLE: "style", "Pretty Please": "focus", FOCUS: "focus", "RUDE!": "rude", "Lemon Tang": "lemon", "ICONIC HEART": "iconic" };
const MEMBER_CARDS = cards.cards as Record<string, Record<string, string>>;

/**
 * Shorts that stay on the member photocards but not on this page, reviewed by eye on 2026-11-24: text burned into the
 * frame, motion blur, too dark, or a crop that cuts the face off.
 */
const SKIP_STILLS = new Set([
  "l00FMbzWZk4", "qaIwh8HJvj0", "_ryS4ygBOuA", // Lemon Tang: dark lying shot, subtitle text, extreme close-up
  "NQih5_BXrkI", // Rude!: too dark
  "Nd0M_Q6fFq0", "VbrKMO3SzpM", "whRLXGbz24U", // Focus: text overlays, blur
  "ubE9UuO98Wo", "6jRoMyoMo0M", "tVRMwU95SwY", "xBHCSuubpM4", // The Chase: motion blur, text overlay, cropped face
]);

const eraPhotos = (id: string): EraPhoto[] => [
  ...COMMONS_PHOTOS.filter((p) => p.era === id).map(
    (p): EraPhoto => ({
      who: p.who,
      event: p.event,
      src: p.src,
      w: p.w,
      h: p.h,
      alt: p.alt,
      credit: { by: p.author, license: p.license, licenseUrl: p.licenseUrl, sourceUrl: p.sourceUrl },
    }),
  ),
  ...SEED_MEMBERS.flatMap((m) =>
    Object.entries(MEMBER_CARDS[m.slug] ?? {})
      .filter(([title, video]) => CARD_ERA[title] === id && !SKIP_STILLS.has(video))
      .map(
        ([, video]): EraPhoto => ({
          who: m.stage_name,
          event: "Official Short",
          src: `https://i.ytimg.com/vi/${video}/oar2.jpg`,
          // YouTube Shorts thumbnails are always 9:16.
          w: 1080,
          h: 1920,
          alt: `${m.stage_name} of Hearts2Hearts, still from an official Short`,
          credit: { by: OFFICIAL, license: "© SM Entertainment", licenseUrl: null, sourceUrl: `https://www.youtube.com/shorts/${video}` },
        }),
      ),
  ),
];

const era = (id: string, title: string, kind: string, date: string, colors: PhotoEra["colors"]): PhotoEra => ({ id, title, kind, date, colors, photos: eraPhotos(id) });

export const SEED_PHOTO_ERAS: PhotoEra[] = [
  era("iconic", "Iconic Heart", "Japanese single", "Aug 2026", ["#FFE3F1", "#FF8FB8", "#C9B6FF"]),
  era("lemon", "Lemon Tang", "2nd mini album", "Jun 2026", ["#FFF6C9", "#FFE08A", "#CFF3DD"]),
  era("rude", "Rude!", "Digital single", "Feb 2026", ["#FFE0EC", "#FF9EC3", "#FFD8B8"]),
  era("focus", "Focus", "1st mini album", "Oct 2025", ["#E9E1FF", "#C9B6FF", "#BFE2FF"]),
  era("style", "Style", "Digital single", "Jun 2025", ["#DDF0FF", "#A8D8FF", "#FFE3F1"]),
  era("chase", "The Chase", "Single album · debut", "Feb 2025", ["#FFD6E7", "#FFB6D5", "#E9D9FF"]),
];
