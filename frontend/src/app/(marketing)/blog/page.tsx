"use client";

import Link from "next/link";
import { ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { SpotlightCard } from "@/components/marketing/mouse-gradient";
import { blogPosts } from "@/lib/blog-data";

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

export default function BlogIndexPage() {
  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-12"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            The <span className="gradient-text">YourClaw</span> Blog
          </h1>
          <p className="text-lg font-light text-zinc-400 max-w-2xl mx-auto">
            Guides, deep dives, and ideas on getting the most out of your AI assistant.
          </p>
        </div>

        {/* All posts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post, i) => {
            const colors = categoryColors[post.categoryColor];
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group"
              >
                <SpotlightCard className="relative h-full rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden">
                  <div className={`h-40 bg-gradient-to-br ${gradients[i % gradients.length]} relative`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl font-extrabold text-white/5 select-none">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-medium border",
                        colors.bg,
                        colors.text,
                        colors.border,
                      )}>
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                      <span>{post.date}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{post.readingTime}</span>
                    </div>
                    <h2 className="text-base font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:gap-2.5 transition-all">
                      Read article
                      <ArrowRightIcon className="w-4 h-4" />
                    </span>
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
