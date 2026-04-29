"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ProfileModal, { type ProfileSettings, type PasswordForm, type ApiKeyItem } from "./profile-modal";
import PreferencesModal from "./preferences-modal";
import QuickNotesView, { type QuickNote } from "./quick-notes";
import EmojiIcon from "./emoji-icon";
import LoadingScreen from "./loading-screen";
import { useLoadingScreen } from "@/hooks/use-loading-screen";
import { startTeleportLoading } from "@/lib/loading-screen";
import { setTheme, type Theme } from "@/lib/theme";

type WorkspaceItem = {
  id: string;
  name: string;
  theme: string;
  createdAt: string;
  _count?: { cards: number; columns: number };
};

type SessionItem = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  lastActiveAt: string;
  isActive: boolean;
  isCurrent: boolean;
};


type View = "dashboard" | "templates" | "quick-notes";
type TemplateType = "todo" | "expense" | "notes";

type TemplateItem = {
  id: TemplateType;
  title: string;
  accent: string;
  icon: string;
  meta: string;
  description: string;
};

const TEMPLATE_ITEMS: TemplateItem[] = [
  {
    id: "todo",
    title: "To-Do Manager",
    accent: "#C07850",
    icon: "✓",
    meta: "4 cols · Board view",
    description:
      "Board-first task management with columns for Backlog, In Progress, Review, and Done.",
  },
  {
    id: "expense",
    title: "Expense Tracker",
    accent: "#5A8A6A",
    icon: "₹",
    meta: "4 cols · Board view",
    description:
      "Track income and expenses across categories with monthly overview cards.",
  },
  {
    id: "notes",
    title: "Notes Manager",
    accent: "#5A7A9A",
    icon: "✎",
    meta: "Dual view · Canvas + Board",
    description:
      "A freeform note-taking workspace with tags, sections, and a canvas view for ideation.",
  },
];

const TEMPLATE_COLORS: Record<TemplateType, string> = {
  todo: "#C07850",
  expense: "#5A8A6A",
  notes: "#5A7A9A",
};

type TemplateSeedCard = { title: string; columnIndex: number };
type TemplateSeed = { columns: string[]; cards: TemplateSeedCard[] };

const TEMPLATE_SEEDS: Record<TemplateType, TemplateSeed> = {
  todo: {
    columns: ["Not Started", "Ongoing", "Completed"],
    cards: [
      { title: "Design database schema", columnIndex: 0 },
      { title: "Implement user authentication", columnIndex: 1 },
      { title: "Setup project repository", columnIndex: 2 },
    ],
  },
  expense: {
    columns: ["Income", "Needs", "Wants"],
    cards: [
      { title: "Salary credit", columnIndex: 0 },
      { title: "Pay electricity bill", columnIndex: 1 },
      { title: "Buy concert tickets", columnIndex: 2 },
    ],
  },
  notes: {
    columns: ["Ideas", "Drafts", "Published"],
    cards: [
      { title: "Mobile app features brainstorm", columnIndex: 0 },
      { title: "Weekly progress report", columnIndex: 1 },
      { title: "Meeting minutes - Q2 Planning", columnIndex: 2 },
    ],
  },
};

const COLOR_SWATCHES = ["#C07850", "#5A8A6A", "#5A7A9A", "#A06878", "#B8963C", "#7A6AA0"];

const WORKSPACE_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop",
];

function initials(name: string) {
  const parts = (name || "")
    .split(/\s+/)
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "NL";
  return parts.map((part) => part[0] ?? "").join("").toUpperCase();
}



function getThemeAccent(theme: string) {
  if (theme.startsWith("color:")) {
    return theme.slice("color:".length);
  }

  if (theme.startsWith("gradient:")) {
    const firstColor = theme.slice("gradient:".length).match(/#[0-9a-fA-F]{3,6}/);
    if (firstColor) return firstColor[0];
  }

  return "#6BA3BE";
}

function getBackground(theme: string, index: number) {
  if (theme.startsWith("image:")) {
    const imageUrl = theme.slice("image:".length);
    return `url('${imageUrl}')`;
  }

  if (theme.startsWith("gradient:")) {
    return theme.slice("gradient:".length);
  }

  if (theme.startsWith("color:")) {
    const color = theme.slice("color:".length);
    return `linear-gradient(160deg, ${color}66 0%, ${color}20 100%)`;
  }

  return `url('${WORKSPACE_FALLBACK_IMAGES[index % WORKSPACE_FALLBACK_IMAGES.length]}')`;
}

export default function DashboardPolished() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    isVisible: isLoaderVisible,
    isExiting: isLoaderExiting,
    workspaceName: loaderWorkspaceName,
    variant: loaderVariant,
  } = useLoadingScreen(status === "loading");

  const userName = session?.user?.name || session?.user?.email || "Notes User";
  const userEmail = session?.user?.email || "you@example.com";

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [view, setView] = useState<View>("dashboard");
  const [templateSubView, setTemplateSubView] = useState<TemplateType | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifVisible, setNotifVisible] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceColor, setNewWorkspaceColor] = useState("#C07850");
  const [isCreating, setIsCreating] = useState(false);
  const wsColorPickerRef = useRef<HTMLInputElement | null>(null);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [templateWorkspaceName, setTemplateWorkspaceName] = useState("");

  const [toast, setToast] = useState("");
  const [pendingWorkspaceIds, setPendingWorkspaceIds] = useState<Set<string>>(new Set());
  const [wsMenuOpenId, setWsMenuOpenId] = useState<string | null>(null);
  const [editWsId, setEditWsId] = useState<string | null>(null);

  // Quick Notes state (synced with database)
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);

  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch("/api/quick-notes");
        if (res.ok) {
          const data = await res.json();
          setQuickNotes(data);
        }
      } catch (err) {
        console.error("Failed to fetch quick notes", err);
      }
    }
    fetchNotes();
  }, []);

  const handleCreateNote = async (noteInfo: Partial<QuickNote>) => {
    try {
      const res = await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteInfo),
      });
      if (res.ok) {
        const newNote = await res.json();
        setQuickNotes((prev) => [newNote, ...prev]);
        setToast("Note created");
      } else {
        setToast("Failed to create note");
      }
    } catch (err) {
      console.error(err);
      setToast("Error creating note");
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<QuickNote>) => {
    // Optimistic update
    setQuickNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    try {
      const res = await fetch(`/api/quick-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        // Revert (ideal case would revert, but we'll just show an error toast)
        setToast("Failed to sync note update");
      } else {
        const savedNote = await res.json();
        setQuickNotes((prev) => prev.map((n) => (n.id === id ? savedNote : n)));
      }
    } catch (err) {
      console.error(err);
      setToast("Error updating note");
    }
  };

  const handleDeleteNote = async (id: string) => {
    setQuickNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/quick-notes/${id}`, { method: "DELETE" });
      if (!res.ok) setToast("Failed to delete note");
    } catch (err) {
      console.error(err);
      setToast("Error deleting note");
    }
  };

  const pinnedNotes = useMemo(() => quickNotes.filter((n) => n.pinned), [quickNotes]);

  function handleAddPinnedNote() {
    handleCreateNote({
      title: "New Pinned Note",
      description: "",
      color: "#C07850",
      pinned: true,
    });
    setView("quick-notes");
  }

  // Profile modal state
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(() => {
    let defaultTimezone = "UTC";
    try {
      defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch { }

    return {
      avatarMode: "placeholder",
      avatarUrl: "",
      displayName: "",
      email: "",
      emailVerified: false,
      showEmail: false,
      timezone: defaultTimezone,
      emailNotifications: true,
      twoFactorEnabled: false,
      twoFactorMethod: "authenticator",
      theme: "standard",
      dashboardBackground: null,
    };
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const [emailVerifyStep, setEmailVerifyStep] = useState<"idle" | "otp">("idle");
  const [emailOtpForm, setEmailOtpForm] = useState("");
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null);

  const [isUpdating2FA, setIsUpdating2FA] = useState(false);

  // Connected devices / sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [userPlan, setUserPlan] = useState("basic");
  const [apiKeyLimit, setApiKeyLimit] = useState(1);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      setProfileSettings((prev) => ({
        ...prev,
        email: session.user.email as string,
        emailVerified: !!session.user.emailVerified,
      }));
    }
  }, [session?.user]);

  // Fetch initial profile settings from database
  useEffect(() => {
    if (status !== "authenticated") return;

    let isMounted = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          console.warn("[Profile] Failed to load from API. Status:", res.status);
          return;
        }

        const data = await res.json();

        if (isMounted) {
          setProfileSettings((prev) => ({
            ...prev,
            ...(data.avatarMode && { avatarMode: data.avatarMode }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            ...(data.displayName !== undefined && { displayName: data.displayName }),
            ...(data.showEmail !== undefined && { showEmail: data.showEmail }),
            ...(data.theme !== undefined && { theme: data.theme }),
            ...(data.dashboardBackground !== undefined && { dashboardBackground: data.dashboardBackground }),
          }));

          // Sync body class immediately so all CSS inherits the theme
          if (data.theme) {
            setTheme(data.theme as Theme);
          }
        }
      } catch (err) {
        console.error("[Profile] Error loading profile settings:", err);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [status]);

  const loadApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) return;
      const data = await res.json() as { keys: ApiKeyItem[]; plan: string; limit: number };
      setApiKeys(data.keys);
      setUserPlan(data.plan);
      setApiKeyLimit(data.limit);
    } catch {
      // silently ignore
    }
  }, []);

  const handleCreateApiKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    setIsCreatingKey(true);
    setApiKeyError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json() as { key?: string; id?: string; name?: string; prefix?: string; createdAt?: string; error?: string };
      if (!res.ok) {
        setApiKeyError(data.error ?? "Failed to create key.");
        return;
      }
      setCreatedKey(data.key ?? null);
      setNewKeyName("");
      await loadApiKeys();
    } catch {
      setApiKeyError("Failed to create key.");
    } finally {
      setIsCreatingKey(false);
    }
  }, [newKeyName, loadApiKeys]);

  const handleRevokeApiKey = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // silently ignore
    }
  }, []);

  const handleUpdateProfile = useCallback(async (updates: Partial<ProfileSettings>) => {
    if ("twoFactorEnabled" in updates || "twoFactorMethod" in updates) {
      setIsUpdating2FA(true);
      try {
        const response = await fetch("/api/auth/2fa", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: updates.twoFactorEnabled ?? profileSettings.twoFactorEnabled,
            method: updates.twoFactorMethod ?? profileSettings.twoFactorMethod,
          }),
        });

        if (!response.ok) {
          let errMsg = "Failed to update 2FA settings";
          try {
            const errData = await response.json();
            if (errData.error) errMsg = errData.error;
          } catch (e) { }
          throw new Error(errMsg);
        }

        const data = await response.json();
        setProfileSettings((prev) => ({
          ...prev,
          twoFactorEnabled: data.twoFactorEnabled,
          twoFactorMethod: data.twoFactorMethod
        }));
        setToast("2FA settings updated");
      } catch (error) {
        setToast("Failed to update 2FA");
        console.error(error);
      } finally {
        setIsUpdating2FA(false);
      }
    } else {
      setProfileSettings((prev) => ({ ...prev, ...updates }));

      const { avatarMode, avatarUrl, displayName, showEmail, theme, dashboardBackground } = updates;

      // Sync body theme class immediately
      if (theme) {
        setTheme(theme as Theme);
      }

      const payload: Record<string, any> = {};
      if (avatarMode !== undefined) payload.avatarMode = avatarMode;
      if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl;
      if (displayName !== undefined) payload.displayName = displayName;
      if (showEmail !== undefined) payload.showEmail = showEmail;
      if (theme !== undefined) payload.theme = theme;
      if (dashboardBackground !== undefined) payload.dashboardBackground = dashboardBackground;

      if (Object.keys(payload).length > 0) {
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch((err) => console.error("Failed to save profile setting:", err));
      }

      setToast("Profile setting updated");
    }
  }, [profileSettings.twoFactorEnabled, profileSettings.twoFactorMethod]);

  const handleUpdatePassword = useCallback((field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordError(null);
    setPasswordSuccess(null);
  }, []);

  const handleSavePassword = useCallback(async () => {
    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccess("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setToast("Password updated");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setPasswordError(error.message);
      } else {
        setPasswordError("An unexpected error occurred");
      }
    } finally {
      setIsPasswordLoading(false);
    }
  }, [passwordForm]);

  const handleSendEmailOtp = useCallback(async () => {
    setIsEmailVerifying(true);
    setEmailVerifyError(null);
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setEmailVerifyStep("otp");
      setToast("Verification code sent to your email");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setToast(error.message);
      } else {
        setToast("Failed to send OTP");
      }
    } finally {
      setIsEmailVerifying(false);
    }
  }, []);

  const handleConfirmEmailOtp = useCallback(async () => {
    if (emailOtpForm.length !== 6) return;

    setIsEmailVerifying(true);
    setEmailVerifyError(null);

    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: emailOtpForm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      setProfileSettings((prev) => ({ ...prev, emailVerified: true }));
      setEmailVerifyStep("idle");
      setEmailOtpForm("");
      setToast("Email verified successfully!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setEmailVerifyError(error.message);
      } else {
        setEmailVerifyError("Invalid verification code");
      }
    } finally {
      setIsEmailVerifying(false);
    }
  }, [emailOtpForm]);

  const handleCloseProfileModal = useCallback(() => setProfileModalVisible(false), []);
  const handleLogout = useCallback(() => signOut({ callbackUrl: "/auth/sign-in" }), []);
  const handleOpenPreferencesModal = useCallback(() => setPreferencesModalVisible(true), []);
  const handleDismissCreatedKey = useCallback(() => setCreatedKey(null), []);

  const profileWrapRef = useRef<HTMLDivElement | null>(null);
  const devicePanelRef = useRef<HTMLDivElement | null>(null);
  const createNameInputRef = useRef<HTMLInputElement | null>(null);
  const templateNameInputRef = useRef<HTMLInputElement | null>(null);
  const templateCardRefs = useRef<Partial<Record<TemplateType, HTMLElement | null>>>({});

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${(index * 19) % 100}%`,
        bottom: `${(index * 11) % 20}%`,
        size: `${2 + (index % 4)}px`,
        duration: `${6 + (index % 9)}s`,
        delay: `${-(index % 11)}s`,
        color: COLOR_SWATCHES[index % COLOR_SWATCHES.length],
      })),
    []
  );

  const wsColorFilters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ws of workspaces) {
      const accent = getThemeAccent(ws.theme);
      if (!seen.has(accent)) seen.set(accent, accent);
    }
    return Array.from(seen.values());
  }, [workspaces]);

  const filteredWorkspaces = useMemo(() => {
    const q = searchValue.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const accent = getThemeAccent(workspace.theme);
      const filterMatch = !workspaceFilter || accent === workspaceFilter;
      const searchMatch = !q || workspace.name.toLowerCase().includes(q);

      return filterMatch && searchMatch;
    });
  }, [searchValue, workspaceFilter, workspaces]);

  const workspaceCount = workspaces.length;
  const totalCards = workspaces.reduce((sum, ws) => sum + (ws._count?.cards ?? 0), 0);
  const templateColorsSet = useMemo(() => new Set(Object.values(TEMPLATE_COLORS)), []);
  const templatesUsedCount = workspaces.filter(ws => templateColorsSet.has(ws.theme)).length;

  useEffect(() => {
    if (!toast) return;

    const t = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWorkspaces() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/workspaces", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { workspaces?: WorkspaceItem[]; error?: string }
          | null;

        if (!response.ok) {
          if (!cancelled) {
            if (response.status === 401) {
              router.replace("/auth/sign-in");
              return;
            } else {
              setError(payload?.error ?? "Failed to load workspaces.");
            }
          }
          return;
        }

        if (!cancelled) {
          setWorkspaces(payload?.workspaces ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the server.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [router, session?.user?.email, status]);

  // Fetch connected device sessions
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadSessions(isInitial = false) {
      if (isInitial) setIsLoadingSessions(true);
      try {
        const res = await fetch("/api/auth/sessions");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setSessions(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silently fail — devices section is non-critical
      } finally {
        if (!cancelled && isInitial) setIsLoadingSessions(false);
      }
    }

    void loadSessions(true);

    const intervalId = setInterval(() => {
      void loadSessions(false);
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [status]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const active = document.activeElement;
      const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (event.key === "Escape") {
        setCreateOpen(false);
        setTemplateOpen(false);
        setProfileOpen(false);
        setMobileSidebarOpen(false);
        return;
      }

      if (isTyping) return;

      if (event.key?.toLowerCase() === "n") {
        setCreateOpen(true);
      }

      if (event.key?.toLowerCase() === "b") {
        setSidebarCollapsed((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (profileWrapRef.current && !profileWrapRef.current.contains(target)) {
        setProfileOpen(false);
      }

      // Only close workspace menu if clicking outside the button and the menu itself
      if (!target.closest(".ws-delete-btn") && !target.closest(".ws-card-menu")) {
        setWsMenuOpenId(null);
      }
    }

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  useEffect(() => {
    if (!createOpen) return;

    const timer = window.setTimeout(() => {
      createNameInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [createOpen]);

  useEffect(() => {
    if (!templateOpen) return;

    const timer = window.setTimeout(() => {
      templateNameInputRef.current?.focus();
      templateNameInputRef.current?.select();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [templateOpen]);

  useEffect(() => {
    if (view !== "templates" || !templateSubView) return;

    const timer = window.setTimeout(() => {
      templateCardRefs.current[templateSubView]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [templateSubView, view]);

  /** Seed template columns and starter cards after workspace creation (single batch API call). */
  async function seedTemplateWorkspace(workspaceId: string, templateId: TemplateType) {
    const seed = TEMPLATE_SEEDS[templateId];
    if (!seed) return;

    try {
      const res = await fetch("/api/workspaces/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          columns: seed.columns,
          cards: seed.cards,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("Seed failed:", errData?.error);
      }
    } catch {
      console.error("Seed request failed");
    }

    // Update the workspace card/column counts in local state
    const cardCount = { cards: seed.cards.length, columns: seed.columns.length };
    setWorkspaces((current) =>
      current.map((ws) =>
        ws.id === workspaceId
          ? { ...ws, _count: cardCount }
          : ws
      )
    );
  }

  async function createWorkspace(name: string, color: string, templateId?: TemplateType) {
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const seedCount = templateId ? TEMPLATE_SEEDS[templateId] : null;
    const optimisticWorkspace: WorkspaceItem = {
      id: optimisticId,
      name,
      theme: `color:${color}`,
      createdAt: new Date().toISOString(),
      _count: {
        cards: seedCount?.cards.length ?? 0,
        columns: seedCount?.columns.length ?? 0,
      },
    };

    setWorkspaces((current) => [...current, optimisticWorkspace]);
    setPendingWorkspaceIds((current) => {
      const next = new Set(current);
      next.add(optimisticId);
      return next;
    });
    setView("dashboard");
    setTemplateSubView(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          theme: `color:${color}`,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { workspace?: WorkspaceItem; error?: string }
        | null;

      if (response.status === 401) {
        setWorkspaces((current) => current.filter((workspace) => workspace.id !== optimisticId));
        setPendingWorkspaceIds((current) => {
          const next = new Set(current);
          next.delete(optimisticId);
          return next;
        });
        router.replace("/auth/sign-in");
        return;
      }

      if (!response.ok || !payload?.workspace) {
        setWorkspaces((current) => current.filter((workspace) => workspace.id !== optimisticId));
        setPendingWorkspaceIds((current) => {
          const next = new Set(current);
          next.delete(optimisticId);
          return next;
        });
        setToast(payload?.error ?? "Could not create workspace.");
        return;
      }

      const realWorkspace = payload.workspace as WorkspaceItem;

      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === optimisticId ? realWorkspace : workspace
        )
      );

      // Seed template columns + cards while keeping the UI in a pending state
      if (templateId) {
        // Add the real ID to pending so handleOpenWorkspace blocks entry
        setPendingWorkspaceIds((current) => {
          const next = new Set(current);
          next.add(realWorkspace.id);
          return next;
        });

        await seedTemplateWorkspace(realWorkspace.id, templateId);

        // Remove the real ID from pending once seeded
        setPendingWorkspaceIds((current) => {
          const next = new Set(current);
          next.delete(realWorkspace.id);
          return next;
        });
      }

      setPendingWorkspaceIds((current) => {
        const next = new Set(current);
        next.delete(optimisticId);
        return next;
      });
      setToast(`✓ "${name}" created`);
    } catch {
      setWorkspaces((current) => current.filter((workspace) => workspace.id !== optimisticId));
      setPendingWorkspaceIds((current) => {
        const next = new Set(current);
        next.delete(optimisticId);
        return next;
      });
      setToast("Could not reach the server.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteWorkspace(id: string) {
    setWorkspaces((current) => current.filter((ws) => ws.id !== id));
    setToast("Workspace removed");
    try {
      await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    } catch {
      setToast("Failed to remove workspace");
    }
  }

  async function handleUpdateWorkspace() {
    if (!editWsId) return;
    const name = newWorkspaceName.trim();
    if (!name) { setToast("Workspace name is required"); return; }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${editWsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          theme: `color:${newWorkspaceColor}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to update workspace");

      const data = await res.json();
      setWorkspaces((prev) => prev.map(ws => ws.id === editWsId ? { ...ws, name: data.workspace.name, theme: data.workspace.theme } : ws));
      setToast("Workspace updated");
      setCreateOpen(false);
      setEditWsId(null);
    } catch (err) {
      console.error(err);
      setToast("Failed to update workspace");
    } finally {
      setIsCreating(false);
    }
  }

  function openEditWorkspace(ws: WorkspaceItem) {
    setEditWsId(ws.id);
    setNewWorkspaceName(ws.name);
    const accent = getThemeAccent(ws.theme);
    setNewWorkspaceColor(accent);
    setCreateOpen(true);
    setWsMenuOpenId(null);
  }

  function handleOpenWorkspace(workspace: WorkspaceItem) {
    if (pendingWorkspaceIds.has(workspace.id)) {
      setToast("Workspace is still being created...");
      return;
    }

    startTeleportLoading({ workspaceName: workspace.name });
    router.push(`/dashboard/${workspace.id}`);
  }

  function handleSidebarTemplateNav(template: TemplateType) {
    setView("templates");
    setTemplateSubView(template);
    setMobileSidebarOpen(false);
  }

  function handleShowDevicePanel() {
    setView("dashboard");
    setTemplateSubView(null);
    setProfileOpen(false);

    window.setTimeout(() => {
      devicePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }

  function handleCreateWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) {
      setToast("Workspace name is required.");
      return;
    }

    void createWorkspace(name, newWorkspaceColor);
    setCreateOpen(false);
    setNewWorkspaceName("");
  }

  function handleUseTemplate(template: TemplateItem) {
    setSelectedTemplate(template);
    setTemplateWorkspaceName(template.title);
    setTemplateOpen(true);
  }

  function handleConfirmTemplate() {
    const name = templateWorkspaceName.trim();
    if (!name || !selectedTemplate) {
      setToast("Workspace name is required.");
      return;
    }

    void createWorkspace(name, TEMPLATE_COLORS[selectedTemplate.id], selectedTemplate.id);
    setTemplateOpen(false);
  }

  if (isLoaderVisible) {
    return (
      <LoadingScreen
        exiting={isLoaderExiting}
        workspaceName={loaderWorkspaceName}
        variant={loaderVariant}
      />
    );
  }

  return (
    <>
      <div className="app-root transition-colors duration-500">
        {profileSettings.dashboardBackground && (
          <div
            className="absolute inset-0 z-0 opacity-40 transition-opacity duration-700 pointer-events-none"
            style={{
              backgroundImage: `url(${profileSettings.dashboardBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: profileSettings.theme === 'dark' ? 'brightness(0.6) contrast(1.2)' : 'none'
            }}
          />
        )}
        <div className="ambient">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
          <div className="orb orb4" />
        </div>

        <div className="particles" aria-hidden="true">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="particle"
              style={{
                left: particle.left,
                bottom: particle.bottom,
                width: particle.size,
                height: particle.size,
                background: particle.color,
                animationDuration: particle.duration,
                animationDelay: particle.delay,
              }}
            />
          ))}
        </div>

        <div className="deco-ring" />
        <div className="deco-ring2" />

        <div className="app">
          <div className={`sb-backdrop ${mobileSidebarOpen ? "visible" : ""}`} onClick={() => setMobileSidebarOpen(false)} />
          <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}`}>
            <div className="sidebar-top">
              <button
                className="sb-toggle"
                type="button"
                title="Toggle sidebar"
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth <= 768) {
                    setMobileSidebarOpen(false);
                  } else {
                    setSidebarCollapsed((current) => !current);
                  }
                }}
              >
                <span className="l1" />
                <span className="l2" />
                <span className="l3" />
              </button>
              <div className="brand-text">
                <div className="brand-name">Notes<em>Lite</em></div>
                <div className="brand-tag">Visual Workspace</div>
              </div>
            </div>

            <div className="sidebar-body">
              <div className="sb-section-lbl">Navigation</div>
              <button
                type="button"
                className={`sb-item ${view === "dashboard" ? "active" : ""}`}
                onClick={() => {
                  setView("dashboard");
                  setTemplateSubView(null);
                  setMobileSidebarOpen(false);
                }}
              >
                <div className="sb-icon">⊞</div>
                <span className="sb-lbl">Dashboard</span>
              </button>
              <button
                type="button"
                className={`sb-item ${view === "quick-notes" ? "active" : ""}`}
                onClick={() => {
                  setView("quick-notes");
                  setTemplateSubView(null);
                  setMobileSidebarOpen(false);
                }}
              >
                <EmojiIcon className="sb-icon" emoji="✎" label="Quick notes" />
                <span className="sb-lbl">Quick Notes</span>
              </button>

              <div className="sb-section-lbl" style={{ marginTop: 4 }}>Templates</div>
              <button
                type="button"
                className={`sb-item ${view === "templates" && templateSubView === "todo" ? "active" : ""}`}
                onClick={() => handleSidebarTemplateNav("todo")}
              >
                <EmojiIcon className="sb-icon" emoji="✓" label="To-do manager" />
                <span className="sb-lbl">To-Do Manager</span>
                <span className="tmpl-badge">tmpl</span>
              </button>
              <button
                type="button"
                className={`sb-item ${view === "templates" && templateSubView === "expense" ? "active" : ""}`}
                onClick={() => handleSidebarTemplateNav("expense")}
              >
                <EmojiIcon className="sb-icon" emoji="₹" label="Expense tracker" />
                <span className="sb-lbl">Expense Tracker</span>
                <span className="tmpl-badge">tmpl</span>
              </button>
              <button
                type="button"
                className={`sb-item ${view === "templates" && templateSubView === "notes" ? "active" : ""}`}
                onClick={() => handleSidebarTemplateNav("notes")}
              >
                <EmojiIcon className="sb-icon" emoji="✎" label="Notes manager" />
                <span className="sb-lbl">Notes Manager</span>
                <span className="tmpl-badge">tmpl</span>
              </button>

              <div className="sb-section-lbl" style={{ marginTop: 4 }}>Workspaces</div>
              {workspaces.slice(0, 8).map((workspace) => (
                <button
                  key={workspace.id}
                  className="sb-item"
                  type="button"
                  onClick={() => handleOpenWorkspace(workspace)}
                  onMouseEnter={() => router.prefetch(`/dashboard/${workspace.id}`)}
                  aria-busy={pendingWorkspaceIds.has(workspace.id)}
                >
                  <div className="sb-icon">
                    <div className="ws-dot-sb" style={{ background: getThemeAccent(workspace.theme) }} />
                  </div>
                  <span className="sb-lbl">{workspace.name}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-footer">
              <div ref={profileWrapRef} style={{ position: "relative" }}>
                <button
                  className="user-card"
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                >
                  <div className="user-av">{initials(userName).slice(0, 1)}</div>
                  {!sidebarCollapsed && (
                    <div className="user-info-sb">
                      <div className="user-name">{userName}</div>
                      <div className="user-plan">Basic plan</div>
                    </div>
                  )}
                </button>

                <div className={`profile-dropdown ${profileOpen ? "open" : ""}`} style={{ bottom: "calc(100% + 10px)", top: "auto", right: sidebarCollapsed ? "-200px" : "0", left: "0" }}>
                  <div className="pd-header">
                    <div className="pd-av">{initials(userName).slice(0, 1)}</div>
                    <div>
                      <div className="pd-name">{userName}</div>
                      <div className="pd-email">{userEmail}</div>
                      <div className="pd-plan">Basic</div>
                    </div>
                  </div>
                  <div className="pd-section">
                    <button className="pd-item" type="button" onClick={() => { setProfileModalVisible(true); setProfileOpen(false); loadApiKeys(); }}>
                      <EmojiIcon className="pd-item-icon" emoji="👤" label="Profile" />
                      Profile Settings
                    </button>
                    <button className="pd-item" type="button" onClick={() => { setPreferencesModalVisible(true); setProfileOpen(false); }}>
                      <EmojiIcon className="pd-item-icon" emoji="⚙️" label="Preferences" />
                      Preferences
                    </button>
                    <button className="pd-item" type="button" onClick={() => { setToast("Keyboard shortcuts"); setProfileOpen(false); }}>
                      <EmojiIcon className="pd-item-icon" emoji="⌨" label="Shortcuts" />
                      Shortcuts
                    </button>
                  </div>
                  <div className="pd-divider" />
                  <div className="pd-section" style={{ paddingTop: 4 }}>
                    <button className="pd-item danger" type="button" onClick={() => void signOut({ callbackUrl: "/auth/sign-in" })}>
                      <EmojiIcon className="pd-item-icon" emoji="🚪" label="Sign out" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="main">
            <div className="topbar">
              {!mobileSearchOpen && (
                <>
                  <button className="mobile-ham" type="button" onClick={() => {
                    setSidebarCollapsed(false);
                    setMobileSidebarOpen(true);
                  }}>
                    <span />
                    <span />
                    <span />
                  </button>

                  <div className="topbar-context">
                    <div className="ctx-page">{view === "dashboard" ? "Dashboard" : view === "quick-notes" ? "Quick Notes" : "Templates"}</div>
                    {templateSubView ? <div className="ctx-sep">/</div> : null}
                    {templateSubView ? (
                      <div className="ctx-sub">{TEMPLATE_ITEMS.find((item) => item.id === templateSubView)?.title}</div>
                    ) : null}
                  </div>
                </>
              )}

              <div className="devices-row" title={`${sessions.length} devices synced`}>
                <div className="sync-wave">
                  <div className="sw" />
                  <div className="sw" />
                  <div className="sw" />
                  <div className="sw" />
                  <div className="sw" />
                </div>
                <div className="devices-sep" />
                {sessions.slice(0, 3).map((s) => {
                  const isDesktop = /windows|mac|linux/i.test(s.os);
                  const isTablet = /ipad/i.test(s.deviceName);
                  const icon = isTablet ? "⬜" : isDesktop ? "💻" : "📱";

                  const timeDiff = Date.now() - new Date(s.lastActiveAt).getTime();
                  const minutesAgo = Math.floor(timeDiff / 60000);
                  const isActiveNow = s.isCurrent || minutesAgo < 5;
                  const status = isActiveNow ? "Active" : minutesAgo < 10 ? "Synced" : `Last synced ${minutesAgo > 60 ? Math.floor(minutesAgo / 60) + "h" : minutesAgo + "m"} ago`;
                  const isIdle = !isActiveNow && minutesAgo >= 10;

                  return (
                    <div
                      key={s.id}
                      className={`device-icon ${!isIdle ? "synced" : ""}`}
                      title={`${s.deviceName} - ${status}`}
                      style={isIdle ? { opacity: 0.5 } : {}}
                    >
                      <EmojiIcon emoji={icon} label={isTablet ? "Tablet" : isDesktop ? "Desktop" : "Phone"} />
                    </div>
                  );
                })}
              </div>

              <div className={`search-bar ${mobileSearchOpen ? "mobile-open" : ""}`}>
                <span className="search-icon">⌕</span>
                <input
                  type="search"
                  name="q"
                  id="search-input"
                  autoComplete="nope"
                  spellCheck="false"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder="Search workspaces..."
                  value={searchValue}
                  autoFocus={mobileSearchOpen}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setMobileSearchOpen(false)}
                />
              </div>

              {mobileSearchOpen && (
                <button className="search-cancel-btn" onClick={() => setMobileSearchOpen(false)}>Cancel</button>
              )}

              {!mobileSearchOpen && (
                <button className="new-btn" type="button" onClick={() => setCreateOpen(true)}>
                  <span>+</span>
                  <span>New Workspace</span>
                </button>
              )}

              {!mobileSearchOpen && (
                <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button 
                    className="mobile-search-btn" 
                    type="button" 
                    onClick={() => setMobileSearchOpen(true)}
                    title="Search"
                  >
                    <span style={{ fontSize: "18px" }}>⌕</span>
                  </button>
                <button
                  className="notif-btn"
                  type="button"
                  onClick={() => { setToast("No new notifications"); setNotifVisible(false); }}
                  title="Notifications"
                >
                  <EmojiIcon emoji="🔔" label="Notifications" style={{ fontSize: "16px" }} />
                  {notifVisible ? <div className="notif-badge" /> : null}
                </button>

                </div>
              )}
            </div>

            <div className="content">
              {isLoading ? <div className="info-line">Loading workspace data...</div> : null}
              {error ? <div className="error-line">{error}</div> : null}

              <div className={`view-panel ${view === "dashboard" ? "active" : ""}`}>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: "linear-gradient(90deg,#C07850,#D4956E)" }} />
                    <div className="stat-label">Workspaces</div>
                    <div className="stat-value">{workspaceCount}</div>
                    <div className="stat-sub">2 active this week</div>
                    <div className="stat-glyph">⊞</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: "linear-gradient(90deg,#5A8A6A,#7AAF8A)" }} />
                    <div className="stat-label">Total Cards</div>
                    <div className="stat-value">{totalCards}</div>
                    <div className="stat-sub">Across all workspaces</div>
                    <div className="stat-glyph">▤</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: "linear-gradient(90deg,#5A7A9A,#7A9ABB)" }} />
                    <div className="stat-label">Templates Used</div>
                    <div className="stat-value">{templatesUsedCount}</div>
                    <div className="stat-sub">This month</div>
                    <div className="stat-glyph">◈</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-accent" style={{ background: "linear-gradient(90deg,#A06878,#C08898)" }} />
                    <div className="stat-label">Devices Synced</div>
                    <div className="stat-value">{isLoadingSessions ? "-" : sessions.length}</div>
                  </div>
                </div>

                <div className="section-header">
                  <div className="section-title">Your Workspaces</div>
                  <div className="section-count">{filteredWorkspaces.length}</div>
                  <div className="section-action" onClick={() => setToast("Viewing all...")}>View all →</div>
                </div>

                <div className="filter-row">
                  <button
                    type="button"
                    className={`wsf-all ${!workspaceFilter ? "active" : ""}`}
                    onClick={() => setWorkspaceFilter(null)}
                  >
                    All
                  </button>
                  {wsColorFilters.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`wsf-dot ${workspaceFilter === hex ? "active" : ""}`}
                      style={{ background: hex }}
                      title={hex}
                      onClick={() => setWorkspaceFilter(workspaceFilter === hex ? null : hex)}
                    />
                  ))}
                </div>

                <div className="ws-frame">
                  <div className="workspace-grid">
                    {filteredWorkspaces.map((workspace, index) => {
                      const cards = workspace._count?.cards ?? 0;
                      const cols = workspace._count?.columns ?? 0;
                      const isPending = pendingWorkspaceIds.has(workspace.id);

                      return (
                        <div
                          key={workspace.id}
                          role="button"
                          tabIndex={0}
                          className={`ws-card ${isPending ? "pending" : ""}`}
                          onClick={() => handleOpenWorkspace(workspace)}
                          onMouseEnter={() => router.prefetch(`/dashboard/${workspace.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleOpenWorkspace(workspace);
                            }
                          }}
                          aria-busy={isPending}
                        >
                          <div className="ws-bg" style={{ backgroundImage: getBackground(workspace.theme, index) }} />
                          <div className="ws-overlay" />
                          <div className="ws-accent-strip" style={{ background: getThemeAccent(workspace.theme) }} />
                          <button
                            type="button"
                            className="ws-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWsMenuOpenId(wsMenuOpenId === workspace.id ? null : workspace.id);
                            }}
                          >
                            -
                          </button>

                          {wsMenuOpenId === workspace.id && (
                            <div className="ws-card-menu" onClick={(e) => e.stopPropagation()}>
                              <button className="ws-card-menu-item" onClick={() => openEditWorkspace(workspace)}>
                                <EmojiIcon emoji="✏️" label="Edit" /> Edit
                              </button>
                              <button className="ws-card-menu-item danger" onClick={() => { handleDeleteWorkspace(workspace.id); setWsMenuOpenId(null); }}>
                                <EmojiIcon emoji="🗑️" label="Delete" /> Delete
                              </button>
                            </div>
                          )}
                          <div className="ws-label-wrap">
                            <div className="ws-label">{workspace.name}</div>
                          </div>
                          <div className="ws-info">
                            <div className="ws-meta-txt">{isPending ? "Creating..." : `${cards} cards · ${cols} cols`}</div>
                            <div className="ws-tags">
                              <div className="ws-color-dot" style={{ background: getThemeAccent(workspace.theme) }} />
                              {isPending && <div className="wt ta">New</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button className="ws-add" type="button" onClick={() => setCreateOpen(true)}>
                      <div className="ws-add-icon">+</div>
                      <div className="ws-add-txt">New Workspace</div>
                    </button>
                  </div>
                </div>

                <div className="section-header">
                  <div className="section-title">Devices</div>
                  <div className="sync-status" style={{ marginLeft: "auto" }}>
                    <div className="sync-dot" />All synced
                  </div>
                </div>

                <div className="device-panel" ref={devicePanelRef}>
                  <div className="device-panel-header">
                    <div className="device-panel-title">Connected Devices</div>
                    <div className="sync-status"><div className="sync-dot" />{sessions.length > 0 ? "Live sync active" : "No sessions"}</div>
                  </div>
                  <div className="device-list">
                    {isLoadingSessions ? (
                      <div className="device-item" style={{ opacity: 0.5, justifyContent: "center" }}>
                        <div className="di-detail">Loading devices…</div>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="device-item" style={{ opacity: 0.5, justifyContent: "center" }}>
                        <div className="di-detail">No active sessions found</div>
                      </div>
                    ) : (
                      sessions.map((s) => {
                        const timeDiff = Date.now() - new Date(s.lastActiveAt).getTime();
                        const minutesAgo = Math.floor(timeDiff / 60000);
                        const hoursAgo = Math.floor(timeDiff / 3600000);
                        const isActiveNow = s.isCurrent || minutesAgo < 15;
                        const timeLabel = isActiveNow
                          ? "Active now"
                          : minutesAgo < 60
                            ? `${minutesAgo}m ago`
                            : hoursAgo < 24
                              ? `${hoursAgo}h ago`
                              : `${Math.floor(hoursAgo / 24)}d ago`;

                        const isDesktop = /windows|mac|linux/i.test(s.os);
                        const isTablet = /ipad/i.test(s.deviceName);
                        const icon = isTablet ? "⬜" : isDesktop ? "💻" : "📱";

                        return (
                          <div
                            className="device-item"
                            key={s.id}
                            style={{ opacity: isActiveNow ? 1 : 0.8 }}
                          >
                            <div className="device-item-icon">
                              <EmojiIcon emoji={icon} label={isTablet ? "Tablet" : isDesktop ? "Desktop" : "Phone"} />
                              {isActiveNow && (
                                <div
                                  className="device-active-dot"
                                  style={{ background: "#5A8A6A" }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="di-name">{s.deviceName}</div>
                              <div className="di-detail">
                                {s.os} · {s.browser} · {timeLabel}
                              </div>
                              <div className="di-sync-bar">
                                <div
                                  className="di-sync-fill"
                                  style={{
                                    width: isActiveNow ? "100%" : minutesAgo < 10 ? "95%" : "60%",
                                    ...(isActiveNow ? {} : minutesAgo > 60 ? { opacity: 0.4, animation: "none" } : {}),
                                  }}
                                />
                              </div>
                            </div>
                            <div className={`di-badge ${s.isCurrent ? "current" : isActiveNow ? "current" : minutesAgo < 10 ? "synced" : "offline"}`}>
                              {s.isCurrent ? "Current" : isActiveNow ? "Active" : minutesAgo < 10 ? "Synced" : "Idle"}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <div className="section-header" style={{ marginBottom: 10 }}><div className="section-title">Recent Activity</div></div>
                    <div className="activity-list">
                      <div className="activity-item">
                        <div className="activity-dot" style={{ background: "#C07850" }} />
                        <div className="activity-info">
                          <div className="activity-action">Card added to <strong>DSA Notes</strong></div>
                          <div className="activity-detail">Binary Trees - In Progress column</div>
                        </div>
                        <div className="activity-time">2m ago</div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-dot" style={{ background: "#5A8A6A" }} />
                        <div className="activity-info">
                          <div className="activity-action">Synced from iPhone</div>
                          <div className="activity-detail">Transactions workspace - 3 cards updated</div>
                        </div>
                        <div className="activity-time">18m ago</div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-dot" style={{ background: "#5A7A9A" }} />
                        <div className="activity-info">
                          <div className="activity-action">Used Expense Tracker template</div>
                          <div className="activity-detail">New workspace created from template</div>
                        </div>
                        <div className="activity-time">1h ago</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="section-header" style={{ marginBottom: 10 }}>
                      <div className="section-title">Pinned Quick Notes</div>
                      <div className="section-count">{pinnedNotes.length}</div>
                      <div className="section-action" onClick={() => setView("quick-notes")}>View all →</div>
                    </div>
                    <div className="quick-panel">
                      <div className="quick-header">
                        <div className="quick-title">Pinned</div>
                        <button className="quick-add-btn" type="button" onClick={handleAddPinnedNote} title="Add pinned note">+</button>
                      </div>
                      <div className="quick-notes">
                        {pinnedNotes.length === 0 ? (
                          <div style={{ padding: "16px 12px", fontSize: 12, color: "var(--text3)", textAlign: "center" }}>No pinned notes yet</div>
                        ) : pinnedNotes.slice(0, 5).map((note) => (
                          <div key={note.id} className="quick-note" style={{ ["--nc" as string]: note.color, ["--nb" as string]: `${note.color}12`, cursor: "pointer" }} onClick={() => setView("quick-notes")}>
                            <div className="qn-title"><EmojiIcon emoji="📌" label="Pinned" /> {note.title}</div>
                            {note.description ? note.description.slice(0, 60) + (note.description.length > 60 ? "..." : "") : "No description"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`view-panel ${view === "templates" ? "active" : ""}`}>
                <div className="section-header" style={{ marginBottom: 8 }}>
                  <div className="section-title">Templates</div>
                  <div className="section-count">{TEMPLATE_ITEMS.length}</div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 20, lineHeight: 1.6 }}>
                  Start with a pre-built workspace structure. Each template is fully customizable after creation.
                </p>

                <div className="tmpl-grid">
                  {TEMPLATE_ITEMS.map((template) => (
                    <article
                      key={template.id}
                      className="tmpl-card"
                      ref={(el) => {
                        templateCardRefs.current[template.id] = el;
                      }}
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="tmpl-preview" style={{ background: `linear-gradient(135deg,${template.accent}22,${template.accent}12)` }}>
                        <div className="tmpl-preview-inner">
                          <div className="tmpl-row dark" style={{ width: "72%", background: `${template.accent}44` }} />
                          <div className="tmpl-row" style={{ width: "95%" }} />
                          <div className="tmpl-row" style={{ width: "84%" }} />
                          <div className="tmpl-row" style={{ width: "68%" }} />
                        </div>
                      </div>
                      <div className="tmpl-body">
                        <EmojiIcon className="tmpl-icon-wrap" emoji={template.icon} label={template.title} />
                        <div className="tmpl-name">{template.title}</div>
                        <div className="tmpl-desc">{template.description}</div>
                        <div className="tmpl-footer">
                          <div className="tmpl-meta">{template.meta}</div>
                          <button className="tmpl-use-btn" type="button" style={{ background: `${template.accent}22`, color: template.accent }}>
                            Use Template →
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={`view-panel ${view === "quick-notes" ? "active" : ""}`}>
                <QuickNotesView
                  notes={quickNotes}
                  onCreateNote={handleCreateNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  onToast={setToast}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`overlay ${createOpen ? "show" : ""}`} onClick={() => { setCreateOpen(false); setEditWsId(null); }}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">{editWsId ? "Edit Workspace" : "New Workspace"}</div>
            <div className="modal-sub">
              {editWsId ? "Update your workspace name and theme." : "Create a beautiful workspace for your notes and ideas."}
            </div>

            <div className="modal-label">Workspace Name</div>
            <input
              ref={createNameInputRef}
              className="modal-input"
              placeholder="e.g. Project Apollo"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") editWsId ? handleUpdateWorkspace() : handleCreateWorkspace();
                if (e.key === "Escape") { setCreateOpen(false); setEditWsId(null); }
              }}
            />

            <div className="modal-label">Accent Colour</div>
            <div className="color-row">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${newWorkspaceColor === color ? "sel" : ""}`}
                  style={{ background: color }}
                  onClick={() => setNewWorkspaceColor(color)}
                />
              ))}
              {!COLOR_SWATCHES.includes(newWorkspaceColor) && (
                <button
                  type="button"
                  className="color-swatch sel"
                  style={{ background: newWorkspaceColor }}
                  onClick={() => wsColorPickerRef.current?.click()}
                />
              )}
              <button
                type="button"
                className="color-swatch-add"
                title="Pick a custom color"
                onClick={() => wsColorPickerRef.current?.click()}
              >+</button>
              <input
                ref={wsColorPickerRef}
                type="color"
                value={newWorkspaceColor}
                onChange={(e) => setNewWorkspaceColor(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                type="button"
                onClick={() => { setCreateOpen(false); setEditWsId(null); }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                type="button"
                disabled={!newWorkspaceName.trim() || isCreating}
                onClick={editWsId ? handleUpdateWorkspace : handleCreateWorkspace}
              >
                {isCreating ? "Saving..." : (editWsId ? "Save" : "Create")}
              </button>
            </div>
          </div>
        </div>

        <div className={`overlay ${templateOpen ? "show" : ""}`} onClick={() => setTemplateOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">Use - {selectedTemplate?.title ?? "Template"}</div>
            <div className="modal-sub">Name your new workspace based on this template.</div>
            <div className="modal-label">Workspace Name</div>
            <input
              ref={templateNameInputRef}
              className="modal-input"
              type="text"
              value={templateWorkspaceName}
              onChange={(event) => setTemplateWorkspaceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleConfirmTemplate();
                if (event.key === "Escape") setTemplateOpen(false);
              }}
            />
            <div className="modal-actions">
              <button className="btn-cancel" type="button" onClick={() => setTemplateOpen(false)}>Cancel</button>
              <button className="btn-confirm" type="button" disabled={isCreating} onClick={handleConfirmTemplate}>
                {isCreating ? "Creating..." : "Create from Template"}
              </button>
            </div>
          </div>
        </div>

        <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
      `}</style>

      <style jsx>{`
        *, *::before, *::after { box-sizing: border-box; }

        .app-root {
          /* All CSS variables (--bg, --text, --surface, etc.) are defined
             in themes.css on body.theme-standard / dark / space.
             This element inherits them automatically. */
          --sb: 230px;
          --sb-col: 62px;
          height: 100vh;
          overflow: hidden;
          font-family: "DM Sans", sans-serif;
          background: var(--bg);
          color: var(--text);
          position: relative;
        }

        .ambient, .particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.18;
          animation: orbDrift linear infinite;
        }

        .orb1 { width: 340px; height: 340px; background: radial-gradient(#c07850, transparent); left: -80px; top: 10%; animation-duration: 28s; }
        .orb2 { width: 280px; height: 280px; background: radial-gradient(#5a7a9a, transparent); right: -60px; top: 30%; animation-duration: 34s; animation-delay: -12s; }
        .orb3 { width: 220px; height: 220px; background: radial-gradient(#a06878, transparent); left: 30%; bottom: 5%; animation-duration: 22s; animation-delay: -7s; }
        .orb4 { width: 180px; height: 180px; background: radial-gradient(#5a8a6a, transparent); right: 25%; top: 60%; animation-duration: 40s; animation-delay: -20s; }

        .particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation: particleFloat linear infinite;
        }

        .deco-ring, .deco-ring2 {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          animation: ringPulse 8s ease-in-out infinite;
        }

        .deco-ring {
          width: 320px;
          height: 320px;
          left: -120px;
          bottom: -100px;
          border: 1.5px solid var(--accent-l);
        }

        .deco-ring2 {
          width: 200px;
          height: 200px;
          right: -60px;
          top: 100px;
          border: 1px solid var(--accent-l);
          animation-duration: 9s;
          animation-delay: -3s;
        }

        .app { display: flex; height: 100vh; overflow: hidden; position: relative; z-index: 1; }

        .sidebar {
          width: var(--sb);
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border2);
          display: flex;
          flex-direction: column;

          transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.3s;
          position: relative;
          z-index: 20;
        }

        .sidebar.collapsed { width: var(--sb-col); }

        .sidebar-top {
          display: flex;
          align-items: center;
          padding: 18px 14px 16px;
          border-bottom: 1px solid var(--border);
          gap: 10px;
          min-height: 66px;
          flex-shrink: 0;
        }

        .sb-toggle {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s;
          border: none;
          background: none;
          padding: 0;
        }

        .sb-toggle:hover { background: var(--bg2); }

        .sb-toggle span {
          display: block;
          height: 1.5px;
          background: var(--text3);
          border-radius: 2px;
          transition: all 0.25s;
        }

        .sb-toggle .l1 { width: 14px; }
        .sb-toggle .l2 { width: 10px; }
        .sb-toggle .l3 { width: 12px; }
        .sidebar.collapsed .sb-toggle .l2,
        .sidebar.collapsed .sb-toggle .l3 { width: 14px; }

        .brand-text { overflow: hidden; white-space: nowrap; transition: opacity 0.2s, max-width 0.25s; max-width: 180px; }
        .sidebar.collapsed .brand-text { opacity: 0; max-width: 0; pointer-events: none; }

        .brand-name {
          font-family: "Playfair Display", serif;
          font-style: italic;
          font-weight: 700;
          font-size: 17px;
          color: var(--text);
          letter-spacing: 0.01em;
          line-height: 1.1;
        }

        .brand-name em { font-style: normal; color: #eca7ad; }

        .brand-tag {
          font-size: 9px;
          color: var(--text3);
          letter-spacing: 0.14em;
          font-weight: 500;
          margin-top: 1px;
          font-family: "Syne", sans-serif;
          text-transform: uppercase;
        }

        .sidebar-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
          display: flex;
          flex-direction: column;
        }

        .sidebar-body::-webkit-scrollbar { width: 0; }

        .sb-section-lbl {
          font-size: 8.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text3);
          font-family: "Syne", sans-serif;
          font-weight: 600;
          padding: 10px 10px 4px;
          overflow: hidden;
          white-space: nowrap;
          transition: color 0.2s;
          position: relative;
        }

        .sb-section-lbl::after {
          content: "";
          position: absolute;
          left: 2px;
          right: 2px;
          top: calc(50% + 3px);
          height: 1px;
          background: var(--border2);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .sidebar.collapsed .sb-section-lbl { 
          color: transparent; 
          pointer-events: none; 
        }

        .sidebar.collapsed .sb-section-lbl::after {
          opacity: 1;
        }

        .sb-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--text2);
          transition: all 0.15s;
          position: relative;
          white-space: nowrap;
          min-height: 40px;
          border: none;
          background: transparent;
          text-align: left;
          justify-content: flex-start;
        }

        .sidebar.collapsed .sb-item {
          padding: 8px 0;
          justify-content: center;
          gap: 0;
        }


        .sb-item:hover { background: var(--bg2); color: var(--text); }
        .sb-item.active { background: var(--accent-l); color: var(--text); }


        .sb-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          background: transparent;
          transition: background 0.15s;
        }

        .sb-item.active .sb-icon,
        .sb-item:hover .sb-icon { background: transparent; }

        .sb-lbl { overflow: hidden; transition: opacity 0.2s, max-width 0.2s; max-width: 160px; }
        .sidebar.collapsed .sb-lbl { opacity: 0; max-width: 0; pointer-events: none; }

        .ws-dot-sb { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .tmpl-badge {
          margin-left: auto;
          font-size: 8px;
          padding: 2px 6px;
          border-radius: 6px;
          background: var(--accent-l);
          color: var(--blue);
          font-family: "Syne", sans-serif;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex-shrink: 0;
          transition: opacity 0.2s;
        }

        .sidebar.collapsed .tmpl-badge { opacity: 0; max-width: 0; padding: 0; margin: 0; pointer-events: none; overflow: hidden; }

        .sidebar-footer { padding: 10px 8px; border-top: 1px solid var(--border); flex-shrink: 0; }

        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }

        .user-card:hover { background: var(--bg2); }

        .user-av {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent), var(--rose));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Syne", sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        .user-info-sb { overflow: hidden; transition: opacity 0.2s, max-width 0.2s; max-width: 160px; }
        .sidebar.collapsed .user-info-sb { opacity: 0; max-width: 0; pointer-events: none; }
        .user-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .user-plan { font-size: 10px; color: var(--text3); }

        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; position: relative; z-index: 1; }

        .topbar {
          height: 58px;
          flex-shrink: 0;
          background: var(--surface);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border2);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 12px;
          position: relative;
          z-index: 10;
        }

        .mobile-ham {
          display: none;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 1px solid var(--border2);
          background: var(--surface2);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }

        .mobile-ham span { display: block; width: 13px; height: 1.5px; background: var(--text2); border-radius: 2px; }

        .topbar-context { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
        .ctx-page { font-family: "Syne", sans-serif; font-weight: 700; font-size: 13px; color: var(--text); letter-spacing: 0.04em; }
        .ctx-sep { font-size: 11px; color: var(--border2); }
        .ctx-sub { font-size: 11px; color: var(--text3); font-weight: 400; }

        .devices-row { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .devices-sep { width: 1px; height: 14px; background: var(--border2); }

        .device-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          border: 1px solid var(--border2);
          background: var(--surface2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--text3);
          position: relative;
        }

        .device-icon.synced { border-color: var(--green); background: var(--accent-l); }
        .device-icon.synced::after {
          content: "";
          position: absolute;
          top: 2px;
          right: 2px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse 2s ease-in-out infinite;
        }

        .sync-wave { display: flex; align-items: center; gap: 2px; height: 14px; }
        .sw { width: 2.5px; border-radius: 2px; background: var(--green); animation: waveBar 1.2s ease-in-out infinite; }
        .sw:nth-child(1) { height: 6px; animation-delay: 0s; }
        .sw:nth-child(2) { height: 10px; animation-delay: 0.15s; }
        .sw:nth-child(3) { height: 14px; animation-delay: 0.3s; }
        .sw:nth-child(4) { height: 10px; animation-delay: 0.45s; }
        .sw:nth-child(5) { height: 6px; animation-delay: 0.6s; }

        .search-bar {
          flex: 1;
          max-width: 280px;
          height: 32px;
          border-radius: 20px;
          background: var(--bg2);
          border: 1px solid var(--border2);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          margin-left: auto;
        }

        .search-bar input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-family: "DM Sans", sans-serif;
          font-size: 12px;
          color: var(--text);
        }

        .search-bar input::placeholder { color: var(--text3); }
        .search-icon { font-size: 12px; color: var(--text3); }

        .new-btn {
          height: 32px;
          padding: 0 14px;
          border-radius: 9px;
          border: none;
          background: var(--text);
          color: var(--surface2);
          font-family: "Syne", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .new-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        .profile-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--rose));
          border: 2px solid var(--border);
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Syne", sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: white;
          position: relative;
          box-shadow: var(--shadow);
        }

        .online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #5a8a6a;
          border: 1.5px solid var(--surface);
          animation: pulse 2.5s ease-in-out infinite;
        }

        .notif-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--border2);
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.15s;
        }

        .notif-btn:hover {
          background: var(--bg2);
          transform: translateY(-1px);
        }

        .notif-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--rose);
          border: 2px solid var(--surface);
        }

        .mobile-search-btn {
          display: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border2);
          background: var(--surface);
          color: var(--text3);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mobile-search-btn:hover { background: var(--bg2); color: var(--text); }

        .search-cancel-btn {
          background: none;
          border: none;
          color: var(--blue);
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 4px;
          flex-shrink: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 240px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transform: translateY(-6px) scale(0.97);
          transition: opacity 0.2s, transform 0.2s;
          transform-origin: bottom left;
        }

        .profile-dropdown.open { opacity: 1; pointer-events: auto; transform: none; }

        .pd-header { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
        .pd-av {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent), var(--rose));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Syne", sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: white;
        }

        .pd-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .pd-email { font-size: 10px; color: var(--text3); }
        .pd-plan {
          display: inline-block;
          margin-top: 3px;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--accent-l);
          color: var(--accent);
          font-family: "Syne", sans-serif;
          letter-spacing: 0.06em;
        }

        .pd-section { padding: 8px; }

        .pd-item {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          cursor: pointer;
          transition: background 0.12s;
          font-size: 12px;
          font-weight: 500;
          color: var(--text2);
          text-align: left;
        }

        .pd-item:hover { background: var(--bg2); color: var(--text); }
        .pd-item-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--bg2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        .pd-divider { height: 1px; background: var(--border); margin: 2px 0; }
        .pd-item.danger { color: var(--rose); }

        .sidebar-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px; }
        .sidebar-body::-webkit-scrollbar { width: 4px; }
        .sidebar-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .content { flex: 1; overflow-y: auto; padding: 22px 26px; }
        .content::-webkit-scrollbar { width: 4px; }
        .content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

        .info-line { font-size: 12px; color: var(--text3); margin-bottom: 8px; }
        .error-line { font-size: 12px; color: #c0392b; margin-bottom: 8px; }

        .view-panel { display: none; }
        .view-panel.active { display: block; animation: fadeUp 0.3s both; }

        .stats-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }

        .stat-card {
          flex: 1;
          min-width: 180px;
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: var(--r);
          padding: 14px 16px;
          position: relative;
          overflow: hidden;
        }

        .stat-accent { position: absolute; top: 0; left: 0; right: 0; height: 2.5px; }
        .stat-label {
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text3);
          font-family: "Syne", sans-serif;
          font-weight: 600;
          margin-top: 3px;
        }

        .stat-value {
          font-family: "Playfair Display", serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          margin: 4px 0 2px;
          line-height: 1;
        }

        .stat-sub { font-size: 10px; color: var(--text3); }
        .stat-glyph {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 26px;
          opacity: 0.08;
        }

        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .section-title {
          font-family: "Syne", sans-serif;
          font-weight: 700;
          font-size: 12px;
          color: var(--text);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .section-count {
          font-size: 9px;
          color: var(--text3);
          background: var(--bg2);
          border: 1px solid var(--border2);
          border-radius: 10px;
          padding: 2px 8px;
          font-weight: 600;
          font-family: "Syne", sans-serif;
        }

        .section-action { margin-left: auto; font-size: 11px; color: var(--blue); cursor: pointer; }

        .filter-row { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

        .wsf-all {
          padding: 4px 12px;
          border-radius: 14px;
          border: 1px solid var(--border2);
          background: var(--surface);
          font-family: "Syne", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--text3);
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.15s;
        }
        .wsf-all.active { background: var(--text); color: var(--surface2); border-color: var(--text); }

        .wsf-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
          padding: 0;
        }
        .wsf-dot.active { border-color: var(--text); transform: scale(1.18); box-shadow: 0 0 0 2px var(--border2); }
        .wsf-dot:hover { transform: scale(1.12); }

        .ws-frame {
          border: 2px solid var(--frame);
          border-radius: var(--r-lg);
          padding: 20px;
          background: var(--surface);
          margin-bottom: 26px;
          position: relative;
          overflow: hidden;
        }

        .ws-frame::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: var(--r-lg);
          background: conic-gradient(
            from var(--angle, 0deg),
            transparent 60%,
            rgba(107, 163, 190, 0.4) 75%,
            transparent 90%
          );
          animation: frameSpin 8s linear infinite;
          mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
          mask-composite: xor;
          padding: 2px;
          pointer-events: none;
        }

        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .workspace-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

        .ws-card {
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s;
          position: relative;
          aspect-ratio: 4 / 3;
          box-shadow: var(--shadow-card);
          border: none;
          padding: 0;
          background: transparent;
          text-align: left;
        }

        .ws-card:hover { transform: translateY(-5px) scale(1.014); box-shadow: var(--shadow-lg); }
        .ws-card.pending { cursor: progress; }
        .ws-card.pending .ws-overlay { background: var(--bg2); opacity: 0.5; }

        .ws-delete-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, background 0.2s, color 0.2s;
          z-index: 10;
        }
        .ws-card:hover .ws-delete-btn { opacity: 1; }
        .ws-delete-btn:hover { background: #e74c3c; color: white; border-color: #e74c3c; }
        .ws-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 0.4s ease; }
        .ws-card:hover .ws-bg { transform: scale(1.05); }

        .ws-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0%, var(--bg2) 100%);
          backdrop-filter: blur(1px);
        }

        .ws-label-wrap { position: absolute; top: 0; left: 0; right: 0; padding: 14px 14px 10px; }

        .ws-label {
          background: var(--surface2);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          padding: 5px 14px;
          border-radius: 11px;
          font-family: "Syne", sans-serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--text);
          text-transform: uppercase;
          box-shadow: var(--shadow);
        }

        .ws-accent-strip { position: absolute; top: 0; left: 0; right: 0; height: 3px; }

        .ws-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 14px;
          background: linear-gradient(0deg, var(--bg) 0%, transparent 100%);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .ws-meta-txt { font-size: 10px; color: var(--text3); font-weight: 500; }
        .ws-tags { display: flex; gap: 5px; align-items: center; }

        .ws-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .wt {
          font-size: 8.5px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 7px;
          font-weight: 700;
          font-family: "Syne", sans-serif;
        }

        .ws-card-menu {
          position: absolute;
          top: 40px;
          right: 10px;
          width: 120px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          z-index: 20;
          overflow: hidden;
          animation: fadeUp 0.15s ease-out;
        }

        .ws-card-menu-item {
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: var(--text2);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.1s;
        }

        .ws-card-menu-item:hover { background: var(--bg2); color: var(--text); }
        .ws-card-menu-item.danger { color: var(--rose); border-top: 1px solid var(--border); }
        .ws-card-menu-item.danger:hover { background: var(--rose); color: white; }

        .wt.ta { background: var(--accent-l); color: var(--green); border: 1px solid var(--green); }

        .ws-add {
          border-radius: 20px;
          cursor: pointer;
          aspect-ratio: 4 / 3;
          border: 2px dashed var(--border2);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s;
        }

        .ws-add:hover { border-color: var(--frame); background: var(--accent-l); transform: translateY(-4px); }
        .ws-add-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px dashed var(--border2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: var(--text3);
        }

        .ws-add-txt {
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--text3);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .tmpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }

        .tmpl-card {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: var(--r);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .tmpl-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }

        .tmpl-preview {
          height: 130px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tmpl-preview-inner { width: 78%; display: flex; flex-direction: column; gap: 7px; }
        .tmpl-row {
          height: 9px;
          border-radius: 6px;
          background: var(--border2);
          animation: shimmerLoad 1.8s ease-in-out infinite;
        }

        .tmpl-body { padding: 14px 16px; }
        .tmpl-icon-wrap {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          margin-bottom: 10px;
          background: transparent;
        }

        .tmpl-name { font-family: "Syne", sans-serif; font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 4px; }
        .tmpl-desc { font-size: 11px; color: var(--text3); line-height: 1.55; margin-bottom: 14px; }

        .tmpl-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 12px; gap: 10px; }
        .tmpl-meta { font-size: 10px; color: var(--text3); }

        .tmpl-use-btn {
          padding: 6px 14px;
          border-radius: 20px;
          border: none;
          font-family: "Syne", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .device-panel { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r); overflow: hidden; margin-bottom: 28px; }
        .device-panel-header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .device-panel-title { font-family: "Syne", sans-serif; font-weight: 700; font-size: 12px; color: var(--text); letter-spacing: 0.06em; text-transform: uppercase; }
        .sync-status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--green); font-weight: 500; }
        .sync-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }
        
        .user-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 12px;
          background: var(--bg2);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          justify-content: flex-start;
        }
        .user-card:hover { background: var(--surface2); transform: translateY(-1px); box-shadow: var(--shadow); }
        
        .sidebar.collapsed .user-card {
          padding: 8px 0;
          justify-content: center;
        }


        .device-list { padding: 8px; }

        .device-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          transition: background 0.15s;
        }

        .device-item:hover { background: var(--bg2); }

        .device-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg2);
          border: 1px solid var(--border2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          position: relative;
        }

        .device-active-dot {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          border: 1.5px solid var(--surface);
        }

        .di-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .di-detail { font-size: 10px; color: var(--text3); margin-top: 1px; }

        .di-badge {
          margin-left: auto;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 8px;
          font-family: "Syne", sans-serif;
          letter-spacing: 0.06em;
          flex-shrink: 0;
        }

        .di-badge.current { background: var(--accent-l); color: var(--blue); }
        .di-badge.synced { background: var(--accent-l); color: var(--green); }
        .di-badge.offline { background: var(--border); color: var(--text3); }

        .di-sync-bar { width: 100%; height: 2px; background: var(--bg2); border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .di-sync-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--frame)); border-radius: 2px; animation: syncPulse 2s ease-in-out infinite; }

        .two-col { display: grid; grid-template-columns: 1fr 290px; gap: 16px; }

        .activity-list { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r); overflow: hidden; }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
        }

        .activity-item:last-child { border-bottom: none; }
        .activity-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .activity-info { flex: 1; }
        .activity-action { font-size: 12px; font-weight: 500; color: var(--text); }
        .activity-detail { font-size: 10px; color: var(--text3); margin-top: 1px; }
        .activity-time { font-size: 10px; color: var(--text3); flex-shrink: 0; }

        .quick-panel { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r); overflow: hidden; display: flex; flex-direction: column; }
        .quick-header { padding: 13px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .quick-title { font-family: "Syne", sans-serif; font-weight: 700; font-size: 12px; color: var(--text); letter-spacing: 0.06em; text-transform: uppercase; }

        .quick-add-btn {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          border: 1px solid var(--border2);
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: var(--text3);
        }

        .quick-notes { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 6px; }

        .quick-note {
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text);
          border-left: 3px solid var(--nc);
          background: var(--nb);
        }

        .qn-title {
          font-weight: 600;
          font-size: 10px;
          margin-bottom: 2px;
          color: var(--nc);
          font-family: "Syne", sans-serif;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: none;
          align-items: center;
          justify-content: center;
        }

        .overlay.show { display: flex; }

        .modal {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 24px;
          padding: 30px;
          width: min(440px, 92vw);
          box-shadow: var(--shadow-lg);
        }

        .modal-title {
          font-family: "Playfair Display", serif;
          font-size: 21px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }

        .modal-sub { font-size: 13px; color: var(--text3); margin-bottom: 22px; }
        .modal-label {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--text2);
          margin-bottom: 6px;
          font-family: "Syne", sans-serif;
          text-transform: uppercase;
        }

        .modal-input {
          width: 100%;
          height: 42px;
          border-radius: 50px;
          background: var(--bg2);
          border: 1.5px solid var(--border2);
          padding: 0 18px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          color: var(--text);
          outline: none;
          margin-bottom: 16px;
        }

        .color-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }

        .color-swatch {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          border: 2.5px solid transparent;
          transition: all 0.15s;
        }

        .color-swatch.sel { border-color: var(--text); transform: scale(1.12); }
        .color-swatch-add {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px dashed var(--border2);
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: var(--text3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0;
        }
        .color-swatch-add:hover { border-color: var(--frame); color: var(--frame); transform: scale(1.08); }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

        .btn-cancel {
          padding: 9px 20px;
          border-radius: 50px;
          border: 1px solid var(--border2);
          background: none;
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--text2);
          cursor: pointer;
          letter-spacing: 0.06em;
        }

        .btn-confirm {
          padding: 9px 24px;
          border-radius: 50px;
          border: none;
          background: var(--text);
          color: var(--surface2);
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .btn-confirm:disabled { opacity: 0.7; cursor: wait; }

        .toast {
          position: fixed;
          bottom: 22px;
          right: 22px;
          background: var(--text);
          color: var(--surface2);
          padding: 11px 18px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 500;
          box-shadow: var(--shadow-lg);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transform: translateY(8px);
          transition: opacity 0.25s, transform 0.25s;
        }

        .toast.show { opacity: 1; pointer-events: auto; transform: none; }

        .sb-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(2px);
          z-index: 45;
        }

        .sb-backdrop.visible { display: block; }

        @media (max-width: 1100px) {
          .workspace-grid, .tmpl-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 900px) {
          .two-col { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 50;
            transform: translateX(-100%);
            width: var(--sb) !important;
            box-shadow: var(--shadow-lg);
          }

          .sidebar.mobile-open { transform: translateX(0); }

          .sidebar.collapsed .brand-text,
          .sidebar.collapsed .sb-lbl,
          .sidebar.collapsed .sb-section-lbl,
          .sidebar.collapsed .user-info-sb,
          .sidebar.collapsed .tmpl-badge {
            opacity: 1 !important;
            max-width: 500px !important;
            pointer-events: auto !important;
            color: inherit !important;
            display: block !important;
          }
          .sidebar.collapsed .sb-item {
            justify-content: flex-start !important;
            padding: 8px 10px !important;
          }
          .sidebar.collapsed .sb-section-lbl::after {
            display: none !important;
          }
          .sidebar.collapsed .user-card {
            padding: 8px 10px !important;
            justify-content: flex-start !important;
          }

          .mobile-ham { display: flex; }
          .devices-row { display: none; }
          .topbar { 
            padding: 0 12px; 
            height: 54px;
            gap: 8px;
            justify-content: space-between;
          }
          .search-bar { display: none; }
          .search-bar.mobile-open {
            display: flex !important;
            flex: 1;
            max-width: none;
            animation: fadeUp 0.2s ease-out;
          }
          .mobile-search-btn { display: flex; }
          .topbar-context { flex: 1; margin-left: 4px; }
          .ctx-page { font-size: 14px; }
          .new-btn { 
            width: 34px; 
            padding: 0; 
            justify-content: center; 
            border-radius: 10px;
          }
          .new-btn span:last-child { display: none; }
          .header-actions { gap: 8px !important; }
          .content { padding: 16px; }
          .workspace-grid, .tmpl-grid { grid-template-columns: 1fr; }
        }

        @keyframes orbDrift {
          0% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 50px) scale(0.95); }
          75% { transform: translate(30px, 20px) scale(1.08); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @keyframes particleFloat {
          0% { opacity: 0; transform: translateY(0) scale(0); }
          10% { opacity: 0.35; }
          90% { opacity: 0.1; }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }

        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--border); }
          50% { box-shadow: 0 0 0 4px transparent; }
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @keyframes shimmerLoad {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes frameSpin {
          to { --angle: 360deg; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }

        @keyframes syncPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        /* Theme variable overrides are in themes.css — do not duplicate here */
      `}</style>

      <ProfileModal
        isVisible={profileModalVisible}
        userName={userName}
        fallbackInitials={initials(userName).slice(0, 2)}
        profile={profileSettings}
        passwordForm={passwordForm}
        passwordError={passwordError}
        passwordSuccess={passwordSuccess}
        onClose={handleCloseProfileModal}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
        onUpdatePassword={handleUpdatePassword}
        onSavePassword={handleSavePassword}
        isPasswordLoading={isPasswordLoading}
        emailVerifyStep={emailVerifyStep}
        emailOtpForm={emailOtpForm}
        isEmailVerifying={isEmailVerifying}
        emailVerifyError={emailVerifyError}
        onUpdateEmailOtp={setEmailOtpForm}
        onSendEmailOtp={handleSendEmailOtp}
        onConfirmEmailOtp={handleConfirmEmailOtp}
        isUpdating2FA={isUpdating2FA}
        onOpenPreferences={handleOpenPreferencesModal}
        apiKeys={apiKeys}
        userPlan={userPlan}
        apiKeyLimit={apiKeyLimit}
        newKeyName={newKeyName}
        isCreatingKey={isCreatingKey}
        apiKeyError={apiKeyError}
        createdKey={createdKey}
        onNewKeyNameChange={setNewKeyName}
        onCreateKey={handleCreateApiKey}
        onRevokeKey={handleRevokeApiKey}
        onDismissCreatedKey={handleDismissCreatedKey}
      />

      {preferencesModalVisible ? (
        <PreferencesModal
          isVisible={preferencesModalVisible}
          profile={profileSettings}
          onClose={() => setPreferencesModalVisible(false)}
          onUpdateProfile={handleUpdateProfile}
        />
      ) : null}
    </>
  );
}
