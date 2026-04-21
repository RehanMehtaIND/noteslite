"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardClient from "@/components/dashboard-client";

function resolveUserName(user: { name?: string | null; email?: string | null } | undefined) {
  const fullName = user?.name?.trim() ?? "";

  if (fullName) {
    return fullName;
  }

  const email = user?.email;

  if (email) {
    return email.split("@")[0] || "User";
  }

  return "User";
}

export default function DashboardPageShell() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session) {
      router.replace("/auth/sign-in");
    }
  }, [router, session, status]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] px-6 py-10 text-[#64666b]">
        Loading dashboard...
      </div>
    );
  }

  return <DashboardClient userName={resolveUserName(session.user)} />;
}
