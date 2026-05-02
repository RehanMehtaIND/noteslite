import type { ReactNode } from "react";

import LoginAtmosphere from "@/frontend/components/auth/login-atmosphere";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page auth-scene min-h-screen px-4 py-6 sm:px-6 sm:py-8" style={{ background: 'var(--bg)' }}>
      <LoginAtmosphere />
      <div className="auth-scene-content mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1100px] items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
}