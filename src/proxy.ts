import { NextResponse, type NextRequest } from "next/server";

type Handler = (req: NextRequest) => Promise<Response> | Response;
let guard: Handler | undefined;

/**
 * Next 16 proxy (was middleware.ts). Guards /admin/*: Neon Auth refreshes the session and sends signed-out
 * visitors to /auth/sign-in. Roles are NOT checked here; every admin page, server action and route handler
 * calls requireRole itself (no RLS-as-authorization). Without Neon Auth env the admin stays reachable but read-only.
 */
export default async function proxy(req: NextRequest) {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) return NextResponse.next();
  if (!guard) {
    const { auth } = await import("@/lib/auth/server"); // throws on missing env at import time, hence lazy
    guard = auth.middleware({ loginUrl: "/auth/sign-in", publicRoutes: ["/admin/denied"] }) as Handler;
  }
  return guard(req);
}

export const config = { matcher: ["/admin/:path*"] };
