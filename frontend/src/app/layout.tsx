import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yourclaw.com"),
  title: {
    default: "YourClaw — Your OpenClaw Instance in Seconds",
    template: "%s | YourClaw",
  },
  description: "Deploy a fully managed OpenClaw AI assistant on WhatsApp & Telegram. No servers, no CLI, no setup. Just sign up and chat. Ready in 2 minutes.",
  keywords: ["OpenClaw", "AI assistant", "WhatsApp AI", "Telegram AI", "OpenClaw hosting", "AI agent", "deploy OpenClaw", "managed OpenClaw"],
  authors: [{ name: "YourClaw" }],
  creator: "YourClaw",
  publisher: "YourClaw",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yourclaw.com",
    siteName: "YourClaw",
    title: "YourClaw — Your OpenClaw Instance in Seconds",
    description: "Deploy a fully managed OpenClaw AI assistant on WhatsApp & Telegram. No servers, no CLI, no setup. Just sign up and chat.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YourClaw - Managed OpenClaw in Seconds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YourClaw — Your OpenClaw Instance in Seconds",
    description: "Deploy a fully managed OpenClaw AI assistant on WhatsApp & Telegram. No servers, no CLI, no setup. Just sign up and chat.",
    images: ["/og-image.png"],
    creator: "@yourclaw",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2E55TEMF7X"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2E55TEMF7X');
          `}
        </Script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
