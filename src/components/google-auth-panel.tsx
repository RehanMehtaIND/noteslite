"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

type AuthMode = "sign-in" | "sign-up";

function getCopy(mode: AuthMode) {
  if (mode === "sign-up") {
    return {
      eyebrow: "Create account",
      title: "Continue with Google",
      description: "Google will create your Noteslite account the first time you sign in.",
      buttonLabel: "Continue with Google",
    };
  }

  return {
    eyebrow: "Sign in",
    title: "Welcome back",
    description: "Use your Google account to access your workspace.",
    buttonLabel: "Sign in with Google",
  };
}

export default function GoogleAuthPanel({
  mode = "sign-in",
}: {
  mode?: AuthMode;
}) {
  const router = useRouter();
  const { status } = useSession();
  const copy = getCopy(mode);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="w-full max-w-md rounded-[36px] border border-[#d6c8bf] bg-[#f3f1e9] p-8 text-[#5e5752] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8a8179]">
          Loading
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[0.08em] text-[#615952]">
          NOTESLITE
        </h1>
        <p className="mt-5 text-sm leading-6 text-[#645c56]">Preparing Google sign-in.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-[36px] border border-[#d6c8bf] bg-[#f3f1e9] p-8 text-[#5e5752] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8a8179]">
        {copy.eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-[0.08em] text-[#615952]">
        NOTESLITE
      </h1>
      <h2 className="mt-5 text-xl font-semibold text-[#4f4842]">{copy.title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#645c56]">{copy.description}</p>

      <button
        type="button"
        onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}
        className="mt-7 w-full rounded-full bg-[#1f1f1f] px-5 py-3.5 text-sm font-semibold tracking-[0.12em] text-white transition-colors hover:bg-black"
      >
        {copy.buttonLabel}
      </button>
    </div>
  );
}