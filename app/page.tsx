export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div style={{ minHeight: "100vh", background: "#fdf6ec", color: "#1a1a1a" }}>
      <div style={{ background: "white", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
        <div style={{ fontWeight: 600 }}>Neighborly KC 5mi</div>
        <button style={{ background: "black", color: "white", padding: "6px 16px", borderRadius: "20px" }}>Join</button>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {["All","General","For Sale & Free","Safety Alert","Recommendation","Event","Lost & Found"].map(t => (
            <div key={t} style={{ background: t==="All" ? "black" : "white", color: t==="All" ? "white" : "black", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", border: "1px solid #ddd" }}>{t}</div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "16px", border: "1px solid #eee" }}>
          <div style={{ color: "#888", marginBottom: "10px" }}>Join to post...</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", border: "1px solid #ddd", padding: "6px 10px", borderRadius: "8px" }}>General ▼</div>
            <div style={{ background: "black", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px" }}>Post • 5mi</div>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#999", marginTop: "40px" }}>No posts in All</div>
      </div>
    </div>
  );
}
