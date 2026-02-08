"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  SparklesIcon,
  KeyIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { MouseGradient, TiltCard } from "@/components/marketing/mouse-gradient";

export default function PricingPage() {
  return (
    <div className="relative">
      <MouseGradient />
      <HeroSection />
      <PricingCards />
      <WhatsIncluded />
      <CreditsExplainer />
      <FAQSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
          <SparklesIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-zinc-400">Simple pricing, no surprises</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
          One plan.{" "}
          <span className="gradient-text">Everything included.</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto">
          $20/month gets you a personal AI assistant on WhatsApp.
          Cancel anytime.
        </p>
      </div>
    </section>
  );
}

function PricingCards() {
  const includedFeatures = [
    "Unlimited WhatsApp messages",
    "$10 in AI credits included",
    "Google Calendar integration",
    "Gmail integration",
    "Google Drive integration",
    "24/7 availability",
    "Context memory",
    "Priority support",
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Main Pricing Card */}
        <TiltCard>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-purple-500/30 rounded-[2rem] blur-xl" />

            <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-white/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-900 text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
                  Everything you need
                </span>
              </div>

              {/* Gradient line at top */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

              <div className="text-center mb-8 pt-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-bold text-white">$20</span>
                  <span className="text-xl text-zinc-500">/month</span>
                </div>
                <p className="mt-3 text-zinc-500">
                  Billed monthly. Cancel anytime.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {includedFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                className="group block w-full text-center px-6 py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <p className="mt-4 text-center text-sm text-zinc-500">
                7-day money-back guarantee
              </p>
            </div>
          </div>
        </TiltCard>

        {/* BYOK callout */}
        <div className="mt-6 bg-zinc-900/50 rounded-2xl p-6 border border-white/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <KeyIcon className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Power User?</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Bring your own Anthropic API key for unlimited usage. Same $20/month base price — you just pay Anthropic directly for AI costs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsIncluded() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* OpenClaw + Claude callout */}
        <div className="relative bg-zinc-900 rounded-2xl p-8 text-center border border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* OpenClaw */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-white/10">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <span className="text-zinc-900 font-bold text-xs">Y</span>
                </div>
                <span className="text-sm text-zinc-300">OpenClaw</span>
              </div>
              <span className="text-zinc-600">+</span>
              {/* Claude */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-white/10">
                <div className="w-6 h-6 rounded bg-[#D97757] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <span className="text-sm text-zinc-300">Claude AI</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Enterprise-grade AI infrastructure
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              Built on OpenClaw, the open-source AI agent framework. Powered by Claude, one of the most capable AI models available.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreditsExplainer() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            How credits work
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-emerald-400">$10</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Monthly credits</h3>
            <p className="text-sm text-zinc-400">
              $10 in AI credits included with your subscription. Resets every month.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-blue-400">~100</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Daily messages</h3>
            <p className="text-sm text-zinc-400">
              Typical usage covers 50-100+ messages per day, depending on complexity.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-purple-400">∞</span>
            </div>
            <h3 className="font-semibold text-white mb-2">BYOK unlimited</h3>
            <p className="text-sm text-zinc-400">
              Add your own API key for unlimited usage. Pay Anthropic directly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What are AI credits?",
      answer: "AI credits cover the cost of running your assistant. Each interaction uses a small amount of credits based on complexity. Your $20/month includes $10 worth of credits, which covers typical daily usage (50-100+ messages per day).",
    },
    {
      question: "What happens if I run out of credits?",
      answer: "Your assistant will let you know when credits are low. You can either wait until your next billing cycle when credits reset, or add your own Anthropic API key for unlimited usage.",
    },
    {
      question: "How does BYOK (Bring Your Own Key) work?",
      answer: "Add your own Anthropic API key in your dashboard. Your AI will use your key directly — you pay Anthropic for usage with no credit limits. You still pay the $20/month base for infrastructure and integrations.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes! No contracts or commitments. Cancel anytime from your dashboard. You'll have access until the end of your billing period.",
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes. Cancel within the first 7 days for a full refund. No questions asked.",
    },
    {
      question: "Will you add annual billing?",
      answer: "Coming soon! Monthly billing gives you flexibility while we're in early access.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Pricing FAQ
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
              Ready to get your AI assistant?
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              2-minute setup. Your AI is waiting on WhatsApp.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Get Started — $20/month
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              Cancel anytime. 7-day money-back guarantee.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
