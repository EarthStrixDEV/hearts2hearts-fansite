import { NextResponse, type NextRequest } from "next/server";

type Handler = (req: NextRequest) => Promise<Response> | Response;
let guard: Handler | undefined;

/**
 * Next 16 proxy (was middleware.ts). Guards /admin/*: Neon Auth refreshes the session and sends signed-out
 * visitors to /auth/sign-in. Roles are NOT checked here; every admin page, server action and route handler
 * calls requireRole itself (no RLS-as-authorization). Without Neon Auth env the admin is a read-only preview in
 * development only; in production it fails closed (503) so a missing env var can never expose the admin.
 */
export default async function proxy(req: NextRequest) {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Admin is unavailable: authentication is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.next();
  }
  if (!guard) {
    const { auth } = await import("@/lib/auth/server"); // throws on missing env at import time, hence lazy
    guard = auth.middleware({ loginUrl: "/auth/sign-in", publicRoutes: ["/admin/denied"] }) as Handler;
  }
  return guard(req);
}

export const config = { matcher: ["/admin/:path*"] };
