export const TELEPORT_LOADING_UNTIL_KEY = "noteslite-teleport-loading-until";
export const TELEPORT_LOADING_WORKSPACE_NAME_KEY = "noteslite-teleport-loading-workspace-name";
export const TELEPORT_LOADING_VARIANT_KEY = "noteslite-teleport-loading-variant";
export const TELEPORT_LOADING_MS = 2200;

export type TeleportLoadingVariant = "workspace-open";

type StartTeleportLoadingOptions = {
  durationMs?: number;
  workspaceName?: string;
  variant?: TeleportLoadingVariant;
};

export type TeleportLoadingState = {
  until: number;
  workspaceName: string | null;
  variant: TeleportLoadingVariant | null;
};

export function startTeleportLoading(options: StartTeleportLoadingOptions = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const { durationMs = TELEPORT_LOADING_MS, workspaceName, variant = "workspace-open" } = options;

  const until = Date.now() + Math.max(durationMs, 0);
  window.sessionStorage.setItem(TELEPORT_LOADING_UNTIL_KEY, String(until));
  window.sessionStorage.setItem(TELEPORT_LOADING_VARIANT_KEY, variant);

  if (workspaceName?.trim()) {
    window.sessionStorage.setItem(TELEPORT_LOADING_WORKSPACE_NAME_KEY, workspaceName.trim());
  } else {
    window.sessionStorage.removeItem(TELEPORT_LOADING_WORKSPACE_NAME_KEY);
  }
}

export function readTeleportLoadingState(): TeleportLoadingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(TELEPORT_LOADING_UNTIL_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    clearTeleportLoading();
    return null;
  }

  const variantRaw = window.sessionStorage.getItem(TELEPORT_LOADING_VARIANT_KEY);
  const variant = variantRaw === "workspace-open" ? variantRaw : null;
  const workspaceName = window.sessionStorage.getItem(TELEPORT_LOADING_WORKSPACE_NAME_KEY);

  return {
    until: parsed,
    variant,
    workspaceName: workspaceName?.trim() ? workspaceName : null,
  };
}

export function clearTeleportLoading() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(TELEPORT_LOADING_UNTIL_KEY);
  window.sessionStorage.removeItem(TELEPORT_LOADING_VARIANT_KEY);
  window.sessionStorage.removeItem(TELEPORT_LOADING_WORKSPACE_NAME_KEY);
}
