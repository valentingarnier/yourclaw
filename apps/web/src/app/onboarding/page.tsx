"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Almost there!</h1>
          <p className="mt-2 text-gray-600">
            Enter your WhatsApp phone number to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              WhatsApp Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter your number in international format (E.164)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
