"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Logo } from "@/components/logo";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed top-10 left-0 right-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-zinc-950/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size="md" variant="dark" href="/" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/#features">Features</NavLink>
            <NavLink href="/#how-it-works">How it works</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/blog">Blog</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="group relative px-5 py-2.5 text-sm font-semibold text-zinc-900 rounded-full overflow-hidden transition-all duration-300"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-300 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Get Started</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={clsx(
            "md:hidden overflow-hidden transition-all duration-300",
            mobileMenuOpen ? "max-h-80 pb-4" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-1 pt-4 border-t border-white/5">
            <MobileNavLink href="/#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </MobileNavLink>
            <MobileNavLink href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              How it works
            </MobileNavLink>
            <MobileNavLink href="/pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </MobileNavLink>
            <MobileNavLink href="/blog" onClick={() => setMobileMenuOpen(false)}>
              Blog
            </MobileNavLink>
            <MobileNavLink href="/#faq" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </MobileNavLink>
            <div className="pt-4 mt-2 border-t border-white/5 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white text-center"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-zinc-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors group"
    >
      <span>{children}</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 group-hover:w-4 transition-all duration-300" />
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
    >
      {children}
    </Link>
  );
}
