import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NavLinks } from "@/components/admin/NavLinks";
import { ToastHost } from "@/components/admin/ToastHost";
import { ReadOnlyBanner } from "@/components/admin/ui";
import { getAdminContext } from "@/lib/admin/auth";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { draftPostCount } from "@/lib/admin/queries/dashboard";
import { hasRole } from "@/lib/admin/roles";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();
  if (ctx.configured && !hasRole(ctx.role, "editor")) redirect("/admin/denied"); // middleware already does this; defence in depth
  const drafts = await draftPostCount();
  const items = ADMIN_NAV.filter((n) => hasRole(ctx.role, n.role)).map((n) => ({ key: n.key, label: n.label, href: n.href, icon: n.icon, count: n.key === "posts" ? drafts : undefined }));

  return (
    <div className="a-shell">
      <aside className="a-side" aria-label="Admin">
        <div className="a-brand">
          <span className="a-brand-mark" aria-hidden="true">FH</span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: 15 }}>Fan Hub</strong>
            <span className="a-sub" style={{ fontSize: 12 }}>Admin · CMS</span>
          </span>
        </div>
        <div className="a-site-pill">Hearts2Hearts site</div>
        <NavLinks items={items} />
        <div className="a-side-foot">
          <Link href="/" className="a-sl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
            View live site
          </Link>
        </div>
      </aside>
      <div className="a-col">
        <AdminHeader name={ctx.name} role={ctx.role ?? "none"} />
        <main className="a-main">
          {!ctx.configured && <ReadOnlyBanner />}
          {children}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
