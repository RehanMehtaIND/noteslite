import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Attempt to count users to verify the DB connection
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "Connected ✅",
      message: "The Next.js backend is successfully talking to your local PostgreSQL!",
      database: "noteslite",
      stats: {
        total_users: userCount,
      },
      env_check: {
        database_url_set: !!process.env.DATABASE_URL,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database Connection Check Failed:", error);

    return NextResponse.json(
      {
        status: "Error ❌",
        message: "The backend could not connect to PostgreSQL.",
        tip: "Ensure your password in .env is correct and PostgreSQL is running.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
