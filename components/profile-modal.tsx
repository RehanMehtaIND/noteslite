"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

export type ProfileSettings = {
  avatarMode: "placeholder" | "url" | "initials";
  avatarUrl: string;
  displayName?: string | null;
  email: string;
  emailVerified: boolean;
  showEmail: boolean;
  timezone: string;
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: "authenticator" | "sms" | "email";
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
  { value: "UTC", label: "UTC" },
  { value: "Asia/Kolkata", label: "IST — India Standard Time (UTC+5:30)" },
  { value: "America/New_York", label: "EST — Eastern Standard Time (UTC-5)" },
  { value: "America/Los_Angeles", label: "PST — Pacific Standard Time (UTC-8)" },
  { value: "Europe/London", label: "GMT — Greenwich Mean Time" },
  { value: "Europe/Berlin", label: "CET — Central European Time (UTC+1)" },
  { value: "Asia/Tokyo", label: "JST — Japan Standard Time (UTC+9)" }
] as const;

function isValidImageUrl(value: string) {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email || "No email available";
  if (local.length <= 2) return `${local[0] ?? ""}•@${domain}`;
  return `${local[0]}${"•".repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}@${domain}`;
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
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [imgUrlInput, setImgUrlInput] = useState(profile.avatarUrl);

  useEffect(() => {
    setImgUrlInput(profile.avatarUrl);
  }, [profile.avatarUrl]);

  const displayedEmail = useMemo(
    () => (profile.showEmail ? profile.email || "No email available" : maskEmail(profile.email)),
    [profile.email, profile.showEmail],
  );

  const nameParts = userName.split(/\s+/);
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";

  useEffect(() => {
    if (!isVisible) return;
    const focusFrame = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

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

  const applyImage = () => {
    if (!imgUrlInput.trim()) return;
    onUpdateProfile({ avatarUrl: imgUrlInput, avatarMode: "url" });
  };

  const pwStrength = useMemo(() => {
    const val = passwordForm.newPassword;
    let score = 0;
    if (!val) return { score: 0, pct: 0, color: '', label: '' };
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const pct = (score / 4) * 100;
    const colors = ['#E24B4A','#EF9F27','#63B927','#1D9E75'];
    const labels = ['Weak','Fair','Good','Strong'];
    return { score, pct, color: colors[score - 1] || '#E24B4A', label: labels[score - 1] || 'Weak' };
  }, [passwordForm.newPassword]);

  const pwMatch = useMemo(() => {
    if (!passwordForm.confirmPassword) return null;
    return passwordForm.newPassword === passwordForm.confirmPassword;
  }, [passwordForm.newPassword, passwordForm.confirmPassword]);

  const canSavePassword = 
    passwordForm.currentPassword && 
    passwordForm.newPassword.length >= 8 && 
    pwMatch && 
    !isPasswordLoading;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .pm-root {
          --pm-cream: #F2EFE9;
          --pm-cream-deep: #E8E3DA;
          --pm-cream-card: #FAFAF8;
          --pm-ink: #1C1A17;
          --pm-ink-muted: #6B6760;
          --pm-ink-faint: #A09D98;
          --pm-border: rgba(28,26,23,0.1);
          --pm-border-strong: rgba(28,26,23,0.18);
          --pm-teal: #0F6E56;
          --pm-teal-bg: #E1F5EE;
          --pm-amber: #854F0B;
          --pm-amber-bg: #FAEEDA;
          --pm-purple: #534AB7;
          --pm-purple-bg: #EEEDFE;
          --pm-red: #A32D2D;
          --pm-red-bg: #FCEBEB;
          --pm-blue: #185FA5;
          --pm-blue-bg: #E6F1FB;
          --pm-radius-sm: 8px;
          --pm-radius-md: 12px;
          --pm-radius-lg: 18px;
          --pm-shadow-card: 0 1px 3px rgba(28,26,23,0.06), 0 0 0 0.5px rgba(28,26,23,0.08);
        }

        .pm-backdrop {
          position: fixed; inset: 0; background: rgba(28,26,23,0.35); z-index: 140;
          display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px;
          overflow-y: auto; opacity: 0; pointer-events: none; transition: opacity 0.25s cubic-bezier(0.22,1,0.36,1);
          font-family: 'DM Sans', sans-serif;
        }
        .pm-backdrop.pm-show { opacity: 1; pointer-events: auto; }

        .pm-modal {
          background: var(--pm-cream); border-radius: 20px; width: 100%; max-width: 740px;
          box-shadow: 0 24px 80px rgba(28,26,23,0.22), 0 0 0 0.5px rgba(28,26,23,0.1);
          overflow: hidden; position: relative;
          transform: translateY(16px) scale(0.98); transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
        }
        .pm-backdrop.pm-show .pm-modal { transform: translateY(0) scale(1); }

        .pm-modal-header {
          background: var(--pm-cream); padding: 28px 32px 20px; border-bottom: 0.5px solid var(--pm-border);
          position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
        }

        .pm-modal-header-left { display: flex; flex-direction: column; gap: 2px; }

        .pm-modal-eyebrow { font-size: 10px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pm-ink-faint); }

        .pm-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--pm-ink); letter-spacing: -0.02em; line-height: 1; }
        .pm-modal-title em { font-style: italic; font-weight: 400; }

        .pm-close-btn {
          width: 34px; height: 34px; border-radius: 50%; border: 0.5px solid var(--pm-border-strong);
          background: var(--pm-cream-card); cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: var(--pm-ink-muted); font-size: 16px; transition: background 0.15s, color 0.15s; flex-shrink: 0; outline: none;
        }
        .pm-close-btn:hover, .pm-close-btn:focus-visible { background: var(--pm-cream-deep); color: var(--pm-ink); }

        .pm-modal-body { padding: 28px 32px 36px; display: flex; flex-direction: column; gap: 32px; }

        .pm-section { display: flex; flex-direction: column; gap: 12px; }
        .pm-section-header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .pm-section-meta { display: flex; flex-direction: column; gap: 3px; }

        .pm-section-label { font-size: 10px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pm-ink-faint); }
        .pm-section-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: var(--pm-ink); letter-spacing: -0.01em; }
        .pm-section-count { font-size: 11px; font-weight: 500; color: var(--pm-ink-faint); background: var(--pm-cream-deep); border: 0.5px solid var(--pm-border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

        .pm-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) {
          .pm-modal-body { padding: 20px 20px 28px; }
          .pm-modal-header { padding: 20px 20px 16px; }
          .pm-cards-grid { grid-template-columns: 1fr; }
        }

        .pm-card {
          background: var(--pm-cream-card); border-radius: var(--pm-radius-lg); border: 0.5px solid var(--pm-border);
          padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--pm-shadow-card);
        }

        .pm-card-head { display: flex; flex-direction: column; gap: 6px; }
        .pm-card-badge { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pm-ink-faint); }
        .pm-card-title { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 400; color: var(--pm-ink); letter-spacing: -0.01em; line-height: 1.2; }
        .pm-card-desc { font-size: 12.5px; color: var(--pm-ink-muted); line-height: 1.6; }

        .pm-field-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pm-ink-faint); margin-bottom: 6px; }

        .pm-input, .pm-select {
          width: 100%; background: var(--pm-cream); border: 0.5px solid var(--pm-border-strong);
          border-radius: var(--pm-radius-sm); padding: 9px 12px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; color: var(--pm-ink); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none; -webkit-appearance: none;
        }
        .pm-input:focus, .pm-select:focus { border-color: var(--pm-purple); box-shadow: 0 0 0 3px rgba(83,74,183,0.1); }
        .pm-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6760' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; cursor: pointer;
        }

        .pm-avatar-row { display: flex; align-items: center; gap: 14px; }
        .pm-avatar {
          width: 54px; height: 54px; border-radius: 50%; background: var(--pm-purple-bg); display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: var(--pm-purple);
          border: 1.5px solid rgba(83,74,183,0.3); flex-shrink: 0; transition: box-shadow 0.15s; cursor: pointer; position: relative; overflow: hidden;
        }
        .pm-avatar:hover, .pm-avatar:focus-visible { box-shadow: 0 0 0 4px rgba(83,74,183,0.12); outline: none; }
        .pm-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .pm-avatar-hint { font-size: 12px; color: var(--pm-ink-muted); line-height: 1.5; white-space: pre-wrap; }

        .pm-url-row { display: flex; gap: 8px; align-items: center; }
        .pm-url-row .pm-input { flex: 1; }

        .pm-btn {
          border: 0.5px solid var(--pm-border-strong); background: var(--pm-cream-card); border-radius: var(--pm-radius-sm);
          padding: 9px 14px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--pm-ink-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; outline: none;
        }
        .pm-btn:hover:not(:disabled), .pm-btn:focus-visible:not(:disabled) { background: var(--pm-cream-deep); color: var(--pm-ink); border-color: var(--pm-border-strong); }
        .pm-btn:active:not(:disabled) { transform: scale(0.98); }
        .pm-btn-primary { background: var(--pm-ink); color: var(--pm-cream); border-color: var(--pm-ink); }
        .pm-btn-primary:hover:not(:disabled), .pm-btn-primary:focus-visible:not(:disabled) { background: #2d2b27; color: var(--pm-cream); }
        .pm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .pm-btn-full { width: 100%; text-align: center; justify-content: center; }

        .pm-email-status-row {
          display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px;
          background: var(--pm-cream); border-radius: var(--pm-radius-sm); border: 0.5px solid var(--pm-border);
        }
        .pm-email-addr { font-size: 13px; color: var(--pm-ink); font-weight: 400; }
        .pm-email-sub { font-size: 11px; color: var(--pm-ink-muted); margin-top: 2px; }
        .pm-verified-chip {
          font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; background: var(--pm-teal-bg);
          color: var(--pm-teal); border: 0.5px solid rgba(15,110,86,0.2); border-radius: 20px; padding: 4px 10px; flex-shrink: 0;
        }

        .pm-toggle-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
          background: var(--pm-cream); border-radius: var(--pm-radius-sm); border: 0.5px solid var(--pm-border);
        }
        .pm-toggle-info { flex: 1; }
        .pm-toggle-title { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pm-ink-muted); }
        .pm-toggle-sub { font-size: 12px; color: var(--pm-ink-faint); margin-top: 2px; }

        .pm-toggle {
          width: 42px; height: 24px; border-radius: 12px; background: var(--pm-cream-deep); border: 0.5px solid var(--pm-border-strong);
          cursor: pointer; position: relative; transition: background 0.2s, border-color 0.2s; flex-shrink: 0; outline: none;
        }
        .pm-toggle:focus-visible { box-shadow: 0 0 0 3px rgba(83,74,183,0.1); }
        .pm-toggle::after {
          content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2); top: 2.5px; left: 2.5px; transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .pm-toggle.pm-on { background: var(--pm-teal); border-color: transparent; }
        .pm-toggle.pm-on::after { transform: translateX(18px); }

        .pm-toggle-status { font-size: 10px; font-weight: 500; letter-spacing: 0.08em; min-width: 22px; text-align: center; color: var(--pm-ink-faint); transition: color 0.15s; }
        .pm-toggle.pm-on + .pm-toggle-status { color: var(--pm-teal); }

        .pm-pw-strength-bar { height: 3px; background: var(--pm-cream-deep); border-radius: 2px; overflow: hidden; margin-top: 4px; }
        .pm-pw-strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
        .pm-pw-strength-label { font-size: 11px; color: var(--pm-ink-faint); margin-top: 4px; min-height: 16px; transition: color 0.3s; }
        .pm-match-indicator { font-size: 11px; margin-top: 4px; min-height: 16px; transition: color 0.3s; }

        .pm-tfa-badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .pm-method-chip {
          font-size: 11px; font-weight: 500; padding: 5px 12px; border-radius: 20px; border: 0.5px solid var(--pm-border-strong);
          background: var(--pm-cream); color: var(--pm-ink-muted); cursor: pointer; transition: all 0.15s; outline: none;
        }
        .pm-method-chip:focus-visible { box-shadow: 0 0 0 3px rgba(83,74,183,0.1); }
        .pm-method-chip.pm-active { background: var(--pm-purple-bg); color: var(--pm-purple); border-color: rgba(83,74,183,0.3); }

        .pm-logout-card { background: var(--pm-cream-card); border-radius: var(--pm-radius-lg); border: 0.5px solid var(--pm-border); padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: var(--pm-shadow-card); }
        @media (max-width: 480px) { .pm-logout-card { flex-direction: column; align-items: flex-start; } .pm-btn-logout { width: 100%; text-align: center; } }
        .pm-logout-meta { display: flex; flex-direction: column; gap: 4px; }
        .pm-logout-title { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 400; color: var(--pm-ink); }
        .pm-logout-sub { font-size: 12.5px; color: var(--pm-ink-muted); line-height: 1.5; }
        .pm-btn-logout {
          border: 0.5px solid rgba(163,45,45,0.3); background: var(--pm-red-bg); color: var(--pm-red); font-size: 12px; font-weight: 500;
          letter-spacing: 0.05em; text-transform: uppercase; padding: 9px 18px; border-radius: var(--pm-radius-sm); cursor: pointer;
          transition: all 0.15s; white-space: nowrap; font-family: 'DM Sans', sans-serif; outline: none;
        }
        .pm-btn-logout:hover, .pm-btn-logout:focus-visible { background: #f7c1c1; border-color: rgba(163,45,45,0.5); }
        .pm-btn-logout:active { transform: scale(0.98); }
      `}</style>
      
      <div className={`pm-root pm-backdrop ${isVisible ? 'pm-show' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="pm-modal" ref={panelRef} role="dialog" aria-labelledby={titleId} aria-modal="true">
          
          <div className="pm-modal-header">
            <div className="pm-modal-header-left">
              <span className="pm-modal-eyebrow">Dashboard Profile</span>
              <h1 id={titleId} className="pm-modal-title"><em>{firstName}</em> {lastName}</h1>
            </div>
            <button ref={closeBtnRef} className="pm-close-btn" onClick={onClose} aria-label="Close">&#x2715;</button>
          </div>

          <div className="pm-modal-body">
            
            <div className="pm-section">
              <div className="pm-section-header">
                <div className="pm-section-meta">
                  <span className="pm-section-label">Profile Information</span>
                  <h2 className="pm-section-title">Identity and visibility</h2>
                </div>
                <span className="pm-section-count">2 options</span>
              </div>
              <div className="pm-cards-grid">
                
                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Avatar</span>
                    <h3 className="pm-card-title">Profile photo</h3>
                    <p className="pm-card-desc">Use initials or switch to a custom image URL for your avatar.</p>
                  </div>
                  <div className="pm-avatar-row">
                    <div 
                      className="pm-avatar" 
                      onClick={() => onUpdateProfile({ avatarMode: profile.avatarMode === "url" ? "placeholder" : "url" })}
                      title={profile.avatarMode === "url" ? "Switch to Initials" : "Switch to Custom Image"}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUpdateProfile({ avatarMode: profile.avatarMode === "url" ? "placeholder" : "url" }); }}}
                    >
                      {profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl) ? (
                        <img src={profile.avatarUrl} className="pm-avatar-img" alt="Profile photo" />
                      ) : (
                        <span>{fallbackInitials}</span>
                      )}
                    </div>
                    <span className="pm-avatar-hint">
                      {profile.avatarMode === "url" && isValidImageUrl(profile.avatarUrl) 
                        ? "Showing image avatar." 
                        : "Showing initials badge.\nSwitch to an image below."}
                    </span>
                  </div>
                  <div>
                    <div className="pm-field-label">Image URL</div>
                    <div className="pm-url-row">
                      <input 
                        type="url" 
                        className="pm-input" 
                        placeholder="https://example.com/photo.jpg" 
                        value={imgUrlInput}
                        onChange={(e) => setImgUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyImage()}
                      />
                      <button className="pm-btn pm-btn-primary" onClick={applyImage}>Apply</button>
                    </div>
                  </div>
                </div>

                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Email</span>
                    <h3 className="pm-card-title">Verification and visibility</h3>
                    <p className="pm-card-desc">Control how your email appears and verify it for this session.</p>
                  </div>
                  <div>
                    <div className="pm-field-label">Current email</div>
                    <div className="pm-email-status-row">
                      <div>
                        <div className="pm-email-addr">{displayedEmail}</div>
                        <div className="pm-email-sub">Status: {profile.emailVerified ? "verified" : "unverified"}</div>
                      </div>
                      {profile.emailVerified ? (
                        <span className="pm-verified-chip">Verified</span>
                      ) : emailVerifyStep === "idle" ? (
                        <button className="pm-btn pm-btn-primary" onClick={onSendEmailOtp} disabled={isEmailVerifying} style={{ padding: '4px 10px', fontSize: '10px' }}>
                          {isEmailVerifying ? "Sending..." : "Verify"}
                        </button>
                      ) : null}
                    </div>
                    {emailVerifyStep === "otp" && !profile.emailVerified && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'var(--pm-cream)', border: '0.5px solid var(--pm-border)', borderRadius: 'var(--pm-radius-sm)' }}>
                        <div className="pm-field-label">Enter 6-digit code</div>
                        <div className="pm-url-row">
                          <input 
                            type="text" 
                            className="pm-input" 
                            maxLength={6} 
                            placeholder="123456" 
                            value={emailOtpForm}
                            onChange={(e) => onUpdateEmailOtp?.(e.target.value)}
                          />
                          <button className="pm-btn pm-btn-primary" onClick={onConfirmEmailOtp} disabled={emailOtpForm.length !== 6 || isEmailVerifying}>
                            {isEmailVerifying ? "..." : "Confirm"}
                          </button>
                        </div>
                        {emailVerifyError && <div style={{ color: 'var(--pm-red)', fontSize: '11px', marginTop: '6px' }}>{emailVerifyError}</div>}
                      </div>
                    )}
                  </div>
                  <div className="pm-toggle-row" style={{ marginTop: 'auto' }}>
                    <div className="pm-toggle-info">
                      <div className="pm-toggle-title">Show email</div>
                      <div className="pm-toggle-sub">{profile.showEmail ? "Full address visible" : "Address is masked"}</div>
                    </div>
                    <button 
                      className={`pm-toggle ${profile.showEmail ? 'pm-on' : ''}`} 
                      onClick={() => onUpdateProfile({ showEmail: !profile.showEmail })}
                      aria-label="Toggle email visibility"
                    ></button>
                    <span className="pm-toggle-status">{profile.showEmail ? 'ON' : 'OFF'}</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="pm-section">
              <div className="pm-section-header">
                <div className="pm-section-meta">
                  <span className="pm-section-label">Preferences</span>
                  <h2 className="pm-section-title">Personal settings</h2>
                </div>
                <span className="pm-section-count">2 options</span>
              </div>
              <div className="pm-cards-grid">
                
                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Timezone</span>
                    <h3 className="pm-card-title">Local time context</h3>
                    <p className="pm-card-desc">Choose the timezone for dashboard timestamps and reminders.</p>
                  </div>
                  <div>
                    <div className="pm-field-label">Selected timezone</div>
                    <select 
                      className="pm-select"
                      value={profile.timezone}
                      onChange={(e) => onUpdateProfile({ timezone: e.target.value })}
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Notifications</span>
                    <h3 className="pm-card-title">Email notifications</h3>
                    <p className="pm-card-desc">Decide whether updates and reminders arrive in your inbox.</p>
                  </div>
                  <div className="pm-toggle-row" style={{ marginTop: 'auto' }}>
                    <div className="pm-toggle-info">
                      <div className="pm-toggle-title">Notification status</div>
                      <div className="pm-toggle-sub">{profile.emailNotifications ? "Inbox updates are enabled" : "Notifications are paused"}</div>
                    </div>
                    <button 
                      className={`pm-toggle ${profile.emailNotifications ? 'pm-on' : ''}`} 
                      onClick={() => onUpdateProfile({ emailNotifications: !profile.emailNotifications })}
                      aria-label="Toggle notifications"
                    ></button>
                    <span className="pm-toggle-status">{profile.emailNotifications ? 'ON' : 'OFF'}</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="pm-section">
              <div className="pm-section-header">
                <div className="pm-section-meta">
                  <span className="pm-section-label">Security</span>
                  <h2 className="pm-section-title">Access controls</h2>
                </div>
                <span className="pm-section-count">2 options</span>
              </div>
              <div className="pm-cards-grid">
                
                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Password</span>
                    <h3 className="pm-card-title">Password change</h3>
                    <p className="pm-card-desc">Update your credentials with client-side validation.</p>
                  </div>
                  <div>
                    <div className="pm-field-label">Current password</div>
                    <input 
                      type="password" 
                      className="pm-input" 
                      placeholder="Enter current password" 
                      value={passwordForm.currentPassword}
                      onChange={(e) => onUpdatePassword("currentPassword", e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="pm-field-label">New password</div>
                    <input 
                      type="password" 
                      className="pm-input" 
                      placeholder="Min. 8 characters" 
                      value={passwordForm.newPassword}
                      onChange={(e) => onUpdatePassword("newPassword", e.target.value)}
                    />
                    <div className="pm-pw-strength-bar"><div className="pm-pw-strength-fill" style={{ width: `${pwStrength.pct}%`, background: pwStrength.color }}></div></div>
                    <div className="pm-pw-strength-label" style={{ color: pwStrength.color }}>{passwordForm.newPassword ? pwStrength.label : ''}</div>
                  </div>
                  <div>
                    <div className="pm-field-label">Confirm password</div>
                    <input 
                      type="password" 
                      className="pm-input" 
                      placeholder="Repeat new password" 
                      value={passwordForm.confirmPassword}
                      onChange={(e) => onUpdatePassword("confirmPassword", e.target.value)}
                    />
                    <div className="pm-match-indicator" style={{ color: pwMatch === true ? 'var(--pm-teal)' : pwMatch === false ? 'var(--pm-red)' : '' }}>
                      {pwMatch === true ? 'Passwords match' : pwMatch === false ? 'Passwords do not match' : ''}
                    </div>
                  </div>
                  {passwordError && <div style={{ color: 'var(--pm-red)', fontSize: '11px', textAlign: 'center' }}>{passwordError}</div>}
                  {passwordSuccess && <div style={{ color: 'var(--pm-teal)', fontSize: '11px', textAlign: 'center' }}>{passwordSuccess}</div>}
                  <button 
                    className="pm-btn pm-btn-primary pm-btn-full" 
                    onClick={onSavePassword} 
                    disabled={!canSavePassword}
                  >
                    {isPasswordLoading ? "Updating..." : "Update password"}
                  </button>
                </div>

                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">2FA</span>
                    <h3 className="pm-card-title">Two-factor auth</h3>
                    <p className="pm-card-desc">Add a second layer of verification to your account.</p>
                  </div>
                  <div className="pm-toggle-row">
                    <div className="pm-toggle-info">
                      <div className="pm-toggle-title">Protection</div>
                      <div className="pm-toggle-sub">{profile.twoFactorEnabled ? "Secondary verification is enabled" : "Secondary verification is disabled"}</div>
                    </div>
                    <button 
                      className={`pm-toggle ${profile.twoFactorEnabled ? 'pm-on' : ''}`} 
                      onClick={() => !isUpdating2FA && onUpdateProfile({ twoFactorEnabled: !profile.twoFactorEnabled })}
                      disabled={isUpdating2FA}
                      style={{ opacity: isUpdating2FA ? 0.5 : 1 }}
                      aria-label="Toggle 2FA"
                    ></button>
                    <span className="pm-toggle-status">{profile.twoFactorEnabled ? 'ON' : 'OFF'}</span>
                  </div>
                  <div style={{ opacity: profile.twoFactorEnabled ? 1 : 0.35, pointerEvents: profile.twoFactorEnabled ? 'auto' : 'none', transition: 'opacity 0.2s', marginTop: 'auto' }}>
                    <div className="pm-field-label">Method</div>
                    <div className="pm-tfa-badge-row">
                      {(["authenticator", "sms", "email"] as const).map(method => (
                        <button 
                          key={method}
                          className={`pm-method-chip ${profile.twoFactorMethod === method ? 'pm-active' : ''}`} 
                          onClick={() => onUpdateProfile({ twoFactorMethod: method })}
                        >
                          {method === 'authenticator' ? 'Authenticator App' : method === 'sms' ? 'SMS' : 'Email'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="pm-section">
              <div className="pm-section-header" style={{ marginBottom: '-4px' }}>
                <div className="pm-section-meta">
                  <span className="pm-section-label">Session</span>
                  <h2 className="pm-section-title">Sign out</h2>
                </div>
              </div>
              <div className="pm-logout-card">
                <div className="pm-logout-meta">
                  <h3 className="pm-logout-title">End this session</h3>
                  <p className="pm-logout-sub">You will be returned to the login screen. Unsaved changes may be lost.</p>
                </div>
                <button className="pm-btn-logout" onClick={onLogout}>Log out</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
