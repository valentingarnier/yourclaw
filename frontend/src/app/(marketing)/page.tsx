"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  ClockIcon,
  BoltIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { MouseGradient, SpotlightCard, TiltCard } from "@/components/marketing/mouse-gradient";
import { blogPosts } from "@/lib/blog-data";

function OfferBanner() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set deadline to 48h from first visit (persisted in localStorage)
    const STORAGE_KEY = "yourclaw_offer_deadline_v4";
    let deadline = localStorage.getItem(STORAGE_KEY);
    if (!deadline) {
      const d = new Date(Date.now() + 48 * 60 * 60 * 1000);
      deadline = d.toISOString();
      localStorage.setItem(STORAGE_KEY, deadline);
    }
    const deadlineDate = new Date(deadline);

    const tick = () => {
      const now = new Date();
      const diff = deadlineDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm text-zinc-400">
        <span className="hidden sm:inline">Try OpenClaw free for 48h</span>
        <span className="sm:hidden">48h free trial</span>
        <span className="text-zinc-600">—</span>
        <span className="font-mono text-white tabular-nums text-xs">
          {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m left
        </span>
        <Link
          href="/login"
          className="ml-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400 transition-colors"
        >
          Start free
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative">
      <OfferBanner />
      <MouseGradient />
      <HeroSection />
      <TimeComparisonSection />
      <UseCasesSection />
      <FeaturesSection />
      <PhoneDemoSection />
      <HowItWorks />
      <PricingSection />
      <BlogSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  const [selectedModel, setSelectedModel] = useState<"claude" | "openai" | "vercel">("claude");
  const [channel, setChannel] = useState<"WHATSAPP" | "TELEGRAM">("TELEGRAM");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [error, setError] = useState("");

  const models = [
    {
      id: "claude" as const,
      name: "Claude Opus 4.5",
      provider: "Anthropic",
      icon: <img src="/claude-logo.png" alt="Claude" className="w-5 h-5 object-contain" />,
    },
    {
      id: "openai" as const,
      name: "GPT-4o",
      provider: "OpenAI",
      icon: <img src="/openai-logo.png" alt="OpenAI" className="w-5 h-5 object-contain" />,
    },
    {
      id: "vercel" as const,
      name: "MiniMax",
      provider: "Vercel AI Gateway",
      icon: <svg className="w-5 h-5" viewBox="0 0 76 65" fill="currentColor"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>,
    },
  ];

  const handleSignIn = () => {
    if (channel === "WHATSAPP") {
      if (!whatsAppPhone.match(/^\+[1-9]\d{1,14}$/)) {
        setError("Enter your phone in E.164 format (e.g. +33612345678)");
        return;
      }
      localStorage.setItem("yourclaw_signup", JSON.stringify({
        channel: "WHATSAPP",
        phone: whatsAppPhone,
      }));
    } else {
      const usernameRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
      if (!telegramUsername) {
        setError("Please enter your Telegram username");
        return;
      }
      if (!usernameRegex.test(telegramUsername)) {
        setError("Please enter a valid Telegram username (5-32 characters)");
        return;
      }

      localStorage.setItem("yourclaw_signup", JSON.stringify({
        channel: "TELEGRAM",
        telegramUsername: telegramUsername.replace(/^@/, ""),
      }));
    }

    window.location.href = "/login";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
      {/* Single ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/15 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Headlines */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 animate-reveal">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-zinc-400">
                Powered by <span className="text-white font-medium">OpenClaw</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6 animate-reveal" style={{ animationDelay: "0.1s" }}>
              <span className="text-white">The easiest way to</span>
              <br />
              <span className="gradient-text text-glow">run OpenClaw</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg font-light text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-10 animate-reveal" style={{ animationDelay: "0.2s" }}>
              Get your own OpenClaw instance — fully managed, always on. Build apps, browse the web, compare prices, set up ads. All from WhatsApp or Telegram.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-10 animate-reveal" style={{ animationDelay: "0.3s" }}>
              <div className="text-center">
                <div className="text-3xl font-extrabold tracking-tight text-white">1 min</div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mt-1">setup</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-extrabold tracking-tight text-white">24/7</div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mt-1">available</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-extrabold tracking-tight text-white">$20</div>
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mt-1">per month</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-extrabold tracking-tight text-emerald-400">48h</div>
                <div className="text-xs font-medium uppercase tracking-wider text-emerald-500/70 mt-1">free trial</div>
              </div>
            </div>
          </div>

          {/* Right: Setup Card */}
          <div className="animate-reveal" style={{ animationDelay: "0.2s" }}>
            <TiltCard>
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden">
                {/* Gradient glow at top */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                {/* Step 1: Model Selection */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">1</span>
                    Choose your AI model
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={clsx(
                          "relative p-3 rounded-xl border transition-all duration-200 shadow-lg bg-white",
                          selectedModel === model.id
                            ? "border-emerald-500 shadow-emerald-500/20"
                            : "border-zinc-200 shadow-black/10 hover:border-zinc-300 hover:shadow-xl hover:shadow-black/20"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center">
                          {model.icon}
                        </div>
                        <p className="text-xs font-medium text-zinc-900">{model.name}</p>
                        <p className="text-[10px] text-zinc-500">{model.provider}</p>
                        {selectedModel === model.id && (
                          <div className="absolute top-2 right-2">
                            <CheckIcon className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Channel + Contact */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">2</span>
                    Choose your channel
                  </label>
                  {/* Channel toggle */}
                  <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-3">
                    <button
                      type="button"
                      onClick={() => { setChannel("WHATSAPP"); setError(""); }}
                      className={clsx(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        channel === "WHATSAPP"
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.676-6.422-1.842l-.448-.292-2.652.889.889-2.652-.292-.448A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChannel("TELEGRAM"); setError(""); }}
                      className={clsx(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        channel === "TELEGRAM"
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </button>
                  </div>
                  {/* Conditional input */}
                  {channel === "WHATSAPP" ? (
                    <input
                      type="tel"
                      aria-label="Phone number (E.164)"
                      value={whatsAppPhone}
                      onChange={(e) => { setWhatsAppPhone(e.target.value.replace(/[^\d+]/g, "")); setError(""); }}
                      placeholder="+33612345678"
                      className={clsx(
                        "w-full px-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all",
                        error
                          ? "border-red-500/50 focus:ring-red-500/30"
                          : "border-white/10 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                      )}
                    />
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-zinc-500 text-sm font-medium">@</span>
                      </div>
                      <input
                        type="text"
                        value={telegramUsername}
                        onChange={(e) => { setTelegramUsername(e.target.value.replace(/^@/, "")); setError(""); }}
                        placeholder="username"
                        className={clsx(
                          "w-full pl-10 pr-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all",
                          error
                            ? "border-red-500/50 focus:ring-red-500/30"
                            : "border-white/10 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                        )}
                      />
                    </div>
                  )}
                  {error && (
                    <p className="mt-2 text-sm text-red-400">{error}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">
                    {channel === "WHATSAPP" ? "Phone number in E.164 format" : "Your Telegram username (without the @)"}
                  </p>
                </div>

                {/* Step 3: Sign In */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">3</span>
                    Create your account
                  </label>
                  <button
                    onClick={handleSignIn}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-zinc-50 text-zinc-900 font-semibold rounded-xl transition-all shadow-lg"
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
                    Sign in with Google
                  </button>
                </div>

                <p className="mt-4 text-center text-xs text-zinc-500">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-zinc-400">Terms</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="underline hover:text-zinc-400">Privacy Policy</Link>
                </p>
              </div>
            </TiltCard>
          </div>
        </div>
      </div>

    </section>
  );
}

function TimeComparisonSection() {
  const painPoints = [
    "Rent and configure a server",
    "Install Node.js & dependencies",
    "Debug Docker & config errors",
    "Manage API keys & secrets",
    "Monitor uptime 24/7",
    "Handle updates & maintenance",
  ];

  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            OpenClaw is powerful.{" "}
            <span className="gradient-text">Setting it up isn&apos;t.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Self-hosting OpenClaw means servers, Docker, configs, and terminal commands.
            <br />We handle all of that — you just text.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: Pain points + solution */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-6">
                Self-hosting OpenClaw? You&apos;ll need to...
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {painPoints.map((point, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-zinc-500 line-through decoration-zinc-700">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative p-6 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-zinc-900/50 border border-emerald-500/20">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold gradient-text">Or</div>
                <div>
                  <p className="text-white font-semibold text-lg">Just use YourClaw</p>
                  <p className="text-zinc-400 text-sm">Sign up, pick a channel, start chatting. ~1 min setup.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Demo video */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-purple-500/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full"
              >
                <source src="/yourclaw-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const categories = [
    {
      label: "Automate",
      color: "emerald",
      items: ["Set up Facebook ads", "Monitor competitor prices", "Track your shipments", "Compare product prices", "Automate web tasks"],
    },
    {
      label: "Research",
      color: "cyan",
      items: ["Find the best flight deals", "Compare SaaS tools", "Analyze a company", "Get real-time stock data", "Scout rental apartments"],
    },
    {
      label: "Create",
      color: "purple",
      items: ["Build a landing page from chat", "Create a full web app", "Build a spreadsheet from data", "Draft a contract", "Generate social media visuals"],
    },
  ];

  const colorStyles: Record<string, { border: string; text: string; glow: string }> = {
    emerald: { border: "border-emerald-500/30", text: "text-emerald-400", glow: "shadow-emerald-500/10" },
    cyan: { border: "border-cyan-500/30", text: "text-cyan-400", glow: "shadow-cyan-500/10" },
    purple: { border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-purple-500/10" },
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            What can <span className="gradient-text">YourClaw</span> do for you?
          </h2>
          <p className="text-lg text-zinc-400">
            One assistant, endless possibilities
          </p>
        </div>

        {/* Scrolling rows with category labels */}
        <div className="space-y-6">
          {categories.map((category, idx) => {
            const colors = colorStyles[category.color];
            const isReverse = idx % 2 === 1;

            return (
              <div key={category.label} className="relative">
                {/* Category label */}
                <div className={clsx(
                  "absolute left-0 top-1/2 -translate-y-1/2 z-20 px-3 py-1 rounded-full text-xs font-medium bg-zinc-950 border",
                  colors.border,
                  colors.text
                )}>
                  {category.label}
                </div>

                {/* Scrolling items */}
                <div className="relative overflow-hidden ml-16 sm:ml-20">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

                  <div className={clsx(
                    "flex gap-3 py-2",
                    isReverse ? "animate-marquee-reverse" : "animate-marquee-slow"
                  )}>
                    {[...category.items, ...category.items, ...category.items].map((item, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "flex-shrink-0 px-4 py-2 rounded-lg bg-zinc-900/80 border text-sm text-zinc-300 whitespace-nowrap transition-all duration-300 hover:text-white shadow-lg",
                          colors.border,
                          colors.glow
                        )}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-10">
          And much more — just ask.
        </p>
      </div>
    </section>
  );
}


function FeaturesSection() {
  const features = [
    {
      icon: SparklesIcon,
      title: "Takes real actions",
      description: "Browse the web, create apps, set up ads, compare prices — not just chat. Your assistant actually does things for you.",
      gradient: "from-emerald-500 to-cyan-500",
    },
    {
      icon: ClockIcon,
      title: "Always on, always ready",
      description: "Running 24/7 on your own dedicated server. Text it at 3am to book a hotel or cancel a meeting — it never sleeps.",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: BoltIcon,
      title: "Works where you are",
      description: "Lives in WhatsApp or Telegram. No new app, no browser tab. Just text like you would a human assistant.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: ShieldCheckIcon,
      title: "Your own private instance",
      description: "Each user gets a dedicated AI server. Your data is isolated, encrypted, and never shared with anyone.",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Not a chatbot.{" "}
            <span className="gradient-text">A real assistant.</span>
          </h2>
          <p className="text-lg font-light text-zinc-400 max-w-2xl mx-auto">
            YourClaw doesn&apos;t just answer questions — it takes action. Browse the web, create apps, manage files, and automate tasks from your chat.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <SpotlightCard
              key={i}
              className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className={`absolute top-0 inset-x-6 h-px bg-gradient-to-r ${feature.gradient} opacity-50`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                {feature.description}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhoneDemoSection() {
  return (
    <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
              Get things done{" "}
              <span className="gradient-text">without leaving your chat</span>
            </h2>
            <p className="text-lg font-light text-zinc-400 mb-8">
              Just text your assistant like you&apos;d text a friend.
              It browses the web, takes actions, and gets things done — all from your chat.
            </p>

            <div className="space-y-4">
              {[
                "\"Build me a landing page for my new product\"",
                "\"Find me a flight to NYC under $300 next week\"",
                "\"Compare the top 5 CRMs and make a spreadsheet\"",
                "\"Set up a Facebook ad for my new product\"",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-zinc-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                Get Started
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <TiltCard className="relative">
              <IPhoneMockup />
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function IPhoneMockup() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const conversation = [
    { type: "user", text: "Build me a simple landing page for my coffee shop", time: "9:41 AM" },
    { type: "ai", text: "On it! I'll create a clean one-page site with:\n\n• Hero section with your shop name\n• Menu highlights\n• Location & hours\n• Contact form", time: "9:41 AM" },
    { type: "user", text: "Add an online ordering section too", time: "9:42 AM" },
    { type: "ai", text: "Done! I've added an order section with your menu items, quantity selectors, and a checkout flow. Here's the live preview link.", time: "9:42 AM" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev >= conversation.length) {
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [conversation.length]);

  return (
    <div className="relative">
      {/* Subtle reflection shadow */}
      <div className="absolute -inset-2 bg-emerald-500/10 rounded-[4rem] blur-3xl" />

      {/* iPhone frame */}
      <div className="relative w-[320px] bg-zinc-950 rounded-[3.5rem] p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10">
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[100px] h-[32px] bg-black rounded-full z-20" />

        {/* Screen */}
        <div className="relative bg-zinc-900 rounded-[3rem] overflow-hidden">
          {/* Status bar - minimal, just for the notch */}
          <div className="h-12" />

          {/* WhatsApp header */}
          <div className="bg-[#1F2C34] px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-sm">Y</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-xs">YourClaw</p>
              <p className="text-emerald-400 text-[10px]">online</p>
            </div>
          </div>

          {/* Chat area */}
          <div
            ref={containerRef}
            className="bg-[#0B141A] px-3 py-4 min-h-[400px] space-y-3"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {conversation.slice(0, visibleMessages).map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  "max-w-[85%] animate-message",
                  msg.type === "user" ? "ml-auto" : ""
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className={clsx(
                    "p-3 rounded-lg text-sm whitespace-pre-line shadow-lg",
                    msg.type === "user"
                      ? "bg-[#005C4B] text-white rounded-br-none"
                      : "bg-[#1F2C34] text-white rounded-bl-none"
                  )}
                >
                  {msg.text}
                </div>
                <p className={clsx(
                  "text-[10px] text-zinc-500 mt-1 flex items-center gap-1",
                  msg.type === "user" ? "justify-end" : ""
                )}>
                  <span>{msg.time}</span>
                  {msg.type === "user" && (
                    <svg className="w-4 h-3 text-[#53BDEB]" viewBox="0 0 16 11" fill="none">
                      <path d="M11.071 0.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.136.475.475 0 0 0-.343.153.482.482 0 0 0-.127.34.464.464 0 0 0 .149.323l2.758 2.588a.454.454 0 0 0 .312.127.469.469 0 0 0 .357-.17l6.545-8.076a.476.476 0 0 0 .088-.381.472.472 0 0 0-.123-.208z" fill="currentColor"/>
                      <path d="M15.071 0.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.028-.97a.457.457 0 0 0-.074.633l.918.863a.454.454 0 0 0 .312.127.469.469 0 0 0 .357-.17l6.545-8.076a.476.476 0 0 0 .088-.381.472.472 0 0 0-.123-.208l-.12.47z" fill="currentColor"/>
                    </svg>
                  )}
                </p>
              </div>
            ))}

            {/* Typing indicator */}
            {visibleMessages < conversation.length && visibleMessages > 0 && (
              <div className="flex items-center gap-1 p-3 bg-[#1F2C34] rounded-lg rounded-bl-none w-16">
                <span className="w-2 h-2 bg-zinc-500 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-zinc-500 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-zinc-500 rounded-full typing-dot" />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="bg-[#1F2C34] px-3 py-3 flex items-center gap-2">
            <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-sm text-zinc-400">
              Message
            </div>
            <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
                <path d="M17.3 12c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
          </div>

          {/* Home indicator */}
          <div className="py-2 flex justify-center">
            <div className="w-32 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Choose & Configure",
      description: "Select your AI model, choose WhatsApp or Telegram, and enter your details.",
    },
    {
      number: "02",
      title: "Sign in with Google",
      description: "One-click authentication. We create your personal AI instance instantly.",
    },
    {
      number: "03",
      title: "Start chatting",
      description: "Your assistant sends you a message on WhatsApp or Telegram. Ask anything, anytime.",
    },
  ];

  return (
    <section id="how-it-works" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Ready in <span className="gradient-text">1 minute</span>
          </h2>
          <p className="text-lg font-light text-zinc-400">
            No technical knowledge required. Seriously.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-zinc-800 to-transparent" />
              )}

              <div className="relative text-center p-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900 border border-white/10 mb-6 group-hover:border-emerald-500/30 transition-colors">
                  <span className="text-lg font-extrabold gradient-text">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function PricingSection() {
  const features = [
    "Unlimited messages",
    "Web browsing & real actions",
    "Your own dedicated server",
    "All AI models (Claude, GPT, MiniMax)",
    "Create apps & websites from chat",
    "24/7 availability",
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Simple pricing
          </h2>
          <p className="text-lg font-light text-zinc-400">
            One plan. Everything included.
          </p>
        </div>

        <TiltCard>
          <div className="relative p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden">
            {/* Gradient glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="text-center mb-10">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-6xl font-extrabold tracking-tighter text-white">$20</span>
                <span className="text-xl font-light text-zinc-500">/month</span>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium text-sm">48h free trial included</span>
              </div>
              <p className="mt-2 text-zinc-500 text-sm font-light">Cancel anytime</p>
            </div>

            <div className="space-y-3 mb-8">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/login"
              className="block w-full text-center py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Get Started
            </Link>

            <p className="mt-4 text-center text-sm text-zinc-500">
              Need more? Add your own API key.
            </p>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}

function BlogSection() {
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  };

  const gradients = [
    "from-emerald-500/20 to-cyan-500/20",
    "from-cyan-500/20 to-blue-500/20",
    "from-purple-500/20 to-pink-500/20",
    "from-orange-500/20 to-red-500/20",
    "from-emerald-500/20 to-purple-500/20",
  ];

  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            From the <span className="gradient-text">YourClaw Blog</span>
          </h2>
          <p className="text-lg font-light text-zinc-400 max-w-2xl mx-auto">
            Guides, deep dives, and ideas on getting the most out of your AI assistant.
          </p>
        </div>

        {/* Featured post (first one) */}
        <Link
          href={`/blog/${blogPosts[0].slug}`}
          className="group block mb-8"
        >
          <SpotlightCard className="relative rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className={`relative h-48 md:h-full min-h-[240px] bg-gradient-to-br ${gradients[0]}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl sm:text-7xl font-extrabold text-white/5 select-none">01</div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-medium border",
                    categoryColors[blogPosts[0].categoryColor].bg,
                    categoryColors[blogPosts[0].categoryColor].text,
                    categoryColors[blogPosts[0].categoryColor].border,
                  )}>
                    {blogPosts[0].category}
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                  <span>{blogPosts[0].date}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span>{blogPosts[0].readingTime}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors leading-tight">
                  {blogPosts[0].title}
                </h3>
                <p className="text-sm text-zinc-400 font-light leading-relaxed mb-4">
                  {blogPosts[0].excerpt}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:gap-2.5 transition-all">
                  Read article
                  <ArrowRightIcon className="w-4 h-4" />
                </span>
              </div>
            </div>
          </SpotlightCard>
        </Link>

        {/* Grid of remaining posts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {blogPosts.slice(1).map((post, i) => {
            const colors = categoryColors[post.categoryColor];
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group"
              >
                <SpotlightCard className="relative h-full rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden">
                  <div className={`h-32 bg-gradient-to-br ${gradients[i + 1]} relative`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-5xl font-extrabold text-white/5 select-none">
                        {String(i + 2).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-medium border",
                        colors.bg,
                        colors.text,
                        colors.border,
                      )}>
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-2">
                      <span>{post.date}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{post.readingTime}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors leading-snug line-clamp-3">
                      {post.title}
                    </h3>
                    <p className="text-xs text-zinc-500 font-light leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>

        {/* View all link */}
        <div className="text-center mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            View all articles
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What is YourClaw?",
      answer: "YourClaw gives you a personal AI assistant on WhatsApp or Telegram. Powered by OpenClaw — a powerful open-source AI agent framework — it can browse the web, create apps, manage files, automate tasks, and much more. All through simple chat.",
    },
    {
      question: "How is this different from ChatGPT?",
      answer: "ChatGPT answers questions. YourClaw takes action. It can browse the web, build apps, manage files, check flights, set up ads — real tasks, not just conversation. Plus it lives in WhatsApp or Telegram, no app switching needed.",
    },
    {
      question: "Do I need to download an app?",
      answer: "No app needed. Everything happens through WhatsApp or Telegram. Just sign up, choose your channel, and start chatting. Your assistant messages you when it&apos;s ready.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. Each user gets their own isolated AI instance running on dedicated infrastructure. Your data is encrypted, never shared, and never used to train models.",
    },
    {
      question: "What can the assistant actually do?",
      answer: "Build landing pages and web apps, find flights and hotels, set up social media ads, compare products and prices, manage files, generate images, draft contracts, monitor competitors, track shipments — and much more. If you can describe it, it can probably do it.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 overflow-hidden bg-zinc-900/50 hover:border-white/10 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <ChevronDownIcon
                  className={clsx(
                    "w-5 h-5 text-zinc-500 transition-transform duration-200",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              <div
                className={clsx(
                  "overflow-hidden transition-all duration-200",
                  openIndex === i ? "max-h-96" : "max-h-0"
                )}
              >
                <div className="px-6 pb-5 text-zinc-400">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-purple-500/20" />
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" />

          {/* Content */}
          <div className="relative px-8 py-20 sm:px-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
              Get your personal AI assistant on WhatsApp or Telegram in under 1 minute.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Get Started
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              $20/month • 48h free trial • BYOK • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
