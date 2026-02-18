import Link from "next/link";
import clsx from "clsx";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
  variant?: "light" | "dark" | "auto";
}

function LobsterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="currentColor"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Antennae */}
      <path d="M19 10 Q13 4 8 2" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M29 10 Q35 4 40 2" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left claw (koru spiral) */}
      <path d="M14 14 C8 8 -1 8 0 16 C1 23 9 21 13 18 Z" stroke="none" />
      {/* Right claw (koru spiral) */}
      <path d="M34 14 C40 8 49 8 48 16 C47 23 39 21 35 18 Z" stroke="none" />
      {/* Head */}
      <path d="M16 9 Q24 4 32 9 L32 14 L16 14 Z" stroke="none" />
      {/* Body segment 1 — shark teeth bottom */}
      <path d="M15 16 L33 16 L33 21 L30.5 18.5 L28 21 L25.5 18.5 L23 21 L20.5 18.5 L18 21 L15 21 Z" stroke="none" />
      {/* Body segment 2 — shark teeth bottom */}
      <path d="M16 23.5 L32 23.5 L32 28 L29.5 26 L27 28 L24.5 26 L22 28 L19.5 26 L16 28 Z" stroke="none" />
      {/* Body segment 3 — shark teeth bottom */}
      <path d="M17 30.5 L31 30.5 L31 34.5 L29 32.5 L27 34.5 L24.5 32.5 L22 34.5 L20 32.5 L17 34.5 Z" stroke="none" />
      {/* Body segment 4 */}
      <rect x="18" y="37" width="12" height="3.5" rx="0.5" stroke="none" />
      {/* Tail fan */}
      <path d="M18 42 L11 50 L17 47.5 L21.5 51.5 L24 53 L26.5 51.5 L31 47.5 L37 50 L30 42 Z" stroke="none" />
      {/* Legs */}
      <path d="M15 19 L9 23" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M33 19 L39 23" fill="none" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 26 L11 29.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 26 L37 29.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 33 L13 36" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M31 33 L35 36" fill="none" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = "md", showText = true, href, className, variant = "auto" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-sm" },
    md: { icon: "w-8 h-8", text: "text-lg" },
    lg: { icon: "w-10 h-10", text: "text-xl" },
  };

  const textColors = {
    light: "text-zinc-950",
    dark: "text-white",
    auto: "text-zinc-950 dark:text-white",
  };

  const content = (
    <div className={clsx("flex items-center gap-2 group", className)}>
      <div
        className={clsx(
          "relative rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center overflow-hidden group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-shadow duration-300",
          sizes[size].icon
        )}
      >
        <LobsterIcon className="w-[75%] h-[75%] text-zinc-900" />
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {showText && (
        <span className={clsx("font-bold", textColors[variant], sizes[size].text)}>
          YourClaw
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
