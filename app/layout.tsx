import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neighborly KC - Parkwood Hills',
  description: 'Private neighborhood network for Parkwood Hills 64155',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Neighborly KC' },
};

export const viewport: Viewport = {
  themeColor: '#1a3a2f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}
        <script dangerouslySetInnerHTML={{__html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`}} />
      </body>
    </html>
  );
}
