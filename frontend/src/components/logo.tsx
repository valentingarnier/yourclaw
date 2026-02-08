import Link from "next/link";
import clsx from "clsx";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
  variant?: "light" | "dark" | "auto";
}

export function Logo({ size = "md", showText = true, href = "/", className, variant = "auto" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-sm", iconText: "text-xs" },
    md: { icon: "w-8 h-8", text: "text-lg", iconText: "text-sm" },
    lg: { icon: "w-10 h-10", text: "text-xl", iconText: "text-base" },
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
        <span className={clsx("text-zinc-900 font-bold", sizes[size].iconText)}>Y</span>
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
