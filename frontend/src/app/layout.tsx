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
    default: "YourClaw — Personal AI Assistant on WhatsApp",
    template: "%s | YourClaw",
  },
  description: "Get a full-power AI assistant on WhatsApp. Research, write, analyze, and automate tasks — just text it. No apps, no coding. Ready in 2 minutes.",
  keywords: ["AI assistant", "WhatsApp AI", "personal assistant", "Claude AI", "AI automation", "WhatsApp bot", "AI agent"],
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
    title: "YourClaw — Personal AI Assistant on WhatsApp",
    description: "Get a full-power AI assistant on WhatsApp. Research, write, analyze, and automate tasks — just text it. Ready in 2 minutes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "YourClaw - AI Assistant on WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YourClaw — Personal AI Assistant on WhatsApp",
    description: "Get a full-power AI assistant on WhatsApp. Research, write, analyze, and automate tasks — just text it.",
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
