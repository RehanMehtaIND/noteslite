"use client";

import { useEffect, useState, useRef } from "react";
import EmojiIcon from "./emoji-icon";
import { type ProfileSettings } from "./profile-modal";

type PreferencesModalProps = {
  isVisible: boolean;
  profile: ProfileSettings;
  onClose: () => void;
  onUpdateProfile: (updates: Partial<ProfileSettings>) => void;
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

export default function PreferencesModal({ isVisible, profile, onClose, onUpdateProfile }: PreferencesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isVisible, onClose]);

  if (!profile) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        
        .pref-root {
          --pm-cream: #F2EFE9;
          --pm-cream-deep: #E8E3DA;
          --pm-cream-card: #FAFAF8;
          --pm-ink: #1C1A17;
          --pm-ink-muted: #6B6760;
          --pm-ink-faint: #A09D98;
          --pm-border: rgba(28,26,23,0.1);
          --pm-border-strong: rgba(28,26,23,0.18);
          --pm-purple: #534AB7;
          --pm-purple-bg: #EEEDFE;
          --pm-teal: #0F6E56;
          --pm-radius-md: 12px;
          --pm-radius-lg: 18px;
          --pm-shadow-card: 0 1px 3px rgba(28,26,23,0.06), 0 0 0 0.5px rgba(28,26,23,0.08);
        }

        .pm-backdrop {
          position: fixed; inset: 0; background: var(--dashboard-modal-overlay); z-index: 140;
          display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px;
          overflow-y: auto; opacity: 0; pointer-events: none; transition: opacity 0.25s cubic-bezier(0.22,1,0.36,1);
          font-family: 'DM Sans', sans-serif;
        }
        .pm-backdrop.pm-show { opacity: 1; pointer-events: auto; }

        .pm-modal {
          background: var(--pm-cream); border-radius: 20px; width: 100%; max-width: 740px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.22), 0 0 0 0.5px var(--pm-border);
          overflow: hidden; position: relative;
          transform: translateY(16px) scale(0.98); transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
        }
        .pm-backdrop.pm-show .pm-modal { transform: translateY(0) scale(1); }

        .pm-modal-header {
          background: var(--pm-cream); padding: 28px 32px 20px; border-bottom: 0.5px solid var(--pm-border);
          position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
        }
        .pm-modal-title-area { display: flex; flex-direction: column; gap: 4px; }
        .pm-modal-eyebrow { font-size: 10px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pm-ink-faint); }
        .pm-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--pm-ink); letter-spacing: -0.02em; line-height: 1; }

        .pm-close-btn {
          width: 34px; height: 34px; border-radius: 50%; border: 0.5px solid var(--pm-border-strong);
          background: var(--pm-cream-card); cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: var(--pm-ink-muted); font-size: 16px; transition: background 0.15s, color 0.15s; flex-shrink: 0; outline: none;
        }
        .pm-close-btn:hover { background: var(--pm-cream-deep); color: var(--pm-ink); }

        .pm-modal-body { padding: 28px 32px 36px; display: flex; flex-direction: column; gap: 32px; }

        .pref-section { display: flex; flex-direction: column; gap: 16px; }
        .pref-section-header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 0.5px solid var(--pm-border); padding-bottom: 12px; }
        .pref-section-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: var(--pm-ink); }
        .pref-section-meta { font-size: 11px; font-weight: 500; color: var(--pm-ink-faint); background: var(--pm-cream-deep); border-radius: 20px; padding: 3px 12px; }

        .pref-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        @media (max-width: 850px) { .pref-grid { grid-template-columns: 1fr; } }

        .pm-card {
          background: var(--pm-cream-card); border-radius: var(--pm-radius-lg); border: 0.5px solid var(--pm-border);
          padding: 24px; display: flex; flex-direction: column; gap: 20px; box-shadow: var(--pm-shadow-card);
        }
        .pm-card-head { display: flex; flex-direction: column; gap: 6px; }
        .pm-card-badge { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pm-ink-faint); }
        .pm-card-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: var(--pm-ink); }
        .pm-card-desc { font-size: 13.5px; color: var(--pm-ink-muted); line-height: 1.6; }

        .pm-theme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pm-theme-option {
          cursor: pointer; border-radius: var(--pm-radius-md); border: 2px solid transparent;
          padding: 10px; transition: all 0.2s; background: var(--pm-cream-card);
          display: flex; flex-direction: column; gap: 8px; align-items: center;
          box-shadow: var(--pm-shadow-card);
        }
        .pm-theme-option:hover { border-color: var(--pm-border-strong); }
        .pm-theme-option.pm-active { border-color: var(--pm-purple); background: var(--pm-purple-bg); }
        .pm-theme-preview { width: 100%; height: 44px; border-radius: 6px; border: 0.5px solid var(--pm-border); position: relative; overflow: hidden; }
        .pm-theme-preview.standard { background: #F2EFE9; }
        .pm-theme-preview.dark { background: #1A1A1A; }
        .pm-theme-preview.space { background: linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%); overflow: hidden; }
        .pm-theme-preview.space::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(white 1px, transparent 0); background-size: 10px 10px; opacity: 0.2; }
        .pm-theme-name { font-size: 12px; font-weight: 500; color: var(--pm-ink); }

        .pm-bg-preview-container {
          width: 100%; height: 160px; border-radius: var(--pm-radius-md);
          border: 1px dashed var(--pm-border-strong); background: var(--pm-cream);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; position: relative; cursor: pointer; transition: all 0.2s;
        }
        .pm-bg-preview-container:hover { border-color: var(--pm-purple); background: var(--pm-cream-deep); }
        .pm-bg-preview-img { width: 100%; height: 100%; object-fit: cover; }
        
        .pm-field-label { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pm-ink-faint); margin-bottom: 6px; }
        .pm-select {
          width: 100%; background: var(--pm-cream); border: 0.5px solid var(--pm-border-strong);
          border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--pm-ink); outline: none;
          appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6760' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; cursor: pointer;
        }
        .pm-select:focus { border-color: var(--pm-purple); box-shadow: 0 0 0 3px var(--pm-purple-bg); }

        .pm-toggle-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px;
          background: var(--pm-cream); border-radius: 12px; border: 0.5px solid var(--pm-border);
        }
        .pm-toggle-info { flex: 1; }
        .pm-toggle-title { font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pm-ink-muted); }
        .pm-toggle-sub { font-size: 13px; color: var(--pm-ink-faint); margin-top: 2px; }
        .pm-toggle {
          width: 44px; height: 26px; border-radius: 13px; background: var(--pm-cream-deep); border: 0.5px solid var(--pm-border-strong);
          cursor: pointer; position: relative; transition: all 0.2s; flex-shrink: 0; outline: none;
        }
        .pm-toggle::after { content: ''; position: absolute; width: 20px; height: 20px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .pm-toggle.pm-on { background: var(--pm-teal); border-color: transparent; }
        .pm-toggle.pm-on::after { transform: translateX(18px); }
        .pm-toggle-status { font-size: 11px; font-weight: 500; color: var(--pm-ink-faint); min-width: 24px; text-align: center; }
      `}</style>

      <div className={`pref-root pm-backdrop ${isVisible ? "pm-show" : ""}`} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="pref-modal-title">
        <div className="pm-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
          <div className="pm-modal-header">
            <div className="pm-modal-title-area">
              <span className="pm-modal-eyebrow">Settings</span>
              <h2 id="pref-modal-title" className="pm-modal-title">Preferences</h2>
            </div>
            <button className="pm-close-btn" onClick={onClose} aria-label="Close preferences">✕</button>
          </div>

          <div className="pm-modal-body">
            <div className="pref-section">
              <div className="pref-section-header">
                <h3 className="pref-section-title">Personal settings</h3>
                <span className="pref-section-meta">4 options</span>
              </div>
              
              <div className="pm-card">
                <div className="pm-card-head">
                  <span className="pm-card-badge">Theme</span>
                  <h4 className="pm-card-title">Application interface</h4>
                  <p className="pm-card-desc">Select a visual style that best suits your environment and mood.</p>
                </div>
                <div className="pm-theme-grid">
                  {(["standard", "dark", "space"] as const).map((t) => (
                    <div 
                      key={t}
                      className={`pm-theme-option ${profile.theme === t ? 'pm-active' : ''}`}
                      onClick={() => onUpdateProfile({ theme: t })}
                    >
                      <div className={`pm-theme-preview ${t}`} />
                      <span className="pm-theme-name">{t.charAt(0).toUpperCase() + t.slice(1)} Theme</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div className="pm-field-label">Background Image</div>
                  <p className="pm-card-desc" style={{ marginBottom: '12px' }}>Upload a custom wallpaper for your dashboard and workspace.</p>
                  
                  <div 
                    className="pm-bg-preview-container"
                    onClick={() => document.getElementById('bg-upload-input')?.click()}
                  >
                    {profile.dashboardBackground ? (
                      <img src={profile.dashboardBackground} className="pm-bg-preview-img" alt="Dashboard background" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#A09D98]">
                        <EmojiIcon className="text-3xl" emoji="🖼️" label="Image" />
                        <span className="text-sm">No background selected</span>
                      </div>
                    )}
                    <input 
                      id="bg-upload-input"
                      type="file" 
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              onUpdateProfile({ dashboardBackground: event.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  {profile.dashboardBackground && (
                    <button 
                      className="mt-3 w-full py-2.5 rounded-lg border border-red-100 bg-red-50/50 text-red-600 text-xs font-semibold uppercase tracking-wider hover:bg-red-50 transition-colors"
                      onClick={() => onUpdateProfile({ dashboardBackground: null })}
                    >
                      Remove Background
                    </button>
                  )}
                </div>
              </div>

              <div className="pref-grid">
                <div className="pm-card">
                  <div className="pm-card-head">
                    <span className="pm-card-badge">Timezone</span>
                    <h4 className="pm-card-title">Local time context</h4>
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
                    <h4 className="pm-card-title">Email notifications</h4>
                    <p className="pm-card-desc">Decide whether updates and reminders arrive in your inbox.</p>
                  </div>
                  <div className="pm-toggle-row mt-auto">
                    <div className="pm-toggle-info">
                      <div className="pm-toggle-title">Notification status</div>
                      <div className="pm-toggle-sub">{profile.emailNotifications ? "Inbox updates are enabled" : "Notifications are paused"}</div>
                    </div>
                    <button 
                      className={`pm-toggle ${profile.emailNotifications ? 'pm-on' : ''}`} 
                      onClick={() => onUpdateProfile({ emailNotifications: !profile.emailNotifications })}
                      aria-label="Toggle email notifications"
                    />
                    <span className="pm-toggle-status">{profile.emailNotifications ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
