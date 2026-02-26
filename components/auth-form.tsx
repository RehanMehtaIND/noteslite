"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAuthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      mode === "login"
        ? { email, password }
        : {
            name,
            email,
            password,
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Request failed.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e3dbd3] px-4 text-[#4a4440]">
      <div className="w-full max-w-[430px] h-[610px] rounded-[50px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] bg-[#f3f1e9] overflow-hidden flex flex-col relative">
        <div className="pt-14 pb-20 text-center z-10">
          <h1 className="text-[2.6rem] tracking-[0.25em] [font-family:'Cinzel','Times_New_Roman',serif] uppercase font-medium text-[#6b6661]">
            NOTESLITE
          </h1>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-b from-[#fce4ec] via-[#f8bbd0] to-[#f4a9a9] rounded-t-[120px_60px] flex flex-col items-center px-12 pt-10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)]">
          <h2 className="text-[#6d6461] mb-5 tracking-[0.4em] font-bold text-xs uppercase opacity-90">
            {mode === "login" ? "Log In" : "Sign Up"}
          </h2>

          <form onSubmit={submitAuthForm} className="w-full space-y-4">
            {mode === "signup" ? (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="ENTER NAME"
                className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
                autoComplete="name"
                required
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ENTER EMAIL"
              className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
              autoComplete="email"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="ENTER PASSWORD"
              className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />

            {error ? (
              <p className="rounded-lg bg-[#f7d8d8] px-3 py-2 text-center text-[11px] tracking-[0.05em] text-[#8a4545] uppercase font-semibold">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full bg-gradient-to-b from-[#eeb4a8] to-[#d58b7c] text-white tracking-[0.2em] shadow-[0_4px_15px_rgba(213,139,124,0.4)] hover:shadow-[0_6px_20px_rgba(213,139,124,0.5)] active:scale-[0.98] transition-all font-bold text-xs uppercase mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Please Wait" : mode === "login" ? "Log In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-[#7a6f6b] font-bold tracking-[0.2em] text-xs uppercase opacity-80">
            {mode === "login" ? "No Account Yet?" : "Already Registered?"}
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((prev) => (prev === "login" ? "signup" : "login"));
            }}
            className="mt-4 w-full py-3 rounded-full bg-[#e6d9d4] text-[#6d6461] shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:bg-[#dfd0ca] transition-colors tracking-[0.1em] text-xs font-bold uppercase border border-white/40"
          >
            {mode === "login" ? "Sign Up" : "Back To Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
