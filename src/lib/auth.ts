import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is not set");

/**
 * Sign-in with Google or Apple, each on only when its credentials are set.
 * Apple's secret is a JWT signed with the .p8 key, valid at most six months:
 * see docs/SVILUPPO.md for how to make it and when to renew it.
 */
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account" as const }
    : null;
const apple =
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET }
    : null;

export type SocialProvider = "google" | "apple";

/** The providers the sign-in page offers, in the order it shows them. */
export function socialProviders(): SocialProvider[] {
  return [...(google ? (["google"] as const) : []), ...(apple ? (["apple"] as const) : [])];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Extra origins allowed to sign in, e.g. the https address of the Mac on the
  // home network while testing from a phone. Comma separated.
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
    // Apple posts the sign-in result back from its own origin.
    ...(apple ? ["https://appleid.apple.com"] : []),
  ],
  emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 10 },
  socialProviders: { ...(google ? { google } : {}), ...(apple ? { apple } : {}) },
  session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
  // On by default in production (3 sign-ins per 10 s per address). The e2e
  // suite signs up a new account per test and turns it off with this variable.
  ...(process.env.AUTH_RATE_LIMIT === "off" ? { rateLimit: { enabled: false } } : {}),
  // nextCookies must stay last: it writes the cookies the other plugins set.
  plugins: [nextCookies()],
});

/** The signed-in user, or null. */
export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** The app is for signed-in players only: everyone else goes to the sign-in page. */
export async function requireUser() {
  const me = await currentUser();
  if (!me) redirect("/account");
  return me;
}
