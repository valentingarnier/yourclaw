"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";

export default function OnboardingPage() {
  const router = useRouter();
  const [channel, setChannel] = useState<"WHATSAPP" | "TELEGRAM">("TELEGRAM");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill from localStorage (set by landing page)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yourclaw_signup");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.channel) setChannel(data.channel);
        if (data.telegramUsername) setTelegramUsername(data.telegramUsername);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (channel === "TELEGRAM" && !telegramUsername.trim()) {
      setError("Please enter your Telegram username");
      return;
    }
    if (channel === "WHATSAPP" && !phone.match(/^\+[1-9]\d{1,14}$/)) {
      setError("Enter your phone number in international format (e.g. +33612345678)");
      return;
    }

    try {
      setLoading(true);
      await api.setChannel(
        channel,
        channel === "WHATSAPP" ? phone : undefined,
        channel === "TELEGRAM" ? telegramUsername.replace(/^@/, "") : undefined,
      );
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
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
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
              <DevicePhoneMobileIcon className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-zinc-900">One more step</h1>
              <p className="mt-2 text-zinc-600">
                Choose how to connect your AI assistant
              </p>
            </div>

            {/* Channel Toggle */}
            <div className="flex rounded-xl bg-zinc-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setChannel("WHATSAPP")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  channel === "WHATSAPP"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.676-6.422-1.842l-.448-.292-2.652.889.889-2.652-.292-.448A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("TELEGRAM")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  channel === "TELEGRAM"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {channel === "WHATSAPP" ? (
                <div>
                  <label htmlFor="whatsapp-phone" className="block text-sm font-medium text-zinc-700 mb-2">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    id="whatsapp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                    placeholder="+33612345678"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition text-zinc-900 placeholder:text-zinc-400"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    International format with country code. Only this number will be able to message the bot.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="telegram-username" className="block text-sm font-medium text-zinc-700 mb-2">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    id="telegram-username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition text-zinc-900 placeholder:text-zinc-400"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Your Telegram username (found in Settings). Only you will be able to message the bot.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading
                  ? "Connecting..."
                  : channel === "WHATSAPP"
                    ? "Connect WhatsApp"
                    : "Connect Telegram"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            {channel === "WHATSAPP" ? (
              <>
                You&apos;ll scan a QR code in the dashboard to link WhatsApp.
                <br />
                You can switch channels at any time.
              </>
            ) : (
              <>
                After connecting, message <span className="font-medium">@Yourclawdev_bot</span> on Telegram to activate.
                <br />
                You can switch channels at any time.
              </>
            )}
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
