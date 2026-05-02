"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import {
  AuthCard,
  BackButton,
  CardBody,
  CardHeader,
  FooterLink,
  GoogleButton,
  InputField,
  OrDivider,
  PasswordStrengthBar,
  PrimaryButton,
} from "@/frontend/components/auth/auth-card";

type Mode = "sign-in" | "sign-up";

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.max(score, 1);
}

function validateSignIn(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!isEmail(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function validateSignUp(name: string, email: string, password: string, confirmPassword: string): FieldErrors {
  const errors = validateSignIn(email, password);

  if (!name.trim()) {
    errors.name = "Full name is required.";
  }

  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function AuthPageShell({
  mode = "sign-in",
}: {
  mode?: Mode;
}) {
  const router = useRouter();
  const isSignIn = mode === "sign-in";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  const passwordStrength = getPasswordStrength(password);

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
    setIsGoogleLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = isSignIn
      ? validateSignIn(email, password)
      : validateSignUp(name, email, password, confirmPassword);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setShakeCount((count) => count + 1);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isSignIn) {
        const result = await signIn("credentials", {
          email: normalizedEmail,
          password,
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (result?.error) {
          setFormError("Invalid email or password.");
          setShakeCount((count) => count + 1);
          return;
        }

        router.push(result?.url ?? "/dashboard");
        router.refresh();
        return;
      }

      const signUpResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const signUpPayload = (await signUpResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!signUpResponse.ok) {
        setFormError(signUpPayload?.error ?? "Could not create account.");
        setShakeCount((count) => count + 1);
        return;
      }

      const loginResult = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (loginResult?.error) {
        router.push("/auth/sign-in");
        return;
      }

      router.push(loginResult?.url ?? "/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not reach the server.");
      setShakeCount((count) => count + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <CardHeader label={isSignIn ? "SIGN IN" : "SIGN UP"} />

      <CardBody>
        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold text-[var(--auth-title)]">
            {isSignIn ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-[14px] leading-[1.6] text-[var(--auth-copy)]">
            {isSignIn
              ? "Sign in to access your notes workspace."
              : "Start organizing your thoughts with NOTESLITE."}
          </p>
        </section>

        <span className="block h-px w-full bg-[var(--auth-divider)]" />

        <form
          onSubmit={handleSubmit}
          noValidate
          className={`space-y-[14px] ${shakeCount > 0 ? "auth-shake" : ""}`}
          key={`${mode}-${shakeCount}`}
        >
          {!isSignIn ? (
            <InputField
              id="name"
              label="Full name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="ENTER NAME"
              autoComplete="name"
              error={fieldErrors.name}
              errorId="name-error"
            />
          ) : null}

          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ENTER EMAIL"
            autoComplete="email"
            error={fieldErrors.email}
            errorId="email-error"
          />

          <InputField
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="ENTER PASSWORD"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            error={fieldErrors.password}
            errorId="password-error"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--auth-copy)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          {isSignIn ? (
            <div className="px-2 text-right">
              <Link
                href="/auth/sign-in"
                className="text-[12px] text-[var(--auth-copy)] underline decoration-[var(--auth-divider)] underline-offset-4 transition hover:decoration-[var(--auth-secondary-text)]"
              >
                Forgot password?
              </Link>
            </div>
          ) : (
            <>
              <PasswordStrengthBar level={passwordStrength} />
              <InputField
                id="confirmPassword"
                label="Confirm password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="CONFIRM PASSWORD"
                autoComplete="new-password"
                error={fieldErrors.confirmPassword}
                errorId="confirm-password-error"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--auth-copy)]"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                }
              />
            </>
          )}

          {formError ? <p className="auth-form-error text-[12px] text-[var(--auth-error)]">{formError}</p> : null}

          <PrimaryButton
            label={isSignIn ? "LOG IN" : "SIGN UP"}
            loadingLabel={isSignIn ? "LOGGING IN" : "CREATING ACCOUNT"}
            isLoading={isSubmitting}
            disabled={isGoogleLoading}
          />

          {isSignIn ? (
            <>
              <OrDivider />
              <GoogleButton
                label="LOG IN USING GOOGLE"
                onClick={() => {
                  void handleGoogleSignIn();
                }}
                isLoading={isGoogleLoading}
              />
            </>
          ) : null}
        </form>

        {isSignIn ? (
          <FooterLink href="/auth/sign-up" text="Don't have an account?" actionText="SIGN UP" />
        ) : (
          <div className="flex items-center justify-between">
            <BackButton href="/auth/sign-in" label="Back to sign in" />
            <FooterLink href="/auth/sign-in" text="Already have an account?" actionText="LOG IN" />
          </div>
        )}
      </CardBody>
    </AuthCard>
  );
}
