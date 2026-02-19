"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { blogPosts } from "@/lib/blog-data";

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
};

function renderMarkdown(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-white mt-8 mb-3">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered list items
    if (line.startsWith("- ")) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        listItems.push(
          <li key={i} className="text-zinc-300 font-light leading-relaxed">
            {formatInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-2 my-4 ml-2">
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(
          <li key={i} className="text-zinc-300 font-light leading-relaxed">
            {formatInline(lines[i].replace(/^\d+\.\s/, ""))}
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-2 my-4 ml-2">
          {listItems}
        </ol>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-zinc-300 font-light leading-relaxed my-4">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold + italic
    const boldItalicMatch = remaining.match(/\*\*\*(.*?)\*\*\*/);
    // Bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/\*(.*?)\*/);
    // Inline code
    const codeMatch = remaining.match(/`(.*?)`/);
    // Links
    const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

    // Find earliest match
    const matches = [
      boldItalicMatch ? { type: "boldItalic", match: boldItalicMatch } : null,
      boldMatch ? { type: "bold", match: boldMatch } : null,
      italicMatch ? { type: "italic", match: italicMatch } : null,
      codeMatch ? { type: "code", match: codeMatch } : null,
      linkMatch ? { type: "link", match: linkMatch } : null,
    ]
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const earliest = matches[0];
    const idx = earliest.match.index ?? 0;

    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    switch (earliest.type) {
      case "boldItalic":
        parts.push(<strong key={keyIdx} className="font-semibold text-white italic">{earliest.match[1]}</strong>);
        break;
      case "bold":
        parts.push(<strong key={keyIdx} className="font-semibold text-white">{earliest.match[1]}</strong>);
        break;
      case "italic":
        parts.push(<em key={keyIdx} className="italic text-zinc-200">{earliest.match[1]}</em>);
        break;
      case "code":
        parts.push(
          <code key={keyIdx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 text-sm font-mono">
            {earliest.match[1]}
          </code>
        );
        break;
      case "link":
        parts.push(
          <Link key={keyIdx} href={earliest.match[2]} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            {earliest.match[1]}
          </Link>
        );
        break;
    }

    remaining = remaining.slice(idx + earliest.match[0].length);
    keyIdx++;
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const postIndex = blogPosts.findIndex((p) => p.slug === slug);
  const post = blogPosts[postIndex];

  if (!post) {
    return (
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Post not found</h1>
        <Link href="/blog" className="text-emerald-400 hover:text-emerald-300">
          Back to blog
        </Link>
      </div>
    );
  }

  const colors = categoryColors[post.categoryColor];
  const prevPost = postIndex > 0 ? blogPosts[postIndex - 1] : null;
  const nextPost = postIndex < blogPosts.length - 1 ? blogPosts[postIndex + 1] : null;

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <article className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All articles
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className={clsx(
            "px-3 py-1 rounded-full text-xs font-medium border",
            colors.bg,
            colors.text,
            colors.border,
          )}>
            {post.category}
          </span>
          <span className="text-xs text-zinc-500">{post.date}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span className="text-xs text-zinc-500">{post.readingTime}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-lg text-zinc-400 font-light leading-relaxed mb-10 border-l-2 border-emerald-500/30 pl-4">
          {post.excerpt}
        </p>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

        {/* Content */}
        <div className="prose-custom">
          {renderMarkdown(post.content)}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-16 mb-10" />

        {/* Prev / Next navigation */}
        <div className="grid sm:grid-cols-2 gap-4">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <ArrowLeftIcon className="w-3 h-3" />
                Previous
              </div>
              <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                {prevPost.title}
              </div>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all text-right"
            >
              <div className="text-xs text-zinc-500 mb-1 flex items-center justify-end gap-1">
                Next
                <ArrowRightIcon className="w-3 h-3" />
              </div>
              <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                {nextPost.title}
              </div>
            </Link>
          ) : <div />}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready to try it yourself?</h3>
          <p className="text-sm text-zinc-400 mb-6">Get your personal AI assistant on WhatsApp or Telegram in under 1 minute.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            Get Started Free
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}
