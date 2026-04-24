"use client";

import { useEffect, useState } from "react";
import {
  clearTeleportLoading,
  readTeleportLoadingState,
  type TeleportLoadingVariant,
} from "@/lib/loading-screen";

const EXIT_MS = 420;
const DEFAULT_NON_TELEPORT_VISIBLE_MS = 2400;

function getTeleportStateForCurrentNavigation() {
  if (typeof window === "undefined") {
    return null;
  }

  const navEntries = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const navType = navEntries[0]?.type;

  // A hard refresh should never replay teleport transition state from sessionStorage.
  if (navType === "reload") {
    clearTeleportLoading();
    return null;
  }

  return readTeleportLoadingState();
}

export function useLoadingScreen(isActive: boolean) {
  const initialTeleportState = getTeleportStateForCurrentNavigation();
  const hasInitialTeleport = Boolean(initialTeleportState && initialTeleportState.until > Date.now());
  const [isVisible, setIsVisible] = useState(isActive || hasInitialTeleport);
  const [isExiting, setIsExiting] = useState(false);
  const [visibleSince, setVisibleSince] = useState<number | null>(isActive || hasInitialTeleport ? Date.now() : null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(hasInitialTeleport ? (initialTeleportState?.workspaceName ?? null) : null);
  const [variant, setVariant] = useState<TeleportLoadingVariant | null>(hasInitialTeleport ? (initialTeleportState?.variant ?? null) : null);

  useEffect(() => {
    const teleportState = getTeleportStateForCurrentNavigation();
    const teleportIsActive = Boolean(teleportState && teleportState.until > Date.now());

    if (isActive) {
      setIsVisible(true);
      setIsExiting(false);
      setVisibleSince((current) => current ?? Date.now());

      if (teleportIsActive) {
        setWorkspaceName(teleportState?.workspaceName ?? null);
        setVariant(teleportState?.variant ?? null);
      }

      return;
    }

    if (!isVisible) {
      if (teleportIsActive) {
        setIsVisible(true);
        setIsExiting(false);
        setVisibleSince(Date.now());
        setWorkspaceName(teleportState?.workspaceName ?? null);
        setVariant(teleportState?.variant ?? null);
      }
      return;
    }

    const minVisibleMs = teleportIsActive ? 0 : DEFAULT_NON_TELEPORT_VISIBLE_MS;
    const minVisibleUntil = (visibleSince ?? Date.now()) + minVisibleMs;
    const teleportUntil = teleportState?.until ?? 0;
    const waitUntil = Math.max(minVisibleUntil, teleportUntil);
    const waitMs = Math.max(waitUntil - Date.now(), 0);
    let finishExitTimeoutId: number | undefined;

    const startExitTimeoutId = window.setTimeout(() => {
      setIsExiting(true);

      finishExitTimeoutId = window.setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        setVisibleSince(null);
        setWorkspaceName(null);
        setVariant(null);
        clearTeleportLoading();
      }, EXIT_MS);
    }, waitMs);

    return () => {
      window.clearTimeout(startExitTimeoutId);
      if (typeof finishExitTimeoutId === "number") {
        window.clearTimeout(finishExitTimeoutId);
      }
    };
  }, [isActive, isVisible, visibleSince]);

  return {
    isVisible,
    isExiting,
    workspaceName,
    variant,
  };
}
