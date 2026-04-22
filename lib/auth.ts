import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export type AuthenticatedUser = {
  id: string;
  googleId: string | null;
  name: string;
  email: string;
};

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsedCredentials = credentialsSchema.safeParse(credentials);

      if (!parsedCredentials.success) {
        return null;
      }

      const { email, password } = parsedCredentials.data;
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser?.passwordHash) {
        return null;
      }

      if (!verifyPassword(password, existingUser.passwordHash)) {
        return null;
      }

      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        googleId: existingUser.googleId,
      };
    },
  }),
];

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "noteslite-development-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers,
  callbacks: {
    async jwt({ token, profile, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (user?.email) {
        token.email = user.email;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if ("googleId" in (user ?? {}) && typeof user?.googleId === "string") {
        token.googleId = user.googleId;
      }

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
        session.user.googleId = token.googleId;
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

  if (!session?.user?.email) {
    return null;
  }

  if (session.user.id) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, googleId: true, name: true, email: true },
      });

      if (existingUser) {
        return existingUser;
      }
    } catch (error) {
      console.error("Failed to fetch user by id", error);
      // Continue with email/googleId fallback before treating as unauthenticated.
    }
  }

  const googleId = session.user.googleId;
  const email = session.user.email;
  const name = session.user.name?.trim() || email.split("@")[0] || "User";

  if (!googleId) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, googleId: true, name: true, email: true },
      });

      if (existingUser) {
        return existingUser;
      }

      // Some OAuth sessions can lack provider ids in token callbacks.
      // Create a lightweight user row keyed by email so workspace APIs stay authorized.
      return await prisma.user.create({
        data: {
          email,
          name,
        },
        select: { id: true, googleId: true, name: true, email: true },
      });
    } catch (error) {
      console.error("Failed to fetch credentials user", error);
      return null;
    }
  }

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
