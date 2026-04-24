"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardPolished from "@/components/dashboard-polished";
import LoadingScreen from "@/components/loading-screen";
import { useLoadingScreen } from "@/hooks/use-loading-screen";

export default function DashboardPageShell() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const shouldBlockContent = status === "loading" || !session?.user?.email;
  const { isVisible, isExiting, workspaceName, variant } = useLoadingScreen(shouldBlockContent);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user?.email) {
      router.replace("/auth/sign-in");
    }
  }, [router, session, status]);

  if (isVisible) {
    return <LoadingScreen exiting={isExiting} workspaceName={workspaceName} variant={variant} />;
  }

  return <DashboardPolished />;
}
