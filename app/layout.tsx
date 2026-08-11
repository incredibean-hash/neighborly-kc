import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Neighborly KC",
  description: "Kansas City neighborhood network - 40 mile radius",
  manifest: "/manifest.json?v=2",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Neighborly KC" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  backgroundColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-[#0a0a0a]">
        <script dangerouslySetInnerHTML={{__html:`
          if('serviceWorker' in navigator){
            navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));
          }
          localStorage.removeItem('nkc_profile_tiered_40');
        `}} />
        {children}
      </body>
    </html>
  );
}
