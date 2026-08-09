"use client";
import { useState } from "react";

export const dynamic = 'force-dynamic';

export default function Page() {
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#fdf6ec" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
        <div style={{ fontWeight: 700 }}>Neighborly KC 📍 5mi</div>
        <button 
          onClick={() => setShowJoin(true)}
          style={{ background: "black", color: "white", padding: "6px 16px", borderRadius: "20px", cursor: "pointer" }}
        >
          Join
        </button>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", textAlign: "center", color: "#999" }}>
        No posts in All
      </div>

      {/* Join Modal - only shows when you click Join */}
      {showJoin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "90%", maxWidth: "500px", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontWeight: 700, fontSize: "18px" }}>Join Neighborly KC</h2>
              <button onClick={() => setShowJoin(false)} style={{ background: "#f3f3f3", borderRadius: "50%", width: "28px", height: "28px" }}>X</button>
            </div>

            <input placeholder="Name" style={{ width: "100%", background: "#eef4ff", padding: "10px", borderRadius: "8px", marginBottom: "10px" }} />
            <input placeholder="Email" style={{ width: "100%", background: "#eef4ff", padding: "10px", borderRadius: "8px", marginBottom: "10px" }} />

            <div style={{ background: "#fdf6ec", padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Option 1: 5 Mile (ZIP only) - No mail</div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input placeholder="304 NE 115TH ST" style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }} />
                <input placeholder="64155" style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }} />
              </div>
            </div>

            <div style={{ background: "#e8f5e9", padding: "12px", borderRadius: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Option 2: 40 Mile - FREE OCR (No key!)</div>
              <input type="file" style={{ marginTop: "8px" }} />
              <button style={{ width: "100%", background: "#16a34a", color: "white", padding: "10px", borderRadius: "20px", marginTop: "10px" }}>✅ Verify Mail - FREE</button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowJoin(false)} style={{ flex: 1, padding: "10px", borderRadius: "20px", background: "#f5f0e8" }}>Cancel</button>
              <button style={{ flex: 1, padding: "10px", borderRadius: "20px", background: "#f59e0b", fontWeight: 600 }}>Join 5 Mile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
