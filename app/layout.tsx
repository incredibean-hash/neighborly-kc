import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neighborly KC",
  description: "Kansas City neighborhood network",
  manifest: "/manifest.json?v=3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <meta name="theme-color" content="#004687" />
      </head>
      <body className="bg-[#f0f6ff]">{children}</body>
    </html>
  );
}
