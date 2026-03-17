import AuthPageShell from "@/components/auth-page-shell";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e3dbd3] px-4">
      <AuthPageShell mode="sign-up" />
    </div>
  );
}
