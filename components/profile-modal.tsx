"use client";

import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";

export type ProfileSettings = {
  avatarMode: "placeholder" | "url";
  avatarUrl: string;
  email: string;
  emailVerified: boolean;
  showEmail: boolean;
  timezone: string;
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: "authenticator" | "sms";
};

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileModalProps = {
  isVisible: boolean;
  userName: string;
  fallbackInitials: string;
  profile: ProfileSettings;
  passwordForm: PasswordForm;
  passwordError: string | null;
  passwordSuccess: string | null;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<ProfileSettings>) => void;
  onUpdatePassword: (field: keyof PasswordForm, value: string) => void;
  onSavePassword: () => void;
  
  isPasswordLoading?: boolean;
  
  emailVerifyStep?: "idle" | "otp";
  emailOtpForm?: string;
  isEmailVerifying?: boolean;
  emailVerifyError?: string | null;
  onUpdateEmailOtp?: (val: string) => void;
  onSendEmailOtp?: () => void;
  onConfirmEmailOtp?: () => void;
  
  isUpdating2FA?: boolean;
};

const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

function isValidImageUrl(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return email || "No email available";
  }

  if (local.length <= 2) {
    return `${local[0] ?? ""}•@${domain}`;
  }

  return `${local[0]}${"•".repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}@${domain}`;
}

function Toggle({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 min-w-[66px] items-center rounded-full border px-1 transition-[background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? "justify-end border-[rgba(111,142,163,0.48)] bg-[rgba(111,142,163,0.18)]"
          : "justify-start border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.84)]"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
          checked ? "bg-[#6f8ea3] text-white" : "bg-[rgba(221,224,231,0.96)] text-[#6a6e76]"
        }`}
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-[rgba(211,213,221,0.88)] bg-[rgba(255,255,255,0.8)] p-4 shadow-[0_10px_24px_rgba(57,53,49,0.08)] md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-[19px] font-medium tracking-[0.02em] text-[#5b5f67]">
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-6 text-[#747983]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export default function ProfileModal({
  isVisible,
  userName,
  fallbackInitials,
  profile,
  passwordForm,
  passwordError,
  passwordSuccess,
  onClose,
  onLogout,
  onUpdateProfile,
  onUpdatePassword,
  onSavePassword,
  isPasswordLoading = false,
  emailVerifyStep = "idle",
  emailOtpForm = "",
  isEmailVerifying = false,
  emailVerifyError = null,
  onUpdateEmailOtp,
  onSendEmailOtp,
  onConfirmEmailOtp,
  isUpdating2FA = false,
}: ProfileModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);

  const displayedEmail = useMemo(
    () => (profile.showEmail ? profile.email || "No email available" : maskEmail(profile.email)),
    [profile.email, profile.showEmail],
  );

  const avatarPreviewStyle = useMemo(() => {
    if (profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl)) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.16) 100%), url("${profile.avatarUrl}")`,
      };
    }

    return {};
  }, [profile.avatarMode, profile.avatarUrl]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      firstActionRef.current?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const currentIndex = activeElement ? focusable.indexOf(activeElement) : -1;

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1]?.focus();
        }
        return;
      }

      if (currentIndex === -1 || currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[140] flex items-center justify-center p-4 transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-[var(--dashboard-modal-overlay)] backdrop-blur-[10px]"
        onMouseDown={onClose}
      />

      <div
        ref={panelRef}
        id="dashboard-profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`dashboard-modal-scroll relative z-[1] flex max-h-[min(86vh,780px)] w-full max-w-[880px] flex-col overflow-hidden rounded-[32px] border bg-[var(--dashboard-modal-panel-base)] [background-image:var(--dashboard-modal-panel-gradient)] text-[#64666b] shadow-[var(--dashboard-modal-shadow)] transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.97] opacity-0"
        }`}
      >
        <div className="border-b border-[var(--dashboard-modal-border)] px-5 py-4 md:px-8 md:py-5">
          <div className="relative flex min-h-10 items-center justify-center">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
                Dashboard Profile
              </p>
              <h2
                id={titleId}
                className="mt-1 text-[28px] leading-none font-medium tracking-[0.04em] text-[#5d6168] [font-family:'Cinzel','Times_New_Roman',serif]"
              >
                {userName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.84)] text-[22px] leading-none text-[#656971] transition-colors duration-200 hover:bg-[rgba(246,247,250,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)]"
              aria-label="Close profile dialog"
            >
              ×
            </button>
          </div>
        </div>

        <div className="dashboard-modal-scroll flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
          <div className="space-y-6">
            <section aria-labelledby={`${titleId}-info`} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
                    Profile Information
                  </p>
                  <h3
                    id={`${titleId}-info`}
                    className="mt-1 text-[20px] font-medium tracking-[0.02em] text-[#5b5f67]"
                  >
                    Identity and visibility
                  </h3>
                </div>
                <span className="rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.78)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#767b86]">
                  2 options
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SectionCard
                  eyebrow="Profile Option 1"
                  title="Profile photo switch"
                  description="Preview the current avatar and switch between initials or an image URL."
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[24px] border border-[rgba(211,213,221,0.92)] bg-[radial-gradient(circle_at_30%_25%,#f2f2f2_0%,#dbdbdb_76%)] bg-cover bg-center text-[22px] font-semibold uppercase tracking-[0.08em] text-[#70747c] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ${
                        profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl)
                          ? "text-transparent"
                          : ""
                      }`}
                      style={avatarPreviewStyle}
                      aria-hidden="true"
                    >
                      {profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl)
                        ? "."
                        : fallbackInitials}
                    </div>

                    <div className="grid flex-1 gap-2">
                      <button
                        ref={firstActionRef}
                        type="button"
                        onClick={() =>
                          onUpdateProfile({
                            avatarMode: profile.avatarMode === "placeholder" ? "url" : "placeholder",
                          })
                        }
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.84)] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62666e] transition-colors duration-200 hover:bg-[rgba(246,247,250,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)]"
                      >
                        {profile.avatarMode === "placeholder" ? "Use image URL" : "Use initials"}
                      </button>
                      <p className="text-[12px] leading-5 text-[#7a7e87]">
                        {profile.avatarMode === "placeholder"
                          ? "The dashboard keeps a simple initials badge until you switch sources."
                          : "Paste an image URL to preview a custom photo on this device."}
                      </p>
                    </div>
                  </div>

                  {profile.avatarMode === "url" ? (
                    <label className="mt-4 grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                        Image URL
                      </span>
                      <input
                        value={profile.avatarUrl}
                        onChange={(event) => onUpdateProfile({ avatarUrl: event.target.value })}
                        placeholder="https://images.example.com/profile.jpg"
                        className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)]"
                      />
                    </label>
                  ) : null}
                </SectionCard>

                <SectionCard
                  eyebrow="Profile Option 2"
                  title="Email verification and visibility"
                  description="Control how your email appears in the dashboard and verify it locally for this mock flow."
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                          Current email
                        </p>
                        <p className="mt-2 text-[15px] font-medium text-[#5f6269]">
                          {displayedEmail}
                        </p>
                        <p className="mt-1 text-[12px] text-[#7a7e87]">
                          {profile.emailVerified ? "Status: verified" : "Status: not verified"}
                        </p>
                      </div>

                      {emailVerifyStep === "idle" && (
                        <button
                          type="button"
                          onClick={onSendEmailOtp}
                          disabled={profile.emailVerified || isEmailVerifying}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.84)] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62666e] transition-colors duration-200 hover:bg-[rgba(246,247,250,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)] disabled:cursor-default disabled:border-[rgba(111,142,163,0.38)] disabled:bg-[rgba(111,142,163,0.16)] disabled:text-[#617b8c]"
                        >
                          {profile.emailVerified ? "Verified" : isEmailVerifying ? "Sending..." : "Verify"}
                        </button>
                      )}
                    </div>
                    
                    {emailVerifyStep === "otp" && (
                      <div className="mt-2 rounded-[12px] border border-blue-200 bg-blue-50/50 p-4">
                        <p className="mb-3 text-[12px] text-blue-800">
                          We sent a 6-digit code to your email. Enter it below to verify.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={emailOtpForm}
                            onChange={(e) => onUpdateEmailOtp?.(e.target.value)}
                            className="h-9 w-32 rounded-[8px] border border-blue-200 bg-white px-3 text-[13px] tracking-widest text-[#5f6269] outline-none transition-colors duration-200 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20"
                          />
                          <button
                            type="button"
                            onClick={onConfirmEmailOtp}
                            disabled={emailOtpForm.length !== 6 || isEmailVerifying}
                            className="inline-flex h-9 items-center justify-center rounded-[8px] bg-blue-600 px-4 text-[12px] font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isEmailVerifying ? "Confirming..." : "Confirm"}
                          </button>
                        </div>
                        {emailVerifyError && (
                          <p className="mt-2 text-[12px] font-medium text-red-500">
                            {emailVerifyError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(211,213,221,0.82)] bg-[rgba(246,247,250,0.74)] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#747983]">
                        Show email
                      </p>
                      <p className="mt-1 text-[12px] text-[#7a7e87]">
                        Switch between full visibility and a masked address preview.
                      </p>
                    </div>
                    <Toggle
                      checked={profile.showEmail}
                      label={profile.showEmail ? "Hide email address" : "Show email address"}
                      onChange={(checked) => onUpdateProfile({ showEmail: checked })}
                    />
                  </div>
                </SectionCard>
              </div>
            </section>

            <section aria-labelledby={`${titleId}-preferences`} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
                    Preferences
                  </p>
                  <h3
                    id={`${titleId}-preferences`}
                    className="mt-1 text-[20px] font-medium tracking-[0.02em] text-[#5b5f67]"
                  >
                    Personal settings
                  </h3>
                </div>
                <span className="rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.78)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#767b86]">
                  2 options
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SectionCard
                  eyebrow="Profile Option 3"
                  title="Timezone"
                  description="Choose the timezone used when the dashboard reflects your local working context."
                >
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                      Selected timezone
                    </span>
                    <select
                      value={profile.timezone}
                      onChange={(event) => onUpdateProfile({ timezone: event.target.value })}
                      className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)]"
                    >
                      {TIMEZONE_OPTIONS.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </label>
                </SectionCard>

                <SectionCard
                  eyebrow="Profile Option 4"
                  title="Email notifications"
                  description="Decide whether dashboard updates and reminders should appear as email notifications."
                >
                  <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(211,213,221,0.82)] bg-[rgba(246,247,250,0.74)] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#747983]">
                        Notification status
                      </p>
                      <p className="mt-1 text-[12px] text-[#7a7e87]">
                        {profile.emailNotifications ? "Inbox updates are enabled." : "Inbox updates are paused."}
                      </p>
                    </div>
                    <Toggle
                      checked={profile.emailNotifications}
                      label={profile.emailNotifications ? "Disable email notifications" : "Enable email notifications"}
                      onChange={(checked) => onUpdateProfile({ emailNotifications: checked })}
                    />
                  </div>
                </SectionCard>
              </div>
            </section>

            <section aria-labelledby={`${titleId}-security`} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
                    Security
                  </p>
                  <h3
                    id={`${titleId}-security`}
                    className="mt-1 text-[20px] font-medium tracking-[0.02em] text-[#5b5f67]"
                  >
                    Access controls
                  </h3>
                </div>
                <span className="rounded-full border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.78)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#767b86]">
                  2 options
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SectionCard
                  eyebrow="Profile Option 5"
                  title="Password change"
                  description="Use client-side validation for a mock password update without touching backend credentials."
                >
                  <div className="grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                        Current password
                      </span>
                      <input
                        type="password"
                        name="current-pw-no-autofill"
                        autoComplete="new-password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => onUpdatePassword("currentPassword", event.target.value)}
                        className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)]"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                        New password
                      </span>
                      <input
                        type="password"
                        name="new-pw-no-autofill"
                        autoComplete="new-password"
                        value={passwordForm.newPassword}
                        onChange={(event) => onUpdatePassword("newPassword", event.target.value)}
                        className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)]"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                        Confirm password
                      </span>
                      <input
                        type="password"
                        name="confirm-pw-no-autofill"
                        autoComplete="new-password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => onUpdatePassword("confirmPassword", event.target.value)}
                        className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)]"
                      />
                    </label>
                    {passwordError ? (
                      <p className="rounded-[14px] border border-[rgba(217,100,100,0.28)] bg-[rgba(217,100,100,0.08)] px-3 py-2 text-[12px] text-[#a25454]">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordSuccess ? (
                      <p className="rounded-[14px] border border-[rgba(111,142,163,0.26)] bg-[rgba(111,142,163,0.1)] px-3 py-2 text-[12px] text-[#5e7588]">
                        {passwordSuccess}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onSavePassword}
                      disabled={isPasswordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[rgba(111,142,163,0.34)] bg-[rgba(111,142,163,0.14)] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5e7588] transition-colors duration-200 hover:bg-[rgba(111,142,163,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)] disabled:opacity-50"
                    >
                      {isPasswordLoading ? "Saving..." : "Update password"}
                    </button>
                  </div>
                </SectionCard>

                <SectionCard
                  eyebrow="Profile Option 6"
                  title="Two-factor auth"
                  description="Enable a local mock two-factor state and choose the preferred verification method."
                >
                  <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(211,213,221,0.82)] bg-[rgba(246,247,250,0.74)] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#747983]">
                        Protection
                      </p>
                      <p className="mt-1 text-[12px] text-[#7a7e87]">
                        {profile.twoFactorEnabled ? "Secondary verification is enabled." : "Secondary verification is disabled."}
                      </p>
                    </div>
                    <Toggle
                      checked={profile.twoFactorEnabled}
                      label={profile.twoFactorEnabled ? "Disable two-factor authentication" : "Enable two-factor authentication"}
                      disabled={isUpdating2FA}
                      onChange={(checked) => onUpdateProfile({ twoFactorEnabled: checked })}
                    />
                  </div>

                  <label className="mt-4 grid gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8f98]">
                      Method
                    </span>
                    <select
                      value={profile.twoFactorMethod}
                      onChange={(event) =>
                        onUpdateProfile({
                          twoFactorMethod: event.target.value as ProfileSettings["twoFactorMethod"],
                        })
                      }
                      disabled={!profile.twoFactorEnabled}
                      className="h-11 rounded-[16px] border border-[rgba(211,213,221,0.92)] bg-[rgba(255,255,255,0.88)] px-4 text-[13px] text-[#5f6269] outline-none transition-colors duration-200 focus:border-[rgba(118,123,134,0.54)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <option value="authenticator">Authenticator App</option>
                      <option value="sms">SMS</option>
                    </select>
                  </label>
                </SectionCard>
              </div>
            </section>

            <section aria-labelledby={`${titleId}-session`} className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]">
                  Session
                </p>
                <h3
                  id={`${titleId}-session`}
                  className="mt-1 text-[20px] font-medium tracking-[0.02em] text-[#5b5f67]"
                >
                  Sign out
                </h3>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex h-14 w-full items-center justify-center rounded-[22px] border border-[rgba(191,194,202,0.92)] bg-[rgba(255,255,255,0.82)] px-6 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#5f636b] shadow-[0_10px_20px_rgba(57,53,49,0.06)] transition-[background-color,border-color,transform] duration-200 hover:bg-[rgba(246,247,250,0.98)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-modal-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(244,245,248,0.98)]"
              >
                Log Out
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
