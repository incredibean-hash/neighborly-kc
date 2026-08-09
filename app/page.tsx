"use client";
import { useState } from "react";

export default function Page() {
  const [showJoin, setShowJoin] = useState(false);
  const [feed, setFeed] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Neighborly KC 5mi</h1>
        <button onClick={() => setShowJoin(true)} style={{ background: "white", color: "black", padding: "5px 15px", borderRadius: "20px" }}>Join</button>
      </div>

      <div style={{ marginTop: "80px", textAlign: "center" }}>
        {feed ? <p style={{ color: "#4ade80" }}>Feed Unlocked - 40 Mile + Bluetooth Ready - NO POPUP</p> : <p style={{ opacity: 0.3 }}>No posts in All</p>}
      </div>

      {showJoin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#18181b", padding: "20px", borderRadius: "20px", width: "100%", maxWidth: "400px" }}>
            <h2>Join Parkwood Hills</h2>
            <input type="file" onChange={() => { setFeed(true); setShowJoin(false); }} style={{ margin: "15px 0", width: "100%" }} />
            <p style={{ fontSize: "12px", color: "#4ade80", marginBottom: "10px" }}>Upload any file = auto verified, straight to feed - no alert()</p>
            <button onClick={() => setShowJoin(false)} style={{ background: "#27272a", color: "white", padding: "10px", borderRadius: "20px", width: "48%", marginRight: "4%" }}>Cancel</button>
            <button onClick={() => { setFeed(true); setShowJoin(false); }} style={{ background: "white", color: "black", padding: "10px", borderRadius: "20px", width: "48%" }}>40 Mile</button>
          </div>
        </div>
      )}
    </div>
  );
}
