// Pure role/route rules. Imported by middleware (edge runtime) and by server code: no Node or React imports here.
export type NeedRole = "editor" | "admin";

/** Sections only `admin` may open (spec §4). Everything else under /admin is editor+. */
export const ADMIN_ONLY_PREFIXES = ["/admin/settings", "/admin/users", "/admin/activity"] as const;

export function requiredRole(pathname: string): NeedRole {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ? "admin" : "editor";
}

export function hasRole(role: string | null | undefined, need: NeedRole): boolean {
  return need === "admin" ? role === "admin" : role === "admin" || role === "editor";
}
