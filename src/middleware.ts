import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
];

/**
 * Optimistic edge gate only: a session cookie's presence is cheap to check, but
 * authenticity and authorization are always verified in the Node runtime
 * (`requireUser`, `requireSuperAdmin`, tenant membership + RBAC guards).
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) =>
      SESSION_COOKIE_PREFIXES.some(
        (prefix) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`),
      ),
    );
}

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const hasLocale = routing.locales.includes(segments[0] as (typeof routing.locales)[number]);
  const locale = hasLocale ? segments[0] : routing.defaultLocale;
  const area = hasLocale ? segments[1] : segments[0];
  const isProtected = area === "app" || area === "platform";

  if (isProtected && !hasSessionCookie(request)) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
