import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { IconButton } from "@/components/ui/IconButton";
import "./kit.css";

export const metadata: Metadata = {
  title: "UI kit",
  description: "Hearts2Hearts fan site UI kit: tokens and every component state.",
};

// Content below is the design's Kit artboard (design/project/Kit.dc.html), kept as static reference data.
const TOKENS = [
  { bg: "#FF8FB8", name: "pink-500", note: "#FF8FB8 · fills, icons" },
  { bg: "#C92A68", name: "pink-700", note: "#C92A68 · pink text, focus" },
  { bg: "#C9B6FF", name: "lilac-400", note: "#C9B6FF" },
  { bg: "#A8D8FF", name: "sky-300", note: "#A8D8FF" },
  { bg: "#FFF8F3", name: "cream-50", note: "#FFF8F3 · ground", border: true },
  { bg: "#2B2440", name: "ink-900 / ink-500", note: "#2B2440 · #6E6787" },
  { bg: "var(--holo)", name: "holo / holo-deep", note: "deep variant under white text" },
];
const PLAY_ICON = "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z";
const HEART_PATH = "M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z";

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="panel min-w-0">
    <h2 className="kt-title">{title}</h2>
    {children}
  </section>
);
const State = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className={`kt-state ${className ?? ""}`}>
    <span className="lbl">{label}</span>
    {children}
  </div>
);
const Arrow = ({ d = "M9 5l7 7-7 7", size = 18 }: { d?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
);
const Sparkle = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" fill="#FFB6D5" /></svg>
);
const heartBtn = <HeartIcon size={18} fill="currentColor" />;
const pill = "block rounded-full";

export default function KitPage() {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-10 sm:px-8 lg:px-16 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="lbl text-pink-700">Hearts2Hearts fan site</span>
          <h1 className="disp m-0 text-[clamp(36px,5vw,56px)] font-semibold tracking-[-0.02em]">UI kit &amp; states</h1>
        </div>
        <p className="m-0 max-w-[520px] text-sm leading-[1.6] text-ink-500">
          Every interactive component carries Default, Hover, Active, Focus (2px pink ring, 2px offset), Disabled and Loading. Reduced motion turns off tilt, parallax, vinyl spin and confetti.
        </p>
      </div>

      {/* TOKENS */}
      <Panel title="Tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {TOKENS.map((t) => (
            <State key={t.name} label="" className="[&>.lbl]:hidden">
              <span className="block h-[72px] w-full rounded-tile" style={{ background: t.bg, border: t.border ? "1px solid var(--line)" : undefined, boxSizing: "border-box" }} />
              <span className="text-[13px] font-semibold">{t.name}</span>
              <span className="text-xs text-ink-500">{t.note}</span>
            </State>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <State label="Radius">
            <div className="flex items-end gap-3">
              {[8, 16, 24].map((r) => <span key={r} className="block h-12 w-12 bg-[#FFE3F1]" style={{ borderRadius: r }} />)}
              <span className={`${pill} h-12 w-24 bg-[#FFE3F1]`} />
            </div>
            <span className="text-xs text-ink-500">8 · 16 · 24 · pill</span>
          </State>
          <State label="Shadow · glow · glass">
            <div className="flex gap-4">
              <span className="block h-14 w-24 rounded-tile bg-white shadow-pink" />
              <span className="block h-14 w-24 rounded-tile bg-white shadow-glow" />
              <span className="relative block h-14 w-24 overflow-hidden rounded-tile" style={{ background: "var(--holo)" }}><span className="glass absolute inset-2.5 block rounded-[10px]" /></span>
            </div>
          </State>
          <State label="Type">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <span className="disp text-[40px] font-semibold">Fredoka</span>
              <span className="text-lg">IBM Plex Sans KR · 하츠투하츠</span>
              <span className="sig text-[34px]">Signature</span>
            </div>
          </State>
          <State label="Motion"><span className="text-[13px] text-ink-500">spring 260 / 20 · hover 150ms · page 400ms</span></State>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* BUTTONS */}
        <Panel title="Buttons">
          <div className="flex flex-wrap gap-5">
            <State label="Default"><Button>{heartBtn}Listen Now</Button></State>
            <State label="Hover"><Button className="kt-hover">{heartBtn}Listen Now</Button></State>
            <State label="Pressed"><Button className="kt-press">{heartBtn}Listen Now</Button></State>
            <State label="Focus"><Button className="kt-focus">{heartBtn}Listen Now</Button></State>
            <State label="Disabled"><Button disabled>Listen Now</Button></State>
            <State label="Loading"><Button loading>Loading</Button></State>
          </div>
          <div className="flex flex-wrap gap-5">
            <State label="Secondary"><Button variant="secondary">Meet the members</Button></State>
            <State label="Hover"><Button variant="secondary" className="kt-hover">Meet the members</Button></State>
            <State label="Focus"><Button variant="secondary" className="kt-focus">Meet the members</Button></State>
            <State label="Disabled"><Button variant="secondary" disabled>Meet the members</Button></State>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <State label="Icon"><IconButton label="Next"><Arrow /></IconButton></State>
            <State label="Hover 1.1"><IconButton label="Next" className="kt-hover"><Arrow /></IconButton></State>
            <State label="Focus"><IconButton label="Next" className="kt-focus"><Arrow /></IconButton></State>
            <State label="Back to top">
              <IconButton label="Back to top" className="!h-14 !w-14 !border-0 text-white shadow-pink" style={{ background: "var(--holo-deep)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d={HEART_PATH} fill="currentColor" /><path d="M12 15V9m-3 3l3-3 3 3" stroke="#8A5CE6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </IconButton>
            </State>
          </div>
          <p className="m-0 text-xs text-ink-500">Primary uses the deep holo gradient so white text stays readable; the pastel holo is reserved for surfaces. Icon buttons are 44px for touch.</p>
        </Panel>

        {/* SMALL WIDGETS */}
        <Panel title="Small widgets">
          <div className="flex flex-wrap items-start gap-7">
            <State label="Toast · 3s">
              <div className="glass flex items-center gap-2 rounded-full px-[18px] py-3 text-sm font-medium text-[#2B2440] shadow-pink" style={{ background: "rgba(255,255,255,.85)" }}><HeartIcon size={16} />Added to your playlist</div>
            </State>
            <State label="Tooltip">
              <div className="flex flex-col items-center">
                <span className="rounded-lg bg-[#2B2440] px-2.5 py-1.5 text-xs text-white">Holo rarity · 1 in 8</span>
                <span className="-mt-[5px] block h-2.5 w-2.5 rotate-45 bg-[#2B2440]" />
              </div>
            </State>
            <State label="Chips">
              <div className="flex flex-wrap gap-1.5">
                {[["Recap", "#FFE3F1"], ["Discography", "#E6DCFF"], ["Trivia", "#DDF0FF"], ["2026", "#FFF1D6"]].map(([t, c]) => <Chip key={t} bg={c} color="#2B2440">{t}</Chip>)}
              </div>
            </State>
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <State label="Loader · loading screen">
              <svg width="96" height="96" viewBox="0 0 24 24" role="img" aria-label="Loading">
                <defs><clipPath id="kt-hc"><path d={HEART_PATH} /></clipPath></defs>
                <path d={HEART_PATH} fill="#FFE3F1" />
                <g clipPath="url(#kt-hc)"><g className="kt-wave"><path d="M-2 10 Q 4 8 10 10 T 22 10 T 34 10 T 46 10 V 30 H -2 Z" fill="#FF8FB8" /></g></g>
              </svg>
            </State>
            <State label="Empty state">
              <div className="flex items-center gap-3 rounded-tile border-[1.5px] border-dashed border-line px-5 py-4">
                <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={HEART_PATH} fill="#FFE3F1" /><circle cx="9" cy="11" r="1" fill="#2B2440" /><circle cx="15" cy="11" r="1" fill="#2B2440" />
                  <path d="M10 15c1.2-.8 2.8-.8 4 0" stroke="#2B2440" strokeWidth="1" fill="none" strokeLinecap="round" />
                </svg>
                <span className="text-sm text-ink-500">Nothing announced here yet.</span>
              </div>
            </State>
            <State label="Rarity badges">
              <div className="flex gap-1.5">
                <Chip bg="#F1EEF5" color="#2B2440">Common</Chip>
                <Chip bg="#fff" color="#8A3FC9" style={{ border: "1px solid #E6DCFF" }}>Rare</Chip>
                <Chip bg="#2B2440" color="#fff"><Sparkle />Holo</Chip>
              </div>
            </State>
          </div>
        </Panel>

        {/* MEMBER CARD */}
        <Panel title="MemberCard · 3:4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[false, true].map((hover) => (
              <State key={String(hover)} label={hover ? "Hover · zoom, lift, fact" : "Default"}>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border-t-4 border-[#A8D8FF]" style={{ background: "linear-gradient(165deg,#A8D8FF,#FFF8F3 130%)", boxShadow: hover ? "var(--shadow)" : "0 10px 24px rgba(43,36,64,.1)", transform: hover ? "translateY(-6px)" : undefined }}>
                  <span className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: "linear-gradient(0deg, rgba(43,36,64,.78), rgba(43,36,64,0))" }} />
                  <div className="absolute left-4 flex flex-col gap-1.5 text-white" style={{ bottom: hover ? 82 : 16 }}>
                    <span className="disp text-[26px] font-semibold">Stella <span className="text-sm font-normal">스텔라</span></span>
                    <Chip className="self-start" bg="#A8D8FF" color="#2B2440">Vocalist</Chip>
                  </div>
                  {hover && <span className="absolute inset-x-0 bottom-0 bg-white/90 px-4 py-3 text-xs leading-normal text-[#2B2440]">Spent part of her childhood in Vancouver, Canada.</span>}
                </div>
              </State>
            ))}
            <State label="Skeleton">
              <div className="shimmer relative aspect-[3/4] w-full rounded-card">
                <span className="absolute bottom-11 left-4 h-[18px] w-[55%] rounded-full bg-white/80" />
                <span className="absolute bottom-[18px] left-4 h-3.5 w-[35%] rounded-full bg-white/80" />
              </div>
            </State>
          </div>
        </Panel>

        {/* TILT CARD */}
        <Panel title="TiltCard · photocard">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3" style={{ perspective: 1000 }}>
            <State label="Front · resting">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border-[5px] border-white" style={{ background: "linear-gradient(160deg,#FFB3CF,#FFF8F3 120%)", boxShadow: "0 16px 32px rgba(43,36,64,.14)" }}>
                <Chip className="absolute right-2.5 top-2.5" bg="#2B2440" color="#fff">Holo</Chip>
                <span className="disp absolute bottom-3 left-3.5 text-[22px] font-semibold text-white" style={{ textShadow: "0 1px 8px rgba(43,36,64,.4)" }}>Jiwoo</span>
              </div>
            </State>
            <State label="Tilt ±15° · foil follows cursor">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border-[5px] border-white" style={{ background: "linear-gradient(160deg,#FFB3CF,#FFF8F3 120%)", boxShadow: "0 24px 40px rgba(43,36,64,.2)", transform: "rotateX(8deg) rotateY(-12deg)" }}>
                <span className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 20%, rgba(255,182,213,.9) 36%, rgba(201,182,255,.9) 46%, rgba(168,216,255,.9) 56%, transparent 75%)", backgroundSize: "260% 260%", backgroundPosition: "30% 20%", mixBlendMode: "color-dodge", opacity: 0.8 }} />
                <span className="absolute left-1/4 top-1/4 h-[140px] w-[140px] rounded-full" style={{ margin: "-70px 0 0 -70px", background: "radial-gradient(circle, rgba(255,255,255,.6), rgba(255,255,255,0) 65%)" }} />
                <Chip className="absolute right-2.5 top-2.5" bg="#2B2440" color="#fff">Holo</Chip>
                <span className="disp absolute bottom-3 left-3.5 text-[22px] font-semibold text-white" style={{ textShadow: "0 1px 8px rgba(43,36,64,.4)" }}>Jiwoo</span>
              </div>
            </State>
            <State label="Back · flipped 180°">
              <div className="flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-card border-[5px] border-white bg-[#FFB3CF] p-4" style={{ boxShadow: "0 16px 32px rgba(43,36,64,.14)" }}>
                <span className="sig block text-[40px] text-[#2B2440]" style={{ transform: "rotate(-6deg)" }}>Jiwoo</span>
                <span className="flex flex-col gap-1.5 text-xs leading-[1.4] text-[#2B2440]"><span>Born Sep 7, 2006</span><span>South Korean</span><span>Cast at a convenience store</span></span>
              </div>
            </State>
          </div>
        </Panel>

        {/* MUSIC */}
        <Panel title="Music widget">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
              <State label="Compact · 280×56 · paused">
                <div className="glass box-border flex h-14 w-[280px] max-w-full items-center gap-2.5 rounded-full px-1.5 text-[#2B2440] shadow-pink" style={{ background: "rgba(255,255,255,.85)" }}>
                  <span className="block h-11 w-11 flex-none rounded-full" style={{ background: "linear-gradient(135deg,#FFF6C9,#FFE08A 50%,#CFF3DD)", boxShadow: "inset 0 0 0 10px rgba(43,36,64,.18)" }} />
                  <span className="min-w-0 flex-1"><span className="block text-[11px] text-ink-500">Now playing</span><span className="block truncate text-sm font-semibold">Lemon Tang · Hearts2Hearts</span></span>
                  <IconButton label="Play" className="!border-0 text-white" style={{ background: "var(--holo-deep)" }}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d={PLAY_ICON} fill="currentColor" /></svg></IconButton>
                </div>
              </State>
              <State label="Tracklist rows · default / hover / active" className="w-full">
                <div className="flex w-full flex-col gap-0.5">
                  <div className="grid min-h-11 grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl px-3 text-[15px]"><span className="text-center text-ink-500">1</span><span>Focus</span><span className="text-[13px] text-ink-500">–:––</span></div>
                  <div className="grid min-h-11 grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl bg-line px-3 text-[15px]"><span className="flex justify-center text-ink-500"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d={PLAY_ICON} fill="currentColor" /></svg></span><span>Pretty Please</span><span className="text-[13px] text-ink-500">–:––</span></div>
                  <div className="grid min-h-11 grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-pink-700">
                    <span className="kt-eq flex h-3.5 items-end justify-center gap-0.5" aria-hidden="true"><span /><span style={{ animationDelay: "-.3s" }} /><span style={{ animationDelay: "-.6s" }} /></span>
                    <span>Lemon Tang</span><span className="text-[13px] font-normal text-ink-500">–:––</span>
                  </div>
                </div>
              </State>
            </div>
            <State label="Expanded · 360×520 (scaled)">
              <div className="relative h-[312px] w-[216px] overflow-hidden rounded-[20px] bg-[#2B2440] text-white">
                <div className="absolute -inset-10 blur-[30px]" style={{ background: "linear-gradient(135deg,#FFF6C9,#FFE08A 50%,#CFF3DD)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(43,36,64,.1), rgba(43,36,64,.72))" }} />
                <div className="relative box-border flex h-full flex-col gap-2.5 p-4">
                  <span className="mx-auto block h-[140px] w-[140px] rounded-full" style={{ background: "linear-gradient(135deg,#FFF6C9,#FFE08A 50%,#CFF3DD)", boxShadow: "0 12px 24px rgba(0,0,0,.25)" }} />
                  <span className="disp text-lg font-semibold">Lemon Tang</span>
                  <span className="block h-1 rounded-full" style={{ background: "linear-gradient(90deg,#FF8FB8 40%, rgba(255,255,255,.3) 40%)" }} />
                  <span className="mt-auto flex items-center justify-between text-[11px] opacity-90"><span>shuffle</span><span>prev</span><span className="block h-10 w-10 rounded-full bg-white" /><span>next</span><span>repeat</span></span>
                </div>
              </div>
            </State>
          </div>
        </Panel>

        {/* CAROUSEL & NAV */}
        <Panel title="Carousel & navbar">
          <State label="Indicators · active dot stretches · glass arrows · caption strip" className="w-full">
            <div className="relative aspect-[16/7] w-full overflow-hidden rounded-[20px]" style={{ background: "linear-gradient(135deg,#E9E1FF,#C9B6FF 50%,#BFE2FF)" }}>
              <IconButton label="Previous slide" className="glass absolute left-3 top-1/2 -mt-[22px]"><Arrow d="M15 5l-7 7 7 7" /></IconButton>
              <IconButton label="Next slide" className="glass absolute right-3 top-1/2 -mt-[22px]"><Arrow /></IconButton>
              <div className="glass absolute bottom-3 left-3 flex flex-col rounded-xl px-3.5 py-2"><span className="disp text-base font-semibold">Focus</span><span className="text-xs text-ink-500">1st mini album · Oct 20, 2025</span></div>
            </div>
            <div className="flex w-full justify-center gap-2" aria-hidden="true">
              {[8, 8, 28, 8, 8].map((w, i) => <span key={i} className={pill} style={{ width: w, height: 8, background: i === 2 ? "#C92A68" : "rgba(43,36,64,.25)" }} />)}
            </div>
          </State>
          <div className="flex flex-wrap items-start gap-5">
            <State label="Navbar · 64px · active heart dot" className="min-w-[280px] flex-1">
              <div className="glass box-border flex h-16 w-full items-center justify-between gap-3 rounded-tile px-4" style={{ background: "rgba(255,255,255,.8)", color: "#2B2440" }}>
                <span className="flex items-center gap-2"><HeartIcon size={24} /><span className="disp font-semibold">H2H·S2U</span></span>
                <span className="hidden gap-3.5 text-[13px] text-ink-500 sm:flex">
                  <span className="relative text-ink-900">Home<span className="absolute -bottom-[9px] left-1/2 -ml-[3.5px]"><HeartIcon size={7} /></span></span>
                  <span>Members</span><span>Music</span><span>Blog</span>
                </span>
                <Chip bg="#FFE3F1" color="#9E1D50">Now playing</Chip>
              </div>
            </State>
            <State label="Mobile sheet">
              <div className="box-border flex h-[220px] w-[150px] flex-col gap-1 rounded-[20px] border border-line bg-cream-50 p-3.5">
                <span className="block h-[22px] w-[22px] self-end rounded-full bg-line" />
                {[["Home", 1], ["Members", 0.85], ["Music", 0.7], ["Blog", 0.55], ["Game", 0.4]].map(([t, o]) => <span key={t} className="disp text-lg font-semibold" style={{ opacity: o as number }}>{t}</span>)}
              </div>
            </State>
          </div>
        </Panel>

        {/* EVENT & COUNTDOWN */}
        <Panel title="EventCard & countdown">
          <div className="flex flex-col gap-2.5">
            {[
              { bg: "#FFB6D5", m: "DEC", d: "20", w: "Sun", name: "[EVENT NAME]", sub: "[CITY] · [VENUE]", chip: <Chip bg="#FFE3F1" color="#9E1D50">Upcoming</Chip> },
              { bg: "#E3E0EA", m: "MAR", d: "22", w: "Sun", name: "[EVENT NAME]", sub: "[CITY] · [VENUE]", chip: <Chip bg="#6E6787" color="#fff">Sold out</Chip> },
              { bg: "#E6DCFF", m: "MAR", d: "28", w: "Sat", name: "Hearts2House 2026", sub: "Jakarta · Tennis Indoor Senayan", chip: <Chip bg="rgba(43,36,64,.08)" color="#6E6787">Past</Chip>, past: true },
            ].map((e) => (
              <div key={e.m + e.d} className="flex overflow-hidden rounded-tile border border-line" style={{ opacity: e.past ? 0.65 : 1 }}>
                <div className="flex w-20 flex-none flex-col items-center justify-center py-2.5 text-[#2B2440]" style={{ background: e.bg }}>
                  <span className="text-[11px] font-semibold">{e.m}</span><span className="disp text-[30px] font-semibold leading-none">{e.d}</span><span className="text-[11px]">{e.w}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3"><span className="truncate font-semibold">{e.name}</span><span className="truncate text-[13px] text-ink-500">{e.sub}</span></div>
                <div className="flex items-center pr-3.5">{e.chip}</div>
              </div>
            ))}
          </div>
          <div className="grid max-w-[370px] grid-cols-4 gap-2.5">
            {[["63", "Days"], ["04", "Hours"], ["12", "Min"], ["37", "Sec · flipping"]].map(([n, l], i) => (
              <div key={l} className="flex flex-col items-center gap-1.5">
                <span className="disp w-full rounded-[14px] bg-white py-3.5 text-center text-[clamp(22px,3vw,32px)] font-semibold text-[#2B2440] shadow-pink" style={{ transform: i === 3 ? "rotateX(25deg)" : undefined }}>{n}</span>
                <span className="lbl text-center">{l}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* BLOG */}
        <Panel title="Blog card & detail">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-[300px] max-w-full flex-none overflow-hidden rounded-[20px] border border-line bg-surface">
              <div className="relative aspect-video" style={{ background: "linear-gradient(135deg,#FFF6C9,#FFB6D5 60%,#C9B6FF)" }}>
                <Chip className="absolute right-2.5 top-2.5" bg="#2B2440" color="#fff"><Sparkle />AI</Chip>
              </div>
              <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
                <span className="flex gap-1.5"><Chip bg="#FFE3F1" color="#2B2440">Recap</Chip></span>
                <span className="disp text-lg font-semibold leading-tight">Era recap: from The Chase to Lemon Tang</span>
                <span className="text-xs text-ink-500">Oct 18, 2026 · 5 min read</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] gap-4">
              <div className="flex max-w-[360px] flex-1 flex-col gap-2.5">
                <Chip className="self-start whitespace-normal !h-auto py-1" bg="#2B2440" color="#fff"><Sparkle />Written by AI · fan content, not official</Chip>
                <span className="disp text-2xl font-semibold leading-tight">Detail page · 720px column</span>
                <span className="text-sm leading-[1.8] text-ink-500">Body copy runs at line-height 1.8 in a 720px column. Facts only from verified sources; no member quotes, ever.</span>
              </div>
              <div className="hidden w-[140px] flex-none flex-col gap-2 border-l-2 border-[#FFE3F1] pl-3 text-xs text-ink-500 sm:flex">
                <span className="lbl">On this page</span><span className="font-semibold text-pink-700">The Chase</span><span>Style</span><span>Focus</span><span>Lemon Tang</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* GAME ANSWERS */}
        <Panel title="Mini game answers">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <State label="Default" className="w-full"><span className="kt-ans">Carmen</span></State>
            <State label="Hover" className="w-full"><span className="kt-ans" style={{ borderColor: "#FF8FB8", transform: "translateY(-2px)" }}>Carmen</span></State>
            <State label="Correct · mint pop + confetti hearts" className="w-full"><span className="kt-ans ok">Carmen</span></State>
            <State label="Wrong · gentle shake" className="w-full"><span className="kt-ans bad">Stella</span></State>
          </div>
        </Panel>

        {/* MODAL */}
        <Panel title="Modal & bottom sheet">
          <div className="flex flex-wrap items-end gap-6">
            <State label="Desktop · centered, dim + blur, scale .95 → 1" className="min-w-[260px] flex-1">
              <div className="flex h-[220px] w-full items-center justify-center rounded-tile" style={{ background: "rgba(43,36,64,.45)" }}>
                <div className="flex h-[150px] w-[70%] overflow-hidden rounded-card bg-cream-50" style={{ boxShadow: "0 20px 50px rgba(43,36,64,.35)" }}>
                  <span className="block w-[40%]" style={{ background: "linear-gradient(165deg,#A8D8FF,#FFF8F3 130%)" }} />
                  <span className="flex flex-1 flex-col gap-1.5 p-4"><span className="disp text-xl font-semibold">Stella</span><span className="block h-2 w-[70%] rounded-full bg-line" /><span className="block h-2 w-1/2 rounded-full bg-line" /></span>
                </div>
              </div>
            </State>
            <State label="Mobile · drag handle, swipe down">
              <div className="flex h-[220px] w-[150px] items-end overflow-hidden rounded-tile" style={{ background: "rgba(43,36,64,.45)" }}>
                <div className="box-border flex h-[150px] w-full flex-col gap-2 rounded-t-[20px] bg-cream-50 px-3.5 py-2.5">
                  <span className="mx-auto block h-1 w-9 rounded-full bg-[rgba(43,36,64,.2)]" /><span className="disp text-lg font-semibold">Stella</span><span className="block h-2 w-[80%] rounded-full bg-line" />
                </div>
              </div>
            </State>
          </div>
        </Panel>
      </div>
    </div>
  );
}
