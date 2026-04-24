"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type CardHeaderProps = {
  label: string;
};

type InputFieldProps = {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  error?: string;
  errorId?: string;
  rightSlot?: ReactNode;
};

type PrimaryButtonProps = {
  label: string;
  loadingLabel: string;
  isLoading: boolean;
  disabled?: boolean;
};

type FooterLinkProps = {
  href: string;
  text: string;
  actionText: string;
};

type BackButtonProps = {
  href: string;
  label: string;
};

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="auth-screen auth-card-shell w-full max-w-[420px] overflow-hidden rounded-[24px] border border-[#f6f1ee] bg-[var(--auth-card)] shadow-[0_20px_60px_rgba(44,40,32,0.24)]">
      {children}
    </section>
  );
}

export function CardHeader({ label }: CardHeaderProps) {
  return (
    <header className="bg-[var(--auth-card)] px-9 pb-8 pt-9 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a827d]">{label}</p>
      <h1 className="mt-4 [font-family:'Playfair_Display','Times_New_Roman',serif] text-[30px] font-bold uppercase leading-none tracking-[0.08em] text-[var(--auth-title)]">
        NOTESLITE
      </h1>
    </header>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 bg-[linear-gradient(180deg,var(--auth-panel-top)_0%,var(--auth-panel-bottom)_100%)] px-9 pb-9 pt-7 rounded-t-[68px] border-t border-[#e4d7da]">
      {children}
    </div>
  );
}

export function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  errorId,
  rightSlot,
}: InputFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error && errorId ? errorId : undefined}
          className="h-12 w-full rounded-full border border-[#f0eaeb] bg-[var(--auth-input)] px-5 pr-12 text-[13px] font-medium tracking-[0.02em] text-[var(--auth-title)] placeholder:text-[var(--auth-input-placeholder)] focus-visible:border-[var(--auth-focus)] focus-visible:bg-[var(--auth-input-focus)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]/30"
        />
        {rightSlot ? <div className="absolute inset-y-0 right-4 flex items-center">{rightSlot}</div> : null}
      </div>
      {error && errorId ? (
        <p id={errorId} className="px-2 text-[12px] text-[#c0392b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordStrengthBar({ level }: { level: number }) {
  const labels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div className="space-y-2 px-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-2" role="presentation">
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 rounded-full ${segment < level ? "bg-[var(--auth-title)]" : "bg-[#d9cfd0]"
              }`}
          />
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--auth-copy)]">
        Password strength: {labels[Math.max(level - 1, 0)]}
      </p>
    </div>
  );
}

export function PrimaryButton({ label, loadingLabel, isLoading, disabled }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--auth-primary-start)_0%,var(--auth-primary-end)_100%)] text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--auth-primary-text)] shadow-[0_4px_12px_rgba(98,75,72,0.34)] transition duration-150 hover:brightness-95 hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <span className="flex items-center gap-2" role="status" aria-live="polite">
          <span className="auth-spinner h-4 w-4 rounded-full border-2 border-white/45 border-t-white" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--auth-copy)]">
      <span className="h-px flex-1 bg-[var(--auth-divider)]" />
      OR
      <span className="h-px flex-1 bg-[var(--auth-divider)]" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.46a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.1 3.55-5.2 3.55-8.68z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.47 1.14-4.06 1.14-3.12 0-5.77-2.1-6.72-4.92H1.28v3.08A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.38-2.3V6.62H1.28A12 12 0 0 0 0 12c0 1.93.46 3.75 1.28 5.38l4-3.08z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.78l3.43-3.43C17.95 1.14 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.08C6.23 6.87 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

export function GoogleButton({
  label,
  onClick,
  isLoading,
}: {
  label: string;
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label="Sign in with Google"
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#efe7e6] bg-[var(--auth-secondary)] px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--auth-secondary-text)] shadow-[0_2px_8px_rgba(94,74,70,0.25)] transition duration-150 hover:bg-[var(--auth-secondary-hover)] hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <span className="auth-spinner h-4 w-4 rounded-full border-2 border-[var(--auth-secondary-text)]/40 border-t-[var(--auth-secondary-text)]" />
      ) : (
        <GoogleIcon />
      )}
      {label}
    </button>
  );
}

export function FooterLink({ href, text, actionText }: FooterLinkProps) {
  return (
    <p className="text-center text-[13px] text-[var(--auth-copy)]">
      {text}{" "}
      <Link
        href={href}
        className="font-semibold uppercase tracking-[0.1em] text-[var(--auth-secondary-text)] underline decoration-[var(--auth-divider)] underline-offset-4 transition hover:decoration-[var(--auth-secondary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]"
      >
        {actionText}
      </Link>
    </p>
  );
}

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8dfde] text-lg text-[var(--auth-copy)] transition hover:bg-[var(--auth-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]"
    >
      <span aria-hidden="true">&#8592;</span>
    </Link>
  );
}
