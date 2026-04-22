"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardPolished from "@/components/dashboard-polished";

export default function DashboardPageShell() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user?.email) {
      router.replace("/auth/sign-in");
    }
  }, [router, session, status]);

  if (status === "loading" || !session?.user?.email) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#e8e2d9_0%,#dfd5c8_100%)] px-6 py-10 text-[#5c5752]">
        Loading workspace...
      </div>
    );
  }

  return <DashboardPolished />;
}
