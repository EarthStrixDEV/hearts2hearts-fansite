import { Button } from "@/components/ui/Button";
import { CITY } from "./city";
import styles from "./home.module.css";

/** Home teaser for /city: decorative isometric SVG with the call-to-action card on top. */
export function CityTeaser() {
  return (
    <div className="relative overflow-hidden rounded-card shadow-pink" style={{ background: "linear-gradient(180deg,#DDF0FF,#FFF1F7 75%)" }}>
      <div className="relative w-full" style={{ aspectRatio: "1000 / 560" }}>
        <svg viewBox="0 20 1000 560" width="100%" height="100%" aria-hidden="true" className="absolute inset-0 block">
          <g className={styles.cloud} style={{ animationDelay: "-6s" }}><ellipse cx="80" cy="90" rx="60" ry="20" fill="#fff" /><ellipse cx="110" cy="76" rx="36" ry="22" fill="#fff" /></g>
          <g className={styles.cloud} style={{ animationDelay: "-22s" }}><ellipse cx="60" cy="150" rx="46" ry="15" fill="#fff" /></g>
          <path d={CITY.slabL} fill="#BFE3CC" /><path d={CITY.slabR} fill="#D3EEDC" /><path d={CITY.ground} fill="#E3F5E9" />
          <path d={CITY.road1} fill="rgba(255,255,255,.9)" /><path d={CITY.road2} fill="rgba(255,255,255,.9)" />
          {CITY.blocks.map((b) => (
            <g key={b.left}>
              <path d={b.left} fill={b.cl} /><path d={b.right} fill={b.cr} /><path d={b.top} fill={b.ct} /><path d={b.door} fill="#fff" />
            </g>
          ))}
        </svg>
      </div>
      <div className="glass relative mx-4 mb-4 flex max-w-[460px] flex-col gap-3 rounded-[20px] px-6 py-[22px] sm:absolute sm:inset-x-6 sm:bottom-6 sm:m-0" style={{ background: "rgba(255,255,255,.82)", color: "#2B2440" }}>
        <span className="disp text-[30px] font-semibold leading-[1.1]">Heart Town, a 3D mini city</span>
        <span className="text-[15px] leading-relaxed" style={{ color: "#5F5878" }}>Every building is a door: the music store, the concert hall, the school, the café and the member houses.</span>
        <Button href="/city" className="self-start">Enter the City</Button>
      </div>
    </div>
  );
}
