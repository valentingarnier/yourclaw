"use client";

import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead");
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Header */}
      <header className="p-4">
        <Logo size="md" href="/" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-2xl p-8 shadow-xl shadow-zinc-900/5 border border-zinc-200">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
              <p className="mt-2 text-zinc-600">
                Sign in to access your AI assistant
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-zinc-700 font-medium">
                Continue with Google
              </span>
            </button>

            <p className="mt-6 text-center text-xs text-zinc-500">
              By signing in, you agree to our{" "}
              <a href="#" className="underline hover:text-zinc-700">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-zinc-700">
                Privacy Policy
              </a>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <button onClick={handleGoogleLogin} className="text-zinc-900 font-medium hover:underline">
              Sign up
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} YourClaw
      </footer>
    </div>
  );
}
