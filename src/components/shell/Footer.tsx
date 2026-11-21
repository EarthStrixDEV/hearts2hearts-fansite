import Link from "next/link";
import { NAV } from "@/lib/nav";
import { HeartIcon } from "@/components/ui/HeartIcon";
import type { SiteSettings } from "@/lib/db/settings";

const H = "mb-1.5 text-xs font-semibold uppercase tracking-[.1em] text-ink-500";

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-6 pb-8 pt-12 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-2.5">
            <HeartIcon size={28} />
            <span className="disp text-xl font-semibold">{settings.site_name}</span>
          </span>
          <span className="max-w-[32ch] text-sm leading-relaxed text-ink-500">{settings.tagline}</span>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-0.5">
          <span className={H}>Quick links</span>
          <div className="grid grid-cols-2 gap-x-4">
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} className="flink fx">
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex flex-col gap-0.5">
          <span className={H}>Official socials</span>
          {settings.social_links.map((s) => (
            <a key={s.href} href={s.href} className="flink fx" rel="noopener noreferrer" target="_blank">
              {s.label}
            </a>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-line px-6 py-[18px] text-center text-[13px] text-ink-500">
        <span>Unofficial fan site · all images and music rights belong to SM Entertainment</span>
        <span className="inline-flex items-center gap-1.5">
          Made with <HeartIcon size={13} label="love" /> by fans
        </span>
      </div>
    </footer>
  );
}
