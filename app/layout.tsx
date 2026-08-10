
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Neighborly KC", description: "Neighborly KC - 5mi - 304 NE 115TH ST" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
