import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = {
  id: string;
  googleId: string;
  name: string;
  email: string;
};

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "noteslite-development-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers:
    googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : [],
  callbacks: {
    async jwt({ token, profile }) {
      const googleProfile = profile as
        | { sub?: string; email?: string; name?: string; picture?: string }
        | undefined;

      if (googleProfile?.sub) {
        token.sub = googleProfile.sub;
        token.googleId = googleProfile.sub;
      }

      if (googleProfile?.email) {
        token.email = googleProfile.email;
      }

      if (googleProfile?.name) {
        token.name = googleProfile.name;
      }

      if (googleProfile?.picture) {
        token.picture = googleProfile.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.googleId = token.googleId ?? token.sub ?? "";
        session.user.emailVerified = true;

        if (token.email) {
          session.user.email = token.email;
        }

        if (token.name) {
          session.user.name = token.name;
        }

        if (token.picture) {
          session.user.image = token.picture;
        }
      }

      return session;
    },
  },
};

/**
 * Get the current authenticated user from Google sign-in and resolve their DB record.
 * Creates the user row on first sign-in (just-in-time provisioning).
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.googleId || !session.user.email) {
    return null;
  }

  const googleId = session.user.googleId;
  const email = session.user.email;
  const name = session.user.name?.trim() || email.split("@")[0] || "User";

  try {
    return await prisma.user.upsert({
      where: { googleId },
      update: {
        email,
        name,
      },
      create: {
        googleId,
        email,
        name,
      },
      select: { id: true, googleId: true, name: true, email: true },
    });
  } catch (error) {
    console.error("Failed to fetch user from database", error);
    return null;
  }
}
