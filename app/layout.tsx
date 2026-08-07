import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neighborly KC - Parkwood Hills',
  description: 'Private neighborhood network for Parkwood Hills 64155',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Neighborly KC' },
};

export const viewport: Viewport = {
  themeColor: '#1a3a2f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}
        <script dangerouslySetInnerHTML={{__html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').then(()=>console.log('sw ok')).catch(()=>{});});}`}} />
      </body>
    </html>
  );
}
