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
  PhoneIcon,
  BellIcon,
  LanguageIcon,
  InboxIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ArrowTrendingDownIcon,
  AdjustmentsHorizontalIcon,
  PresentationChartBarIcon,
  PaperAirplaneIcon,
  CakeIcon,
  ShareIcon,
  PencilSquareIcon,
  ChartBarIcon,
  FunnelIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { MouseGradient, SpotlightCard, TiltCard } from "@/components/marketing/mouse-gradient";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  return (
    <div className="relative">
      <MouseGradient />
      <HeroSection />
      <TimeComparisonSection />
      <UseCasesMarquee />
      <FeaturesSection />
      <PhoneDemoSection />
      <HowItWorks />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  const [selectedModel, setSelectedModel] = useState<"claude" | "openai" | "gemini">("claude");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const models = [
    {
      id: "claude" as const,
      name: "Claude",
      provider: "Anthropic",
      available: true,
      color: "from-[#D97757] to-[#C46644]",
      icon: <span className="text-sm font-bold">A</span>,
    },
    {
      id: "openai" as const,
      name: "GPT-4",
      provider: "OpenAI",
      available: false,
      color: "from-[#10A37F] to-[#0D8A6A]",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      ),
    },
    {
      id: "gemini" as const,
      name: "Gemini",
      provider: "Google",
      available: false,
      color: "from-[#4285F4] to-[#34A853]",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 3.6c2.34 0 4.464.936 6.012 2.448L12 12V3.6zm-8.4 8.4c0-2.34.936-4.464 2.448-6.012L12 12H3.6zm8.4 8.4c-2.34 0-4.464-.936-6.012-2.448L12 12v8.4zm0-8.4l6.012 6.012A8.352 8.352 0 0112 20.4V12zm8.4 0h-8.4l6.012-6.012A8.352 8.352 0 0120.4 12z" />
        </svg>
      ),
    },
  ];

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, "");

    // If it starts with a digit (no +), assume US and add +1
    if (cleaned && !cleaned.startsWith("+")) {
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length <= 10) {
        // Format as (XXX) XXX-XXXX
        const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
          let formatted = "";
          if (match[1]) formatted += `(${match[1]}`;
          if (match[1]?.length === 3) formatted += ") ";
          if (match[2]) formatted += match[2];
          if (match[2]?.length === 3) formatted += "-";
          if (match[3]) formatted += match[3];
          return formatted;
        }
      }
    }

    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setPhoneError("");
  };

  const validatePhone = () => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneError("Please enter a valid phone number");
      return false;
    }
    return true;
  };

  const handleGoogleSignIn = async () => {
    if (!validatePhone()) return;

    setIsLoading(true);

    // Store phone number in localStorage for after OAuth redirect
    const digits = phoneNumber.replace(/\D/g, "");
    const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
    localStorage.setItem("pendingPhone", e164);
    localStorage.setItem("pendingModel", selectedModel);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding?from=landing`,
      },
    });

    if (error) {
      setIsLoading(false);
      console.error("OAuth error:", error);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "-2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: "-4s" }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

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
                Setup in <span className="text-white font-medium">under 2 minutes</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-reveal" style={{ animationDelay: "0.1s" }}>
              <span className="text-white">Your personal AI</span>
              <br />
              <span className="gradient-text text-glow">on WhatsApp</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-8 animate-reveal" style={{ animationDelay: "0.2s" }}>
              A full-power AI assistant that works 24/7 — research, write, analyze, and automate tasks. Just text it. No apps, no setup, no coding.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 animate-reveal" style={{ animationDelay: "0.3s" }}>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">2 min</div>
                <div className="text-sm text-zinc-500">to setup</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-zinc-500">available</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">$20</div>
                <div className="text-sm text-zinc-500">/month</div>
              </div>
            </div>
          </div>

          {/* Right: Setup Card */}
          <div className="animate-reveal" style={{ animationDelay: "0.2s" }}>
            <TiltCard>
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden">
                {/* Gradient glow at top */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                {/* Step 1: Choose Model */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">1</span>
                    Choose your AI model
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => model.available && setSelectedModel(model.id)}
                        disabled={!model.available}
                        className={clsx(
                          "relative p-3 rounded-xl border transition-all duration-200",
                          model.available
                            ? selectedModel === model.id
                              ? "border-emerald-500 bg-emerald-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                            : "border-white/5 bg-white/[0.02] cursor-not-allowed opacity-50"
                        )}
                      >
                        {!model.available && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
                            Soon
                          </span>
                        )}
                        <div className={clsx(
                          "w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center",
                          model.available ? `bg-gradient-to-br ${model.color}` : "bg-zinc-800"
                        )}>
                          <span className="text-white">{model.icon}</span>
                        </div>
                        <p className="text-xs font-medium text-white">{model.name}</p>
                        <p className="text-[10px] text-zinc-500">{model.provider}</p>
                        {selectedModel === model.id && model.available && (
                          <div className="absolute top-2 right-2">
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Phone Number */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">2</span>
                    Your WhatsApp number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <PhoneIcon className="w-5 h-5 text-zinc-500" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="+1 555 123 4567"
                      className={clsx(
                        "w-full pl-12 pr-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all",
                        phoneError
                          ? "border-red-500/50 focus:ring-red-500/30"
                          : "border-white/10 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                      )}
                    />
                  </div>
                  {phoneError && (
                    <p className="mt-2 text-sm text-red-400">{phoneError}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">
                    We'll send your assistant to this number
                  </p>
                </div>

                {/* Step 3: Sign In */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold">3</span>
                    Create your assistant
                  </label>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
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
                        Continue with Google
                      </>
                    )}
                  </button>
                </div>

                {/* Price note */}
                <p className="mt-4 text-center text-xs text-zinc-500">
                  $20/month • Cancel anytime
                </p>
              </div>
            </TiltCard>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDownIcon className="w-6 h-6 text-zinc-600" />
      </div>
    </section>
  );
}

function TimeComparisonSection() {
  const diySteps = [
    { task: "Rent a cloud server (VPS)", time: "15 min" },
    { task: "Set up SSH and security", time: "10 min" },
    { task: "Install Node.js & dependencies", time: "10 min" },
    { task: "Install and configure AI agent", time: "15 min" },
    { task: "Connect to WhatsApp", time: "10 min" },
    { task: "Test and debug setup", time: "20 min" },
  ];

  const totalDiyTime = 80; // minutes

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Save <span className="gradient-text">hours of setup</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Setting up your own AI assistant is complex. We handle everything so you don't have to.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* DIY Column */}
          <div className="relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Do it yourself</h3>
              <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm font-medium">
                ~{totalDiyTime} min
              </span>
            </div>

            <div className="space-y-3 mb-6">
              {diySteps.map((step, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-zinc-400 text-sm">{step.task}</span>
                  <span className="text-zinc-500 text-sm">{step.time}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-red-400">
                <span className="font-semibold">Plus:</span> debugging errors, security updates, and ongoing maintenance.
              </p>
            </div>
          </div>

          {/* YourClaw Column */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-zinc-900/50 border border-emerald-500/20">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">With YourClaw</h3>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                &lt;2 min
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl font-bold gradient-text mb-4">2</div>
              <p className="text-xl text-white mb-2">minutes</p>
              <p className="text-zinc-400 text-center">
                Enter your phone, sign in with Google, done.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "No server to manage",
                "No technical knowledge required",
                "No maintenance or updates",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCasesMarquee() {
  const useCases = [
    { icon: BellIcon, text: "Set reminders and follow-ups" },
    { icon: LanguageIcon, text: "Translate messages in real time" },
    { icon: InboxIcon, text: "Organize your inbox" },
    { icon: ChatBubbleLeftRightIcon, text: "Answer support tickets" },
    { icon: DocumentTextIcon, text: "Summarize long documents" },
    { icon: CurrencyDollarIcon, text: "Track expenses and receipts" },
    { icon: DocumentDuplicateIcon, text: "Compare insurance quotes" },
    { icon: CreditCardIcon, text: "Manage subscriptions" },
    { icon: ClockIcon, text: "Remind you of deadlines" },
    { icon: MagnifyingGlassIcon, text: "Find best prices online" },
    { icon: TagIcon, text: "Find discount codes" },
    { icon: ArrowTrendingDownIcon, text: "Price-drop alerts" },
    { icon: AdjustmentsHorizontalIcon, text: "Compare product specs" },
    { icon: ChatBubbleLeftRightIcon, text: "Negotiate deals" },
    { icon: PresentationChartBarIcon, text: "Create presentations from bullet points" },
    { icon: PaperAirplaneIcon, text: "Book travel and hotels" },
    { icon: CakeIcon, text: "Find recipes from ingredients" },
    { icon: ShareIcon, text: "Draft social posts" },
    { icon: PencilSquareIcon, text: "Write content and copy" },
    { icon: ChartBarIcon, text: "Set and track goals" },
    { icon: FunnelIcon, text: "Screen cold outreach" },
    { icon: BriefcaseIcon, text: "Draft job descriptions" },
    { icon: UserGroupIcon, text: "Run standup summaries" },
    { icon: ClipboardDocumentListIcon, text: "Track project progress" },
  ];

  // Split into rows for the marquee
  const row1 = useCases.slice(0, 8);
  const row2 = useCases.slice(8, 16);
  const row3 = useCases.slice(16, 24);

  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What can <span className="gradient-text">YourClaw</span> do for you?
          </h2>
          <p className="text-lg text-zinc-400">
            One assistant, endless possibilities
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

        {/* Row 1 - scrolls right */}
        <div className="flex gap-4 mb-4 animate-marquee">
          {[...row1, ...row1].map((useCase, i) => (
            <UseCasePill key={i} icon={useCase.icon} text={useCase.text} />
          ))}
        </div>

        {/* Row 2 - scrolls left */}
        <div className="flex gap-4 mb-4 animate-marquee-reverse">
          {[...row2, ...row2].map((useCase, i) => (
            <UseCasePill key={i} icon={useCase.icon} text={useCase.text} variant="outlined" />
          ))}
        </div>

        {/* Row 3 - scrolls right slower */}
        <div className="flex gap-4 animate-marquee-slow">
          {[...row3, ...row3].map((useCase, i) => (
            <UseCasePill key={i} icon={useCase.icon} text={useCase.text} />
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasePill({
  icon: Icon,
  text,
  variant = "filled",
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  variant?: "filled" | "outlined";
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap flex-shrink-0 transition-all duration-300",
        variant === "filled"
          ? "bg-zinc-900 border border-white/5 hover:border-white/10"
          : "bg-transparent border border-dashed border-zinc-700 hover:border-zinc-500"
      )}
    >
      <Icon className="w-4 h-4 text-zinc-500" />
      <span className="text-sm text-zinc-300">{text}</span>
    </div>
  );
}


function FeaturesSection() {
  const features = [
    {
      icon: SparklesIcon,
      title: "Full AI power",
      description: "Powered by Claude, one of the most capable AI models. Not a simple chatbot — a true assistant.",
      gradient: "from-emerald-500 to-cyan-500",
    },
    {
      icon: ClockIcon,
      title: "Always on",
      description: "Your assistant runs 24/7 on secure cloud servers. Ask anything, anytime — it never sleeps.",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: BoltIcon,
      title: "Instant setup",
      description: "Sign up, enter your phone number, done. No VPS, no terminal, no DevOps knowledge required.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: ShieldCheckIcon,
      title: "Private & secure",
      description: "Your data stays yours. Encrypted at rest, never sold, never used to train models.",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Not a chatbot.{" "}
            <span className="gradient-text">A real assistant.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            YourClaw can browse the web, run code, create files, and take action — things regular chatbots can't do.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <SpotlightCard
              key={i}
              className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-300 card-hover"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-zinc-400">
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
    <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Get things done{" "}
              <span className="gradient-text">without leaving WhatsApp</span>
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Just text your assistant like you'd text a friend.
              Research, analyze, write, plan — all through natural conversation.
            </p>

            <div className="space-y-4">
              {[
                "Research any topic in depth",
                "Write emails, reports, and content",
                "Analyze documents and data",
                "Plan projects and track tasks",
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
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                Get started now
                <ArrowRightIcon className="w-4 h-4" />
              </a>
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
    { type: "user", text: "What's on my calendar today?" },
    { type: "ai", text: "You have 3 meetings today:\n\n• 10:00 AM — Team standup\n• 2:00 PM — Design review with Sarah\n• 4:30 PM — Client call with Acme Inc" },
    { type: "user", text: "Move the design review to tomorrow at the same time" },
    { type: "ai", text: "Done! I've rescheduled your design review with Sarah to tomorrow at 2:00 PM. I've also sent a calendar update to Sarah." },
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
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-[4rem] blur-2xl animate-pulse-glow" />

      {/* iPhone frame */}
      <div className="relative w-[320px] bg-zinc-950 rounded-[3.5rem] p-3 shadow-2xl border border-white/10">
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[100px] h-[32px] bg-black rounded-full z-20" />

        {/* Screen */}
        <div className="relative bg-zinc-900 rounded-[3rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-8 pt-14 pb-2 text-white text-xs">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
              </svg>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 4h-3V2h-4v2H7v18h10V4z" />
              </svg>
            </div>
          </div>

          {/* WhatsApp header */}
          <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-sm">YC</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">YourClaw</p>
              <p className="text-emerald-400 text-xs">online</p>
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
                  <span>9:41 AM</span>
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
      description: "Select your AI model and enter your WhatsApp number directly on our homepage.",
    },
    {
      number: "02",
      title: "Sign in with Google",
      description: "One-click authentication. We create your personal AI instance instantly.",
    },
    {
      number: "03",
      title: "Start chatting",
      description: "Your assistant sends you a message. Ask anything, manage your calendar, search emails.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready in <span className="gradient-text">2 minutes</span>
          </h2>
          <p className="text-lg text-zinc-400">
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

              <div className="relative text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 mb-6 group-hover:border-emerald-500/50 transition-colors">
                  <span className="text-2xl font-bold gradient-text">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-zinc-400">
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
    "Web browsing & research",
    "File creation & analysis",
    "Code execution",
    "24/7 availability",
    "Priority support",
  ];

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-zinc-400">
            One plan. Everything included.
          </p>
        </div>

        <TiltCard>
          <div className="relative p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden">
            {/* Gradient glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">$20</span>
                <span className="text-xl text-zinc-500">/month</span>
              </div>
              <p className="mt-2 text-zinc-500">Cancel anytime</p>
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

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="block w-full text-center py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Get Started
            </a>

            <p className="mt-4 text-center text-sm text-zinc-500">
              Need more? Add your own API key for unlimited usage.
            </p>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What is YourClaw?",
      answer: "YourClaw gives you a personal AI assistant on WhatsApp. Powered by OpenClaw — a powerful open-source AI agent framework — it can research, write, analyze, code, and help with any task. All through simple chat.",
    },
    {
      question: "How is this different from ChatGPT?",
      answer: "YourClaw is a full AI agent, not just a chatbot. It can browse the web, run code, create files, and take real actions. Plus, it's on WhatsApp — no app switching, no browser tabs. Just text.",
    },
    {
      question: "Do I need to download an app?",
      answer: "No app needed. Everything happens through WhatsApp. Just sign up, enter your phone number, and start chatting. Your assistant texts you when it's ready.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. Each user gets their own isolated AI instance running on dedicated infrastructure. Your data is encrypted, never shared, and never used to train models.",
    },
    {
      question: "What can the assistant actually do?",
      answer: "Research topics online, write content and emails, analyze documents, run code, create files, compare products, summarize long texts, and much more. If you can describe it, it can probably do it.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
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
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-purple-500/20" />
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" />

          {/* Content */}
          <div className="relative px-8 py-16 sm:px-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
              Your AI assistant is waiting. Set it up in 2 minutes and start managing your day smarter.
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Get Started — $20/month
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="mt-4 text-sm text-zinc-500">
              Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
