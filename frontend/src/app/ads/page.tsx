"use client";

/**
 * Ad image templates for Meta ads.
 * Open /ads in browser and screenshot each card at the right dimensions.
 *
 * Feed ad: 1200x628 — screenshot the "Feed" section
 * Story ad: 1080x1920 — screenshot the "Story" section
 */

function AdFeed1() {
  return (
    <div
      style={{ width: 1200, height: 628 }}
      className="relative flex items-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
    >
      {/* Left content */}
      <div className="flex-1 px-16">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl font-bold text-emerald-400">
            Y
          </div>
          <span className="text-2xl font-semibold text-white">YourClaw</span>
        </div>
        <h1 className="text-5xl font-bold leading-tight text-white">
          Deploy OpenClaw
          <br />
          <span className="text-emerald-400">in seconds.</span>
        </h1>
        <p className="mt-4 max-w-md text-xl text-zinc-400">
          Your own OpenClaw instance on WhatsApp & Telegram. No Docker. No servers. No setup.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <div className="rounded-full bg-emerald-500 px-6 py-3 text-lg font-semibold text-white">
            Start free trial
          </div>
          <span className="text-lg text-zinc-500">48h free &middot; $29/mo</span>
        </div>
      </div>

      {/* Right: WhatsApp mockup */}
      <div className="mr-16 w-80 shrink-0">
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/80 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center gap-2 border-b border-zinc-700/50 pb-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">Y</div>
            <span className="text-sm font-medium text-white">YourClaw</span>
            <span className="ml-auto text-xs text-emerald-400">online</span>
          </div>
          <div className="space-y-2">
            <div className="self-end rounded-lg rounded-tr-sm bg-emerald-600/20 px-3 py-2 text-sm text-white ml-auto max-w-[85%]">
              Find me the cheapest flight to NYC next week
            </div>
            <div className="rounded-lg rounded-tl-sm bg-zinc-700/50 px-3 py-2 text-sm text-zinc-200 max-w-[85%]">
              I found 3 options. The cheapest is Delta, $287 round trip departing Feb 18. Want me to check hotels too?
            </div>
            <div className="self-end rounded-lg rounded-tr-sm bg-emerald-600/20 px-3 py-2 text-sm text-white ml-auto max-w-[85%]">
              Yes, under $150/night near Times Square
            </div>
          </div>
        </div>
      </div>

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
    </div>
  );
}

function AdFeed2() {
  return (
    <div
      style={{ width: 1200, height: 628 }}
      className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
    >
      <div className="text-center px-16">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-500/20 text-3xl font-bold text-emerald-400">
            Y
          </div>
        </div>
        <h1 className="text-6xl font-bold text-white leading-tight">
          OpenClaw is powerful.
          <br />
          <span className="text-zinc-500">Setting it up isn&apos;t.</span>
        </h1>
        <div className="mt-8 flex items-center justify-center gap-12">
          <div className="text-center">
            <div className="text-4xl font-bold text-red-400">~80 min</div>
            <div className="mt-1 text-lg text-zinc-500">DIY setup</div>
            <div className="mt-2 text-sm text-zinc-600">Docker, Node.js, API keys,<br/>server config, debugging...</div>
          </div>
          <div className="text-5xl text-zinc-600">vs</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">~1 min</div>
            <div className="mt-1 text-lg text-zinc-400">YourClaw</div>
            <div className="mt-2 text-sm text-zinc-500">Sign up, pick a channel,<br/>start chatting.</div>
          </div>
        </div>
        <p className="mt-8 text-xl text-zinc-400">
          Your own OpenClaw instance on WhatsApp & Telegram &middot; 48h free trial
        </p>
      </div>
    </div>
  );
}

function AdFeed3() {
  return (
    <div
      style={{ width: 1200, height: 628 }}
      className="relative flex overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
    >
      {/* Left */}
      <div className="flex flex-1 flex-col justify-center px-16">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 w-fit">
          Fully managed OpenClaw
        </div>
        <h1 className="text-5xl font-bold leading-tight text-white">
          Your AI assistant.
          <br />
          <span className="text-emerald-400">Zero DevOps.</span>
        </h1>
        <ul className="mt-6 space-y-3 text-lg text-zinc-300">
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">&#10003;</span> Browses the web in real-time
          </li>
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">&#10003;</span> Executes code & manages files
          </li>
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">&#10003;</span> Remembers your preferences
          </li>
          <li className="flex items-center gap-3">
            <span className="text-emerald-400">&#10003;</span> Works on WhatsApp & Telegram
          </li>
        </ul>
        <div className="mt-6 flex items-center gap-4">
          <div className="rounded-full bg-emerald-500 px-6 py-3 text-lg font-semibold text-white">
            Try free for 48h
          </div>
          <span className="text-zinc-500">$29/month &middot; Cancel anytime</span>
        </div>
      </div>

      {/* Right: Terminal mockup */}
      <div className="mr-16 flex w-96 shrink-0 items-center">
        <div className="w-full rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2.5">
            <div className="size-3 rounded-full bg-red-500/60" />
            <div className="size-3 rounded-full bg-yellow-500/60" />
            <div className="size-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-zinc-500">No terminal needed</span>
          </div>
          <div className="p-4 font-mono text-sm">
            <div className="text-zinc-600 line-through">$ docker pull openclaw/openclaw</div>
            <div className="text-zinc-600 line-through">$ npm install -g openclaw</div>
            <div className="text-zinc-600 line-through">$ export ANTHROPIC_API_KEY=sk-...</div>
            <div className="text-zinc-600 line-through">$ openclaw gateway --port 18789</div>
            <div className="mt-4 text-emerald-400">Just go to yourclaw.dev</div>
            <div className="text-emerald-400">and start chatting. That&apos;s it.</div>
            <div className="mt-2 animate-pulse text-emerald-400">_</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <div className="min-h-screen bg-black p-8 space-y-16">
      <div>
        <h2 className="text-white text-xl font-bold mb-4">Ad 1 — Feed (1200x628) — Deploy OpenClaw in seconds</h2>
        <div className="inline-block border border-zinc-700">
          <AdFeed1 />
        </div>
      </div>

      <div>
        <h2 className="text-white text-xl font-bold mb-4">Ad 2 — Feed (1200x628) — 80 min vs 1 min comparison</h2>
        <div className="inline-block border border-zinc-700">
          <AdFeed2 />
        </div>
      </div>

      <div>
        <h2 className="text-white text-xl font-bold mb-4">Ad 3 — Feed (1200x628) — Zero DevOps features</h2>
        <div className="inline-block border border-zinc-700">
          <AdFeed3 />
        </div>
      </div>

      <div className="text-zinc-500 text-sm">
        <p>Screenshot each ad at exactly 1200x628px.</p>
        <p>Tip: Use Chrome DevTools device toolbar, set to 1200x628, screenshot the ad div.</p>
      </div>
    </div>
  );
}
