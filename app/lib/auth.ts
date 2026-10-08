import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "./db";
import { clientIp, rateLimit } from "./rate-limit";
import { LIMITS, MAX } from "./limits";

/** A year, so an invite link never drops someone back on a login form. */
const SESSION_MAX_AGE = 365 * 24 * 60 * 60;

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        if (email.length > MAX.email) return null;

        // Both buckets are charged on every attempt, pass or fail. Only counting
        // failures would let an attacker probe for which accounts exist for free.
        const byIp = await rateLimit("login:ip", clientIp(req.headers), LIMITS.loginPerIp);
        if (!byIp.ok) return null;
        const byAccount = await rateLimit("login:account", email, LIMITS.loginPerAccount);
        if (!byAccount.ok) return null;

        const res = await pool.query(
          "SELECT id, email, password_hash, token_version FROM users WHERE email = $1",
          [email]
        );
        const user = res.rows[0];
        if (!user?.password_hash) {
          // Spend the same time as a real comparison so a missing account is not
          // measurably faster than a wrong password.
          await bcrypt.compare(credentials.password, "$2a$10$" + "x".repeat(53));
          return null;
        }
        const ok = await bcrypt.compare(credentials.password, user.password_hash);
        if (!ok) return null;
        return { id: user.id, email: user.email, tokenVersion: user.token_version };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.ver = (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      // The cookie is good for a year, so a password change has to be able to
      // revoke the tokens that were minted before it. One primary-key lookup to
      // find out whether this token is still the current one.
      const row = await pool.query(
        "SELECT token_version FROM users WHERE id = $1",
        [token.uid as string]
      );
      if (!row.rows[0] || row.rows[0].token_version !== (token.ver ?? 0)) {
        return { ...session, user: undefined } as typeof session;
      }
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
};
