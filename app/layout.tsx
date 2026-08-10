import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neighborly KC',
  description: 'Kansas City neighborhood network - 40 mile radius',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
