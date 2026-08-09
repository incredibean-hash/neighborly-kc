"use client";
import { useState } from "react";

export default function Page() {
  const [showJoin, setShowJoin] = useState(false);
  const [verified, setVerified] = useState(false);
  const [extracted, setExtracted] = useState("");
  const [feed, setFeed] = useState(false);

  const onFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // simulate AI extract - no popup
    setExtracted("123 Main St | 64155 Kansas City");
    setVerified(true);
    setTimeout(() => {
      setShowJoin(false);
      setFeed(true);
    }, 600);
  };

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="flex justify-between items-center">
        <h1 className="font-bold">Neighborly KC 📍 5mi</h1>
        <button onClick={() => setShowJoin(true)} className="bg-white text-black px-4 py-1 rounded-full font-bold">Join</button>
      </div>

      <div className="mt-20 text-center">
        {feed? <p className="text-green-400 font-bold">✓ Feed Unlocked - 40 Mile + Bluetooth Ready</p> : <p className="opacity-30">No posts in All</p>}
      </div>

      {showJoin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 p-6 rounded-2xl w-full max-w-md">
            <h
