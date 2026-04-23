"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ProfileModal, {
  type PasswordForm,
  type ProfileSettings,
} from "@/components/profile-modal";

type WorkspaceItem = {
  id: string;
  name: string;
  theme: string;
  createdAt: string;
  _count?: { cards: number; columns: number };
};

type WorkspaceUpdate = Partial<Pick<WorkspaceItem, "name" | "theme">>;
type ThemeEditorMode = "preset" | "color" | "gradient" | "image";

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 980;
const VIEWPORT_PADDING = 16;

function getDashboardScale() {
  if (typeof window === "undefined") {
    return 1;
  }

  const widthRatio = Math.max(window.innerWidth - VIEWPORT_PADDING, 1) / BASE_WIDTH;
  const heightRatio = Math.max(window.innerHeight - VIEWPORT_PADDING, 1) / BASE_HEIGHT;

  return Math.min(widthRatio, heightRatio, 1);
}

function getHeadingSizeClass(title: string) {
  if (title.length >= 13) return "text-[30px] tracking-[0.35px]";
  if (title.length >= 10) return "text-[34px] tracking-[0.4px]";
  if (title.length >= 8) return "text-[40px] tracking-[0.5px]";
  return "text-[48px] tracking-[0.6px]";
}

const THEME_COLORS: Record<string, string> = {
  default: "#cfd2d9",
  ocean: "#a8c4d4",
  forest: "#a8c9a8",
  sunset: "#d4a8a8",
  lavender: "#c4a8d4",
  sand: "#d4caa8",
};

const DEFAULT_GRADIENT = "linear-gradient(135deg, #a8c4d4 0%, #c4a8d4 100%)";
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const GRADIENT_PATTERN = /^(linear-gradient|radial-gradient|conic-gradient)\(.+\)$/i;
const PROFILE_MODAL_DURATION = 240;
const DEFAULT_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const GRADIENT_PRESETS = [
  { label: "Dusk",   a: "#a8c4d4", b: "#c4a8d4", angle: 135 },
  { label: "Mint",   a: "#a8d4bb", b: "#a8c4d4", angle: 135 },
  { label: "Coral",  a: "#d4a8a8", b: "#d4c4a8", angle: 120 },
  { label: "Sunset", a: "#d4b8a8", b: "#d4a8bb", angle: 45  },
  { label: "Storm",  a: "#8fa3be", b: "#6b7994", angle: 160 },
  { label: "Bloom",  a: "#d4a8bb", b: "#c9a8d4", angle: 110 },
] as const;

function buildGradient(angle: number, a: string, b: string) {
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 100%)`;
}

function parseLinearGradient(css: string): { angle: number; a: string; b: string } | null {
  const match = /linear-gradient\(\s*(\d+)deg,\s*(#[0-9a-fA-F]{3,6})\s+0%,\s*(#[0-9a-fA-F]{3,6})\s+100%\)/i.exec(css);
  if (!match) return null;
  return { angle: parseInt(match[1], 10), a: match[2], b: match[3] };
}

function parseTheme(theme: string): { mode: ThemeEditorMode; value: string } {
  if (theme in THEME_COLORS) {
    return { mode: "preset", value: theme };
  }

  if (theme.startsWith("color:")) {
    return { mode: "color", value: theme.slice("color:".length) };
  }

  if (theme.startsWith("gradient:")) {
    return { mode: "gradient", value: theme.slice("gradient:".length) };
  }

  if (theme.startsWith("image:")) {
    return { mode: "image", value: theme.slice("image:".length) };
  }

  if (GRADIENT_PATTERN.test(theme)) {
    return { mode: "gradient", value: theme };
  }

  if (/^https?:\/\//i.test(theme)) {
    return { mode: "image", value: theme };
  }

  return { mode: "color", value: theme };
}

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getProfileInitials(userName: string) {
  const parts = userName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return userName.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "NL";
}

function createDefaultProfileSettings({
  email,
  avatarUrl,
  emailVerified,
}: {
  email: string;
  avatarUrl: string;
  emailVerified: boolean;
}): ProfileSettings {
  return {
    avatarMode: avatarUrl ? "url" : "placeholder",
    avatarUrl,
    displayName: "",
    email,
    emailVerified,
    showEmail: true,
    timezone: getLocalTimezone(),
    emailNotifications: true,
    twoFactorEnabled: false,
    twoFactorMethod: "authenticator",
  };
}

function mergeStoredProfileSettings(
  defaults: ProfileSettings,
  stored: unknown,
): ProfileSettings {
  if (!stored || typeof stored !== "object") {
    return defaults;
  }

  const candidate = stored as Partial<ProfileSettings>;

  return {
    avatarMode:
      candidate.avatarMode === "placeholder" || candidate.avatarMode === "url" || candidate.avatarMode === "initials"
        ? candidate.avatarMode
        : defaults.avatarMode,
    avatarUrl: typeof candidate.avatarUrl === "string" ? candidate.avatarUrl : defaults.avatarUrl,
    displayName: typeof candidate.displayName === "string" ? candidate.displayName : defaults.displayName,
    email: typeof candidate.email === "string" ? candidate.email : defaults.email,
    emailVerified:
      typeof candidate.emailVerified === "boolean"
        ? candidate.emailVerified
        : defaults.emailVerified,
    showEmail:
      typeof candidate.showEmail === "boolean" ? candidate.showEmail : defaults.showEmail,
    timezone: typeof candidate.timezone === "string" && candidate.timezone
      ? candidate.timezone
      : defaults.timezone,
    emailNotifications:
      typeof candidate.emailNotifications === "boolean"
        ? candidate.emailNotifications
        : defaults.emailNotifications,
    twoFactorEnabled:
      typeof candidate.twoFactorEnabled === "boolean"
        ? candidate.twoFactorEnabled
        : defaults.twoFactorEnabled,
    twoFactorMethod:
      candidate.twoFactorMethod === "sms" || candidate.twoFactorMethod === "authenticator"
        ? candidate.twoFactorMethod
        : defaults.twoFactorMethod,
  };
}

function getThemeBackground(theme: string): CSSProperties {
  const parsed = parseTheme(theme);

  if (parsed.mode === "preset") {
    return { backgroundColor: THEME_COLORS[parsed.value] ?? THEME_COLORS.default };
  }

  if (parsed.mode === "color") {
    return { backgroundColor: HEX_COLOR_PATTERN.test(parsed.value) ? parsed.value : THEME_COLORS.default };
  }

  if (parsed.mode === "gradient") {
    return {
      backgroundColor: THEME_COLORS.default,
      backgroundImage: GRADIENT_PATTERN.test(parsed.value) ? parsed.value : DEFAULT_GRADIENT,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (parsed.mode === "image" && isValidImageUrl(parsed.value)) {
    return {
      backgroundColor: THEME_COLORS.default,
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.14) 100%), url("${parsed.value}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return { backgroundColor: THEME_COLORS.default };
}

export default function DashboardClient({
  userName,
}: {
  userName: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [scale, setScale] = useState(getDashboardScale);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [themeEditorMode, setThemeEditorMode] = useState<ThemeEditorMode>("preset");
  const [customColor, setCustomColor] = useState(THEME_COLORS.default);
  const [gradientStopA, setGradientStopA] = useState("#a8c4d4");
  const [gradientStopB, setGradientStopB] = useState("#c4a8d4");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [imageUrl, setImageUrl] = useState("");
  const [isProfileMounted, setIsProfileMounted] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileSettings>(() =>
    createDefaultProfileSettings({ email: "", avatarUrl: "", emailVerified: false }),
  );
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(DEFAULT_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profileCloseTimerRef = useRef<number | null>(null);
  const hasHydratedProfileRef = useRef(false);
  const profileInitials = useMemo(() => getProfileInitials(userName), [userName]);
  const user = session?.user;
  const userEmail = user?.email ?? "";
  const userAvatarUrl = user?.image ?? "";
  const isPrimaryEmailVerified = Boolean(user?.emailVerified);
  const defaultProfile = useMemo(
    () =>
      createDefaultProfileSettings({
        email: userEmail,
        avatarUrl: userAvatarUrl,
        emailVerified: isPrimaryEmailVerified,
      }),
    [isPrimaryEmailVerified, userAvatarUrl, userEmail],
  );
  const profileAvatarStyle =
    profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl)
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.16) 100%), url("${profile.avatarUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  const editingWorkspace = useMemo(
    () => workspaces.find((w) => w.id === editingId) ?? null,
    [workspaces, editingId],
  );

  const openProfileModal = useCallback(() => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (profileCloseTimerRef.current !== null) {
      window.clearTimeout(profileCloseTimerRef.current);
      profileCloseTimerRef.current = null;
    }

    setIsProfileMounted(true);
    window.requestAnimationFrame(() => setIsProfileVisible(true));
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileVisible(false);
    setPasswordForm(DEFAULT_PASSWORD_FORM);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (profileCloseTimerRef.current !== null) {
      window.clearTimeout(profileCloseTimerRef.current);
    }

    profileCloseTimerRef.current = window.setTimeout(() => {
      setIsProfileMounted(false);
      profileTriggerRef.current?.focus();
      profileCloseTimerRef.current = null;
    }, PROFILE_MODAL_DURATION);
  }, []);

  const updateProfile = useCallback((updates: Partial<ProfileSettings>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const updatePasswordField = useCallback(
    (field: keyof PasswordForm, value: string) => {
      setPasswordForm((prev) => ({ ...prev, [field]: value }));
      setPasswordError(null);
      setPasswordSuccess(null);
    },
    [],
  );

  const savePasswordChange = useCallback(() => {
    const current = passwordForm.currentPassword.trim();
    const next = passwordForm.newPassword.trim();
    const confirm = passwordForm.confirmPassword.trim();

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!current) {
      setPasswordError("Enter your current password.");
      return;
    }

    if (next.length < 8) {
      setPasswordError("Use at least 8 characters for the new password.");
      return;
    }

    if (next !== confirm) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    setPasswordForm(DEFAULT_PASSWORD_FORM);
    setPasswordSuccess("Password updated locally for this dashboard preview.");
  }, [passwordForm]);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/workspaces", { cache: "no-store" });

      if (response.status === 401) {
        router.push("/auth");
        router.refresh();
        return;
      }

      if (!response.ok) {
        setError("Failed to load workspaces.");
        return;
      }

      const payload = (await response.json()) as { workspaces: WorkspaceItem[] };
      setWorkspaces(payload.workspaces);
    } catch {
      setError("Could not load your workspaces.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const persistWorkspace = useCallback(
    async (id: string, updates: WorkspaceUpdate) => {
      setIsSaving(true);

      try {
        const response = await fetch(`/api/workspaces/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(payload?.error ?? "Failed to save changes.");
          await loadWorkspaces();
          return;
        }

        const payload = (await response.json()) as { workspace: WorkspaceItem };
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...payload.workspace } : w)),
        );
      } catch {
        setError("Failed to save changes.");
      } finally {
        setIsSaving(false);
      }
    },
    [loadWorkspaces],
  );

  const updateLocally = useCallback((id: string, updates: WorkspaceUpdate) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    );
  }, []);

  useEffect(() => {
    const handleResize = () => setScale(getDashboardScale());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (profileCloseTimerRef.current !== null) {
        window.clearTimeout(profileCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!hasHydratedProfileRef.current) {
      hasHydratedProfileRef.current = true;
      fetch("/api/profile")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load profile");
          return res.json();
        })
        .then((data) => {
          setProfile(mergeStoredProfileSettings(defaultProfile, data));
        })
        .catch(() => {
          setProfile(defaultProfile);
        });
      return;
    }

    setProfile((prev) => {
      let changed = false;
      const next = { ...prev };

      if (defaultProfile.email && prev.email !== defaultProfile.email) {
        next.email = defaultProfile.email;
        changed = true;
      }

      if (!prev.avatarUrl && defaultProfile.avatarUrl) {
        next.avatarUrl = defaultProfile.avatarUrl;
        changed = true;
      }

      if (!prev.emailVerified && defaultProfile.emailVerified) {
        next.emailVerified = true;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [defaultProfile]);

  useEffect(() => {
    if (!hasHydratedProfileRef.current) {
      return;
    }

    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarMode: profile.avatarMode,
        avatarUrl: profile.avatarUrl,
        displayName: profile.displayName,
        showEmail: profile.showEmail,
      }),
    }).catch(console.error);
  }, [profile]);

  useEffect(() => {
    if (!editingWorkspace) {
      return;
    }

    const parsed = parseTheme(editingWorkspace.theme);
    setThemeEditorMode(parsed.mode);

    if (parsed.mode === "preset") {
      setCustomColor(THEME_COLORS.default);
      setGradientStopA("#a8c4d4");
      setGradientStopB("#c4a8d4");
      setGradientAngle(135);
      setImageUrl("");
      return;
    }

    if (parsed.mode === "color") {
      setCustomColor(HEX_COLOR_PATTERN.test(parsed.value) ? parsed.value : THEME_COLORS.default);
      return;
    }

    if (parsed.mode === "gradient") {
      const parts = parseLinearGradient(parsed.value);
      if (parts) {
        setGradientAngle(parts.angle);
        setGradientStopA(parts.a);
        setGradientStopB(parts.b);
      }
      return;
    }

    setImageUrl(parsed.value);
  }, [editingWorkspace]);

  const deleteWorkspace = async () => {
    if (!editingWorkspace) return;
    const id = editingWorkspace.id;

    try {
      const response = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Failed to delete workspace.");
        return;
      }

      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      setEditingId(null);
    } catch {
      setError("Failed to delete workspace.");
    }
  };

  const createWorkspace = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Workspace" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Failed to create workspace.");
        return;
      }

      const payload = (await response.json()) as { workspace: WorkspaceItem };
      setWorkspaces((prev) => [...prev, payload.workspace]);
      setEditingId(payload.workspace.id);
    } catch {
      setError("Failed to create workspace.");
    } finally {
      setIsCreating(false);
    }
  };

  const logout = async () => {
    await signOut({ callbackUrl: "/auth/sign-in" });
  };

  const openWorkspace = useCallback(
    (workspaceId: string) => {
      router.push(`/dashboard/${workspaceId}`);
    },
    [router],
  );

  const applyTheme = async () => {
    if (!editingWorkspace) return;

    let nextTheme = editingWorkspace.theme;

    if (themeEditorMode === "color") {
      if (!HEX_COLOR_PATTERN.test(customColor)) {
        setError("Use a valid hex color like #A8C4D4.");
        return;
      }

      nextTheme = `color:${customColor}`;
    }

    if (themeEditorMode === "gradient") {
      nextTheme = `gradient:${buildGradient(gradientAngle, gradientStopA, gradientStopB)}`;
    }

    if (themeEditorMode === "image") {
      if (!isValidImageUrl(imageUrl.trim())) {
        setError("Use a valid http or https image URL.");
        return;
      }

      nextTheme = `image:${imageUrl.trim()}`;
    }

    setError(null);
    updateLocally(editingWorkspace.id, { theme: nextTheme });
    await persistWorkspace(editingWorkspace.id, { theme: nextTheme });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] text-[#666a72]">
        <p className="text-xl tracking-[0.14em] uppercase [font-family:'Cinzel','Times_New_Roman',serif]">
          Loading Noteslite
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,#ebe6de_0%,#e3cdc0_100%)] text-[#64666b]">
      <style>{`
        @keyframes pageFadeIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(var(--scale)) translateY(10px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(var(--scale)) translateY(0); }
        }
        @keyframes cardRiseIn {
          0% { opacity: 0; transform: translateY(22px) scale(0.97); }
          50% { opacity: 0.5; transform: translateY(10px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes avatarDrift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes menuPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        @keyframes ribbonTone {
          0%, 100% { filter: saturate(1) brightness(1); }
          50% { filter: saturate(1.08) brightness(1.02); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.78; }
        }
        @keyframes panelIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="absolute left-1/2 top-1/2 h-[980px] w-[1600px] origin-center [animation:pageFadeIn_650ms_ease-out_both] motion-reduce:animate-none"
        style={
          {
            transform: `translate(-50%, -50%) scale(${scale})`,
            "--scale": scale,
          } as CSSProperties
        }
      >
        <div className="grid h-full w-full grid-cols-[156px_1fr]">
          <aside className="relative bg-[rgba(255,255,255,0)] [animation:fadeUp_720ms_ease-out_80ms_both] motion-reduce:animate-none">
            <div
              className="absolute left-1/2 top-[60px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]"
              aria-hidden="true"
            >
              <span className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: "0ms" }} />
              <span className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: "180ms" }} />
              <span className="h-[11px] rounded-full bg-[#7f7b7d] [animation:menuPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: "360ms" }} />
            </div>

            <div className="absolute left-1/2 top-[140px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]" aria-hidden="true">
              <span className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none" />
            </div>

            <div className="absolute left-1/2 top-[220px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]" aria-hidden="true">
              <span className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: "220ms" }} />
            </div>

            <div className="absolute left-1/2 top-[300px] z-20 grid w-[96px] -translate-x-1/2 gap-[13px] scale-[0.72]" aria-hidden="true">
              <span className="h-[95px] rounded-full border-x-5 border-y-5 border-t-3 border-[rgba(255,255,255,0.78)] bg-[#7f7b7d] [animation:dotPulse_3.2s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: "440ms" }} />
            </div>

            <div className="absolute left-1/2 top-[20px] z-10 h-[450px] w-[104px] -translate-x-1/2 [animation:ribbonTone_4.8s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden="true">
              <div className="absolute inset-0 border-x-3 border-t-2 border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,#e2dddf_0%,#e8b6c0_100%)] [clip-path:polygon(0_0,100%_0,100%_86%,10%_100%,0_100%)]" />
            </div>
          </aside>

          <div className="flex h-full flex-col pb-[34px] pl-6 pr-[36px] pt-[30px]">
            <header className="flex h-[112px] items-center justify-end gap-7 [animation:fadeUp_720ms_ease-out_130ms_both] motion-reduce:animate-none">
              <div className="flex flex-col items-end gap-2">
                <h1 className="m-0 text-[84px] leading-none font-medium tracking-[2px] text-[#63666d] transition-[transform,letter-spacing] duration-500 hover:-translate-y-0.5 hover:tracking-[3px] [font-family:'Cinzel','Times_New_Roman',serif]">
                  NOTESLITE
                </h1>
                <div className="flex items-center gap-3 text-[13px] uppercase tracking-[0.16em] text-[#696d75]">
                  <span>{userName}</span>
                </div>
              </div>
              <button
                ref={profileTriggerRef}
                type="button"
                onClick={openProfileModal}
                aria-label={`Open profile settings for ${userName}`}
                aria-haspopup="dialog"
                aria-expanded={isProfileMounted && isProfileVisible}
                aria-controls="dashboard-profile-dialog"
                className="group flex flex-col items-center gap-2 rounded-[28px] px-2 py-2 text-[11px] uppercase tracking-[0.18em] text-[#696d75] transition-colors duration-300 hover:text-[#565a62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[rgba(235,230,222,0.96)]"
              >
                <span
                  className={`grid h-[78px] w-[78px] place-items-center rounded-full border border-[rgba(255,255,255,0.78)] bg-[radial-gradient(circle_at_30%_25%,#f2f2f2_0%,#dbdbdb_76%)] text-[22px] font-semibold tracking-[0.08em] text-[#7b7f87] [box-shadow:0_12px_24px_rgba(87,78,69,0.24)] [animation:avatarDrift_4.6s_ease-in-out_infinite] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:[box-shadow:0_16px_30px_rgba(87,78,69,0.28)] motion-reduce:animate-none ${
                    profileAvatarStyle ? "bg-cover bg-center text-transparent" : ""
                  }`}
                  style={profileAvatarStyle}
                  aria-hidden="true"
                >
                  {profileAvatarStyle ? "." : profileInitials}
                </span>
                <span>Profile</span>
              </button>
            </header>

            <section className="mt-[12px] flex-1 rounded-[34px] bg-[rgba(236,236,238,0.96)] px-[74px] pb-[54px] pt-[56px] [box-shadow:0_22px_30px_rgba(90,72,58,0.33)] [animation:fadeUp_760ms_ease-out_180ms_both] motion-reduce:animate-none">
              {error ? (
                <div className="mb-5 rounded-lg border border-[#dca9a9] bg-[#f6d8d8] px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-[#8d4444]">
                  {error}
                </div>
              ) : null}

              <div className="mb-5 flex items-center justify-between">
                <p className="text-[13px] uppercase tracking-[0.12em] text-[#666a72]">
                  {isSaving ? "Saving changes..." : "All changes synced"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-x-[62px] gap-y-[66px]">
                {workspaces.map((ws, index) => (
                  <article
                    key={ws.id}
                    onClick={() => openWorkspace(ws.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openWorkspace(ws.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${ws.name} workspace`}
                    className="group relative h-[262px] cursor-pointer overflow-hidden rounded-[24px] border-2 border-[rgba(255,255,255,0.8)] bg-[#cfd2d9] bg-cover bg-center [box-shadow:0_16px_22px_rgba(47,43,40,0.42)] [animation:cardRiseIn_680ms_cubic-bezier(0.2,1,0.3,1)_both] transform-gpu will-change-transform transition-[transform,box-shadow,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.01] hover:[box-shadow:0_20px_26px_rgba(47,43,40,0.38)] after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.18)_100%)] motion-reduce:animate-none"
                    style={{
                      ...getThemeBackground(ws.theme),
                      animationDelay: `${index * 90 + 80}ms`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(ws.id);
                      }}
                      className="absolute right-[8px] top-[8px] z-[5] grid h-8 w-8 place-items-center rounded-full border border-[rgba(255,255,255,0.62)] bg-[rgba(238,241,246,0.72)] text-[13px] leading-none tracking-[-1px] text-[rgba(88,91,99,0.95)] transition-colors duration-300 hover:bg-[rgba(255,255,255,0.9)]"
                      aria-label={`Edit ${ws.name} workspace`}
                    >
                      ...
                    </button>

                    <div className="absolute inset-[30px] z-[1] overflow-hidden rounded-[28px] border-[3px] border-[rgba(255,255,255,0.62)] bg-[rgba(238,241,246,0.68)] px-[8px] transition-colors duration-500 group-hover:bg-[rgba(244,247,252,0.72)]">
                      <h2
                        className={`mt-[10px] w-full text-center leading-none font-medium whitespace-nowrap uppercase text-[rgba(88,91,99,0.88)] transition-transform duration-500 group-hover:-translate-y-0.5 [font-family:'Cinzel','Times_New_Roman',serif] ${getHeadingSizeClass(ws.name)}`}
                      >
                        {ws.name}
                      </h2>
                      {ws._count ? (
                        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.1em] text-[rgba(88,91,99,0.6)]">
                          {ws._count.cards} cards · {ws._count.columns} columns
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={() => void createWorkspace()}
                  disabled={isCreating}
                  className="group grid h-[262px] place-items-center rounded-[24px] bg-[#ececee] text-[120px] leading-none text-[#6f7279] [box-shadow:0_16px_22px_rgba(47,43,40,0.28)] [animation:cardRiseIn_680ms_cubic-bezier(0.2,1,0.3,1)_both] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:scale-[1.01] hover:[box-shadow:0_22px_30px_rgba(47,43,40,0.34)] [font-family:'Cormorant_Garamond','Times_New_Roman',serif] motion-reduce:animate-none disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ animationDelay: `${workspaces.length * 90 + 80}ms` }}
                  aria-label="Add workspace"
                >
                  <span className="transition-transform duration-500 group-hover:rotate-90">
                    {isCreating ? "..." : "+"}
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {editingWorkspace ? (
          <div
            className="absolute inset-0 z-50 bg-[rgba(22,22,24,0)] backdrop-blur-[1.5px]"
            onClick={() => setEditingId(null)}
          >
            <div
              className="absolute right-[74px] top-[126px] w-[340px] rounded-[22px] border border-[rgba(218,219,224,0.95)] bg-[rgba(246,247,250,0.97)] p-5 [box-shadow:0_18px_30px_rgba(42,42,47,0.28)] [animation:panelIn_260ms_ease-out_both]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[22px] leading-none tracking-[0.5px] text-[#5f6269] [font-family:'Cinzel','Times_New_Roman',serif]">
                  Edit Workspace
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(219,221,228,0.72)] text-[20px] leading-none text-[#5f6269] transition-colors duration-200 hover:bg-[rgba(199,202,212,0.9)]"
                  aria-label="Close editor"
                >
                  x
                </button>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                    Workspace Name
                  </span>
                  <input
                    value={editingWorkspace.name}
                    onChange={(event) =>
                      updateLocally(editingWorkspace.id, { name: event.target.value })
                    }
                    onBlur={() =>
                      void persistWorkspace(editingWorkspace.id, { name: editingWorkspace.name })
                    }
                    className="h-10 rounded-[10px] border border-[#d3d5dd] bg-white/80 px-3 text-[18px] text-[#5f6269] outline-none transition-colors focus:border-[#8f93a0]"
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-[12px] font-medium uppercase tracking-[0.7px] text-[#7a7e87]">
                    Theme
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(THEME_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setThemeEditorMode("preset");
                          updateLocally(editingWorkspace.id, { theme: key });
                          void persistWorkspace(editingWorkspace.id, { theme: key });
                        }}
                        className={`h-9 rounded-[10px] border text-[11px] font-medium capitalize transition-colors ${
                          editingWorkspace.theme === key
                            ? "border-[#767b86] ring-2 ring-[#767b86]"
                            : "border-[#d0d3dc] hover:border-[#a0a4af]"
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["color", "gradient", "image"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setThemeEditorMode(mode)}
                        className={`min-w-[96px] flex-1 h-9 rounded-[10px] border px-3 text-[10px] leading-none font-semibold uppercase tracking-[0.04em] whitespace-nowrap transition-colors ${
                          themeEditorMode === mode
                            ? "border-[#767b86] bg-[#dfe3eb] text-[#565a62]"
                            : "border-[#d0d3dc] bg-white/70 text-[#767b86] hover:border-[#a0a4af]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {themeEditorMode === "color" ? (
                    <div className="mt-2 grid gap-2">
                      <div className="flex items-center gap-3 rounded-[12px] border border-[#d3d5dd] bg-white/75 px-3 py-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(event) => setCustomColor(event.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <input
                          value={customColor}
                          onChange={(event) => setCustomColor(event.target.value)}
                          placeholder="#A8C4D4"
                          className="h-9 flex-1 bg-transparent text-[13px] text-[#5f6269] outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void applyTheme()}
                        className="h-9 rounded-[10px] bg-[#6f8ea3] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#617f93]"
                      >
                        Apply Custom Color
                      </button>
                    </div>
                  ) : null}

                  {themeEditorMode === "gradient" ? (
                    <div className="mt-2 grid gap-3">
                      {/* Live preview */}
                      <div
                        className="h-11 w-full rounded-[10px] border border-[#d3d5dd] transition-all duration-300"
                        style={{ backgroundImage: buildGradient(gradientAngle, gradientStopA, gradientStopB) }}
                      />

                      {/* Preset templates */}
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9ea7]">Templates</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {GRADIENT_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setGradientStopA(preset.a);
                                setGradientStopB(preset.b);
                                setGradientAngle(preset.angle);
                              }}
                              className="h-9 rounded-[8px] border border-[rgba(0,0,0,0.07)] text-[10px] font-bold text-[rgba(55,55,65,0.85)] [text-shadow:0_1px_2px_rgba(255,255,255,0.6)] transition-transform duration-150 hover:scale-[1.05] active:scale-[0.97]"
                              style={{ backgroundImage: buildGradient(preset.angle, preset.a, preset.b) }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color stops */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9ea7]">Start</p>
                          <div className="flex items-center gap-2 rounded-[8px] border border-[#d3d5dd] bg-white/80 px-2 py-1">
                            <input
                              type="color"
                              value={gradientStopA}
                              onChange={(event) => setGradientStopA(event.target.value)}
                              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <input
                              value={gradientStopA}
                              onChange={(event) => setGradientStopA(event.target.value)}
                              maxLength={7}
                              className="w-0 flex-1 bg-transparent text-[11px] text-[#5f6269] outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9ea7]">End</p>
                          <div className="flex items-center gap-2 rounded-[8px] border border-[#d3d5dd] bg-white/80 px-2 py-1">
                            <input
                              type="color"
                              value={gradientStopB}
                              onChange={(event) => setGradientStopB(event.target.value)}
                              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <input
                              value={gradientStopB}
                              onChange={(event) => setGradientStopB(event.target.value)}
                              maxLength={7}
                              className="w-0 flex-1 bg-transparent text-[11px] text-[#5f6269] outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Angle slider */}
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9ea7]">Angle — {gradientAngle}°</p>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={gradientAngle}
                          onChange={(event) => setGradientAngle(parseInt(event.target.value, 10))}
                          className="w-full accent-[#8c79aa]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void applyTheme()}
                        className="h-9 rounded-[10px] bg-[#8c79aa] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#796797]"
                      >
                        Apply Gradient
                      </button>
                    </div>
                  ) : null}

                  {themeEditorMode === "image" ? (
                    <div className="mt-2 grid gap-2">
                      <input
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder="https://images.example.com/background.jpg"
                        className="h-10 rounded-[10px] border border-[#d3d5dd] bg-white/80 px-3 text-[12px] text-[#5f6269] outline-none transition-colors focus:border-[#8f93a0]"
                      />
                      <button
                        type="button"
                        onClick={() => void applyTheme()}
                        className="h-9 rounded-[10px] bg-[#759b84] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#668a75]"
                      >
                        Apply Image URL
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void deleteWorkspace()}
                  className="mt-1 h-10 rounded-[10px] bg-[#d96464] text-[13px] font-semibold uppercase tracking-[0.6px] text-white transition-colors hover:bg-[#c94d4d]"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isProfileMounted ? (
        <ProfileModal
          isVisible={isProfileVisible}
          userName={userName}
          fallbackInitials={profileInitials}
          profile={profile}
          passwordForm={passwordForm}
          passwordError={passwordError}
          passwordSuccess={passwordSuccess}
          onClose={closeProfileModal}
          onLogout={() => void logout()}
          onUpdateProfile={updateProfile}
          onUpdatePassword={updatePasswordField}
          onSavePassword={savePasswordChange}
        />
      ) : null}
    </div>
  );
}
