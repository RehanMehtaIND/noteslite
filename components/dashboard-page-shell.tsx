"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import DashboardClient from "@/components/dashboard-client";

function resolveUserName(user: ReturnType<typeof useUser>["user"]) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (user?.username) {
    return user.username;
  }

  const email = user?.primaryEmailAddress?.emailAddress;

  if (email) {
    return email.split("@")[0] || "User";
  }

  return "User";
}

export default function DashboardPageShell() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.replace("/auth");
    }
  }, [isLoaded, router, userId]);

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] px-6 py-10 text-[#64666b]">
        Loading dashboard...
      </div>
    );
  }

  return <DashboardClient userName={resolveUserName(user)} />;
}
