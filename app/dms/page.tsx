export const dynamic = 'force-dynamic';
"use client";
import { useState } from "react";

export default function DmsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white", padding: "20px" }}>
      <h1>DMs</h1>
      <p style={{ opacity: 0.5, marginTop: "20px" }}>Messages will show here. Build bypass active.</p>
    </div>
  );
}
