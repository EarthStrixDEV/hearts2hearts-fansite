import type { NeedRole } from "./roles";

export interface AdminNavItem { key: string; label: string; href: string; icon: string; role: NeedRole }

// Sidebar entries from the 7 designed boards (icon paths copied from the design).
export const ADMIN_NAV: AdminNavItem[] = [
  { key: "dash", label: "Dashboard", href: "/admin", role: "editor", icon: "M4 4h6v9H4zM14 4h6v5h-6zM14 13h6v7h-6zM4 17h6v3H4z" },
  { key: "members", label: "Members", href: "/admin/members", role: "editor", icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.7" },
  { key: "music", label: "Releases", href: "/admin/music", role: "editor", icon: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { key: "posts", label: "AI Blog", href: "/admin/posts", role: "editor", icon: "M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" },
  { key: "events", label: "Schedule", href: "/admin/events", role: "editor", icon: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4" },
  { key: "media", label: "Media", href: "/admin/media", role: "editor", icon: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 16l5-5 4 4 3-3 4 4" },
  { key: "settings", label: "Settings", href: "/admin/settings", role: "admin", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" },
];

export function activeNav(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(n.href + "/")));
}
