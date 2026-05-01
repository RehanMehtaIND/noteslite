import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";
import crypto from "crypto";

import { prisma } from "@/backend/lib/prisma";
import { verifyPassword } from "@/backend/lib/password";

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
    async jwt({ token, profile, user, account }) {
      // Resolve the database user ID on sign-in.
      // For credentials: user.id is already the DB UUID.
      // For Google OAuth: user.id is the Google sub (not a UUID), so we must
      // upsert the DB user first to get the correct UUID.
      let dbUserId: string | null = null;

      const googleProfile = profile as
        | { sub?: string; email?: string; name?: string; picture?: string }
        | undefined;

      if (account?.provider === "google" && googleProfile?.sub && googleProfile?.email) {
        // Google sign-in: resolve or create the DB user by googleId
        try {
          const displayName = googleProfile.name || googleProfile.email.split("@")[0] || "User";
          const dbUser = await prisma.user.upsert({
            where: { googleId: googleProfile.sub },
            update: {
              email: googleProfile.email,
              name: displayName,
            },
            create: {
              googleId: googleProfile.sub,
              email: googleProfile.email,
              name: displayName,
            },
            select: { id: true },
          });

          dbUserId = dbUser.id;
          token.sub = dbUser.id;          // DB UUID, not Google sub
          token.googleId = googleProfile.sub;
          token.email = googleProfile.email;
          token.name = googleProfile.name;
          token.picture = googleProfile.picture;
        } catch (error) {
          console.error("Failed to upsert Google user:", error);
        }
      } else if (user?.id) {
        // Credentials sign-in: user.id is the DB UUID
        dbUserId = user.id;
        token.sub = user.id;

        if (user.email) {
          token.email = user.email;
        }

        if (user.name) {
          token.name = user.name;
        }

        const userWithGoogleId = user as { googleId?: unknown } | undefined;
        if (typeof userWithGoogleId?.googleId === "string") {
          token.googleId = userWithGoogleId.googleId;
        }
      }

      // Create or update device session for ANY sign-in method
      if (dbUserId) {
        try {
          const reqHeaders = await headers();
          const userAgent = reqHeaders.get("user-agent") || "";
          const ip = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || null;

          const parser = new UAParser(userAgent);
          const device = parser.getDevice();
          const os = parser.getOS();
          const browser = parser.getBrowser();

          const deviceName = device.vendor && device.model
            ? `${device.vendor} ${device.model}`
            : `${os.name || "Unknown"} Device`;

          const browserName = `${browser.name || "Unknown"} ${browser.version || ""}`.trim();
          const osName = `${os.name || "Unknown"} ${os.version || ""}`.trim();

          const existingSession = await prisma.session.findFirst({
            where: {
              userId: dbUserId,
              deviceName,
              browser: browserName,
              os: osName,
            }
          });

          const sessionToken = crypto.randomUUID();

          if (existingSession) {
            await prisma.session.update({
              where: { id: existingSession.id },
              data: {
                sessionToken,
                lastActiveAt: new Date(),
                ipAddress: ip,
                isActive: true,
              }
            });
          } else {
            await prisma.session.create({
              data: {
                userId: dbUserId,
                deviceName,
                browser: browserName,
                os: osName,
                ipAddress: ip,
                sessionToken,
                isActive: true,
              }
            });
          }

          token.sessionToken = sessionToken;
        } catch (error) {
          console.error("Failed to create tracking session:", error);
        }
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

        if (token.sessionToken) {
          (session as any).sessionToken = token.sessionToken;
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

  // Fast path: if the session already has the DB user ID, we can skip the database lookup.
  // The JWT callback guarantees that token.sub is the DB UUID.
  if (session.user.id && session.user.id !== session.user.googleId) {
    return {
      id: session.user.id,
      googleId: session.user.googleId || null,
      name: session.user.name || session.user.email.split("@")[0] || "User",
      email: session.user.email,
    };
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
