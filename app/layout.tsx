import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neighborly KC - Parkwood Hills',
  description: 'Private neighborhood network for Parkwood Hills 64155',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
