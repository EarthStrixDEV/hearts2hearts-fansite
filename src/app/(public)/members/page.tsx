import type { Metadata } from "next";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { MembersBrowser } from "@/components/members/MembersBrowser";
import { toCardData } from "@/components/members/profile";
import { getMembers } from "@/lib/db/members";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const members = (await getMembers()).map(toCardData);
  return (
    <>
      <section className="relative overflow-hidden px-6 pb-10 pt-16">
        <div aria-hidden="true" className="absolute inset-0">
          <span className="floaty absolute" style={{ left: "8%", top: "30%" }}><HeartIcon size={34} fill="#FFB6D5" /></span>
          <span className="floaty absolute" style={{ right: "12%", top: "22%", animationDelay: "-2s" }}><HeartIcon size={22} fill="#C9B6FF" /></span>
          <span className="floaty absolute" style={{ right: "30%", bottom: "10%", animationDelay: "-4s" }}><HeartIcon size={26} fill="#A8D8FF" /></span>
          <div className="absolute rounded-full" style={{ width: 520, height: 520, right: -140, top: -260, background: "radial-gradient(circle, rgba(201,182,255,.55), rgba(201,182,255,0) 70%)" }} />
        </div>
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-2.5">
          <h1 className="disp holo-text m-0 font-bold leading-[1.05] tracking-[-0.02em]" style={{ fontSize: "clamp(44px, 6vw, 72px)" }}>Meet Hearts2Hearts</h1>
          <p className="m-0 max-w-[56ch] text-[17px] leading-relaxed text-ink-500">
            {members.length === 8 ? "Eight members, eight stories." : `${members.length} members, ${members.length} stories.`} Hover for a fun fact, open a card for the full profile.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-2">
        <MembersBrowser members={members} />
        <p className="mt-7 text-[13px] text-ink-500">Card colors are fan-picked for this site, not official.</p>
      </div>
    </>
  );
}
