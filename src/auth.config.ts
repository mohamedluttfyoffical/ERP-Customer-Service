import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration shared by the Node runtime and middleware.
 * Database-backed credentials and the Prisma adapter live in `auth.ts`.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
    updateAge: 30 * 60,
  },
  pages: {
    signIn: "/ar/login",
    error: "/ar/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) {
          return url;
        }
      } catch {
        // Fall through to the safe base URL.
      }
      return baseUrl;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
