"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClerkDegraded,
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignIn,
  SignUp,
  useAuth,
} from "@clerk/nextjs";
import { useEffect, useState } from "react";

type AuthMode = "sign-in" | "sign-up";

function resolveClerkScriptHost() {
  if (typeof document === "undefined") {
    return "*.clerk.accounts.dev";
  }

  const script = document.querySelector<HTMLScriptElement>(
    "script[data-clerk-js-script='true']",
  );

  if (!script?.src) {
    return "*.clerk.accounts.dev";
  }

  try {
    return new URL(script.src).host;
  } catch {
    return "*.clerk.accounts.dev";
  }
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "sign-up") {
    return {
      title: "Create your workspace",
      description:
        "Set up your NOTESLITE account to start organizing boards and notes.",
      loadingLabel: "Preparing secure sign-up...",
      switchHref: "/auth/sign-in",
      switchLabel: "Already have an account? Sign in",
    };
  }

  return {
    title: "Welcome back",
    description:
      "Sign in to open your NOTESLITE dashboard and workspace boards.",
    loadingLabel: "Preparing secure sign-in...",
    switchHref: "/auth/sign-up",
    switchLabel: "Need an account? Sign up",
  };
}

function StatusCard({
  eyebrow,
  title,
  description,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-[36px] border border-[#d6c8bf] bg-[#f3f1e9] p-8 text-[#5e5752] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8a8179]">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-[0.08em] text-[#615952]">
        NOTESLITE
      </h1>
      <h2 className="mt-5 text-xl font-semibold text-[#4f4842]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#645c56]">{description}</p>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}

export default function ClerkSignInPanel({
  mode = "sign-in",
}: {
  mode?: AuthMode;
}) {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [scriptHost, setScriptHost] = useState("*.clerk.accounts.dev");
  const copy = getAuthCopy(mode);
  const isSignedIn = isLoaded && Boolean(userId);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
      setScriptHost(resolveClerkScriptHost());
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    router.replace("/dashboard");
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return (
      <div className="w-full max-w-md">
        <StatusCard
          eyebrow="Redirecting"
          title="Opening your dashboard"
          description="Your session is already active. Redirecting you to NOTESLITE now."
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <ClerkLoading>
        <StatusCard
          eyebrow="Loading"
          title={timedOut ? "Clerk script looks blocked" : copy.title}
          description={
            timedOut
              ? "This browser has not finished loading Clerk. In Vivaldi, disable tracker or ad blocking for this page, allow the auth host below, then reload."
              : copy.description
          }
          footer={
            timedOut ? (
              <>
                <div className="rounded-2xl bg-[#e6d9d4] px-4 py-3 font-mono text-xs text-[#5c5550]">
                  {scriptHost}
                </div>
                <p className="mt-4 text-sm leading-6 text-[#645c56]">
                  If the page still stays empty, open this site with blocking
                  disabled and try again.
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#645c56]">
                {copy.loadingLabel}
              </p>
            )
          }
        />
      </ClerkLoading>

      <ClerkFailed>
        <StatusCard
          eyebrow="Auth Error"
          title="Clerk failed to initialize"
          description="The authentication widget could not load on this page. Refresh once, then check that your browser or network is not blocking Clerk."
          footer={
            <div className="rounded-2xl bg-[#e6d9d4] px-4 py-3 font-mono text-xs text-[#5c5550]">
              {scriptHost}
            </div>
          }
        />
      </ClerkFailed>

      <ClerkDegraded>
        <StatusCard
          eyebrow="Limited Mode"
          title="Authentication is partially unavailable"
          description="Clerk reported a degraded state, so the embedded auth widget may not render correctly yet. Reload after checking your network and browser blockers."
          footer={
            <div className="rounded-2xl bg-[#e6d9d4] px-4 py-3 font-mono text-xs text-[#5c5550]">
              {scriptHost}
            </div>
          }
        />
      </ClerkDegraded>

      <ClerkLoaded>
        {mode === "sign-up" ? (
          <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl="/auth/sign-in"
          />
        ) : (
          <SignIn
            routing="path"
            path="/auth/sign-in"
            signUpUrl="/auth/sign-up"
          />
        )}

        <p className="mt-4 text-center text-sm text-[#6b6661]">
          <Link className="underline underline-offset-4" href={copy.switchHref}>
            {copy.switchLabel}
          </Link>
        </p>
      </ClerkLoaded>
    </div>
  );
}
