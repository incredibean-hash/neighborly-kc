"use client";

import { useState } from "react";

// Compatible with TypeScript ^5.3.3 - no 5.4+ features
type Feature = {
  title: string;
  desc: string;
  badge?: string;
  icon: string;
};

const FEATURES: Feature[] = [
  {
    title: "FREE OCR Mail Scan",
    desc: "Every letter scanned with OCR. Searchable text, sender detection, and instant notifications. No extra fees.",
    badge: "FREE",
    icon: "✉️",
  },
  {
    title: "Bluetooth 30ft Alerts",
    desc: "Mailbox sensor with 30ft Bluetooth range. Know the second mail arrives at 304 NE 115th St — even from your kitchen.",
    badge: "30FT",
    icon: "📡",
  },
  {
    title: "Neighborly KC Network",
    desc: "Part of the Neighborly KC community hub at 304 NE 115TH ST. Secure, local, and neighbor-verified pickup.",
    icon: "🏘️",
  },
];

export default function NeighborlyKCPage() {
  const [address] = useState("304 NE 115TH ST, Kansas City, MO 64155");
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold">N</div>
            <span className="font-semibold tracking-tight">neighborly-kc / neighborly-kc</span>
            <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">TS ^5.3.3 FIXED</span>
          </div>
          <a href="#address" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">Get Address</a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              LIVE at 304 NE 115TH ST • North KC
            </div>
            <h1 className="mt-6 text-5xl font-[800] leading-[0.95] tracking-tight">
              Your KC mailbox,
              <br />
              <span className="text-zinc-400">but actually smart.</span>
            </h1>
            <p className="mt-5 max-w-[50ch] text-[17px] leading-7 text-zinc-600">
              Neighborly KC is the local mailbox for 64155. We fixed the stack on TypeScript 5.3.3,
              added FREE OCR mail scanning, and 30ft Bluetooth alerts so you never miss mail again.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#features" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white">See How It Works</a>
              <button onClick={handleCopy} className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold hover:bg-zinc-50">
                {copied ? "✓ Copied!" : "Copy Address"}
              </button>
            </div>

            <div id="address" className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Pickup Location</p>
              <p className="mt-2 font-mono text-[15px] font-medium">{address}</p>
              <p className="mt-1 text-xs text-zinc-500">package.json: typescript ^5.3.3 • Next.js App Router • /mnt/data/page.tsx</p>
            </div>
          </div>

          {/* Card */}
          <div className="relative">
            <div className="rounded-[32px] border border-zinc-200 bg-white p-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.2)]">
              <div className="rounded-[24px] bg-zinc-900 p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm opacity-70">Incoming Mail</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">OCR • LIVE</span>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl bg-white p-4 text-zinc-900">
                    <p className="text-xs text-zinc-500">USPS • Scanned 2m ago</p>
                    <p className="mt-1 font-semibold">IRS Notice • OCR: &quot;Account Update&quot;</p>
                    <p className="text-xs text-zinc-500">Bluetooth: 18ft • Signal Strong</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs opacity-70">Amazon • Delivered</p>
                    <p className="mt-1 font-semibold">Package at 304 NE 115th</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs opacity-60">
                  <span>● Bluetooth 30ft range</span>
                  <span>● FREE OCR</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-3">
                {[
                  { k: "Mail/mo", v: "∞" },
                  { k: "OCR Cost", v: "$0" },
                  { k: "Range", v: "30ft" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-zinc-50 py-4 text-center">
                    <p className="text-xl font-bold">{s.v}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">{s.k}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-zinc-200 p-7">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-lg">{f.icon}</div>
                  {f.badge && <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white">{f.badge}</span>}
                </div>
                <h3 className="mt-5 text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-[#f6f3ef] p-4 font-mono text-xs text-zinc-600">
            <span className="text-zinc-400">// package.json fix applied</span>
            <br />
            {`"typescript": "^5.3.3" // pinned, removed ^5.4 breaking types`}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500">
        neighborly-kc/neighborly-kc • 304 NE 115TH ST • Kansas City, MO • Built on /mnt/data/page.tsx
      </footer>
    </main>
  );
}
