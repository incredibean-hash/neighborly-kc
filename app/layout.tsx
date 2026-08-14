import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neighborly KC",
  description: "Kansas City neighborhood network",
  manifest: "/manifest.json?v=4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/neighborly-kc-logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#004687" />
      </head>
      <body className="bg-[#f0f6ff]">{children}</body>
    </html>
  );
}
