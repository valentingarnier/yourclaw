"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";

export default function OnboardingPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic E.164 validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid phone number in E.164 format (e.g., +15551234567)");
      return;
    }

    try {
      setLoading(true);
      await api.setPhone(phone);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save phone number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Header */}
      <header className="p-4">
        <Logo size="md" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-2xl p-8 shadow-xl shadow-zinc-900/5 border border-zinc-200">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
              <DevicePhoneMobileIcon className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-900">One more step</h1>
              <p className="mt-2 text-zinc-600">
                Enter your WhatsApp number to connect your AI assistant
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-zinc-700 mb-2"
                >
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+15551234567"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition text-zinc-900 placeholder:text-zinc-400"
                  required
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Include country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? "Connecting..." : "Connect WhatsApp"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            We&apos;ll only use your number to send messages from your AI assistant.
            <br />
            You can disconnect at any time.
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
