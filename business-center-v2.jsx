import { useState, useEffect, useCallback } from "react";

const API = window.__CLAWSAFE_API_BASE__ || "";
const POLL = 15000;

function useLive(url, interval = POLL) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastOk, setLastOk] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setErr(null);
      setLastOk(new Date());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, interval);
    return () => clearInterval(iv);
  }, [refresh, interval]);

  return { data, err, loading, lastOk, refresh };
}

function Dot({ ok }) {
  const c = ok === true ? "#00ff88" : ok === false ? "#ff4444" : ok === "warn" ? "#ffaa00" : "#333";
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}44`, marginRight: 6, flexShrink: 0 }} />;
}

function Box({ title, accent = "#00ff88", children, span = 1 }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "6px", padding: "14px", gridColumn: `span ${span}`, borderTop: `2px solid ${accent}`, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: "10px", color: "#555", fontFamily: "var(--m)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>{title}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Num({ val, label, color = "#fff", sub }) {
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ fontSize: "26px", fontWeight: 700, color, fontFamily: "var(--m)" }}>{val}</div>
      <div style={{ fontSize: "11px", color: "#555" }}>{label}</div>
      {sub && <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function actionButtonStyle(color) {
  return {
    padding: "3px 6px",
    fontSize: "9px",
    background: "transparent",
    border: `1px solid ${color}33`,
    color,
    borderRadius: "3px",
    cursor: "pointer",
    fontFamily: "var(--m)",
  };
}

function FooterButton({ href, children }) {
  return (
    <a href={href} style={{ color: "#4a9eff", textDecoration: "none", fontFamily: "var(--m)", fontSize: "10px", border: "1px solid #1f2a40", padding: "6px 10px", borderRadius: "4px" }}>
      {children}
    </a>
  );
}

function App() {
  const { data, err, loading, lastOk, refresh } = useLive(`${API}/api/hq-status`);

  const updateRequestStatus = async (id, status) => {
    try {
      await fetch(`${API}/api/audit-request/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      refresh();
    } catch {}
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>
        Connecting to ClawSafe Business Center...
      </div>
    );
  }

  if (err && !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ff4444", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", gap: "12px" }}>
        <div>❌ Backend nicht erreichbar</div>
        <div style={{ color: "#555", fontSize: "11px" }}>{API || "localhost"}/api/hq-status → {err}</div>
        <div style={{ color: "#333", fontSize: "10px", marginTop: "8px" }}>Prüfe: Läuft server.py? Ist der Tunnel aktiv?</div>
        <button onClick={refresh} style={{ marginTop: "12px", padding: "8px 16px", background: "#1a1a1a", border: "1px solid #333", color: "#888", borderRadius: "4px", cursor: "pointer", fontFamily: "var(--m)", fontSize: "11px" }}>
          Retry
        </button>
      </div>
    );
  }

  const d = data || {};
  const requests = d.requests || [];
  const revenue = d.revenue || {};
  const tasks = d.tasks || [];
  const channels = d.channels || {};
  const scan = d.last_scan || {};
  const costs = d.costs || {};
  const uploads = d.uploads || {};
  const drafts = d.drafts || {};
  const performance = d.performance || {};

  const newReq = requests.filter((r) => r.status === "new").length;
  const reviewingReq = requests.filter((r) => r.status === "reviewing" || r.status === "in-progress").length;
  const doneReq = requests.filter((r) => r.status === "done").length;
  const activeTasks = tasks.filter((t) => t.status === "active").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;

  const channelList = Object.entries(channels).map(([name, val]) => {
    if (val === true) return { name, status: true };
    if (val === false) return { name, status: false };
    if (typeof val === "string") return { name, status: "warn", detail: val };
    if (typeof val === "object" && val) return { name, status: val.up, detail: val.detail || "" };
    return { name, status: false };
  });
  const channelsUp = channelList.filter((c) => c.status === true).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ccc", fontFamily: "'IBM Plex Sans', sans-serif", padding: "16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        :root { --m: 'JetBrains Mono', monospace; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        @media (max-width: 980px) {
          .bc-top-grid, .bc-main-grid { grid-template-columns: 1fr !important; }
          .bc-channel-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🐾</span>
          <span style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--m)", color: "#00ff88" }}>ClawSafe Business Center</span>
          {err && <span style={{ fontSize: "10px", color: "#ff4444", fontFamily: "var(--m)" }}>⚠ stale data</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "#333", fontFamily: "var(--m)" }}>
            {lastOk ? `Live · ${lastOk.toLocaleTimeString("de-CH")}` : "—"}
          </span>
          <button onClick={refresh} style={{ padding: "3px 8px", background: "#1a1a1a", border: "1px solid #222", color: "#555", borderRadius: "3px", cursor: "pointer", fontFamily: "var(--m)", fontSize: "10px" }}>↻</button>
          <FooterButton href="/business-center-v2-readonly.html">Backup Monitor</FooterButton>
          <FooterButton href="/system">System View</FooterButton>
        </div>
      </div>

      <div className="bc-top-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
        <Box title="Revenue" accent={revenue.total > 0 ? "#00ff88" : "#ff4444"}>
          <Num val={`$${revenue.total ?? 0}`} label="Echtes Revenue" color={revenue.total > 0 ? "#00ff88" : "#ff4444"} sub={`${revenue.orders ?? 0} Orders`} />
        </Box>
        <Box title="Anfragen" accent="#4a9eff">
          <Num val={requests.length} label="Audit Requests" color="#4a9eff" sub={`${newReq} neu · ${reviewingReq} reviewing · ${doneReq} done`} />
        </Box>
        <Box title="API Kosten" accent="#f59e0b">
          <Num val={costs.today_usd != null ? `$${costs.today_usd.toFixed(2)}` : "—"} label="Heute" color="#f59e0b" sub={costs.monthly_usd != null ? `$${costs.monthly_usd.toFixed(2)} diesen Monat` : "—"} />
        </Box>
        <Box title="Kanäle" accent="#00ff88">
          <Num val={`${channelsUp}/${channelList.length}`} label="Online" color="#00ff88" sub={`${channelList.length - channelsUp} offline oder eingeschränkt`} />
        </Box>
      </div>

      <div className="bc-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <Box title={`Anfragen (${requests.length})`} accent="#4a9eff">
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {requests.length === 0 ? (
              <div style={{ color: "#333", fontSize: "12px", padding: "16px 0", textAlign: "center" }}>
                Keine Anfragen. Kein Traffic = kein Business.
              </div>
            ) : (
              requests.map((r, i) => {
                const sc = { new: "#4a9eff", reviewing: "#ffaa00", done: "#00ff88", rejected: "#ff4444", "in-progress": "#ffaa00" }[r.status] || "#555";
                return (
                  <div key={r.id || i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #151515", fontSize: "12px" }}>
                    <Dot ok={r.status === "done" ? true : r.status === "new" ? "warn" : r.status === "rejected" ? false : "warn"} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#aaa" }}>{r.email}</div>
                      <div style={{ fontSize: "10px", color: "#444" }}>{r.repo || "kein Repo"} · {r.timestamp ? new Date(r.timestamp).toLocaleString("de-CH") : ""}</div>
                    </div>
                    <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "3px", background: `${sc}18`, color: sc, fontFamily: "var(--m)" }}>{r.status}</span>
                    {r.status === "new" && (
                      <>
                        <button onClick={() => updateRequestStatus(r.id, "reviewing")} style={actionButtonStyle("#4a9eff")}>Start</button>
                        <button onClick={() => updateRequestStatus(r.id, "done")} style={actionButtonStyle("#00ff88")}>Done</button>
                      </>
                    )}
                    {(r.status === "reviewing" || r.status === "in-progress") && (
                      <button onClick={() => updateRequestStatus(r.id, "done")} style={actionButtonStyle("#00ff88")}>✓</button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Box>

        <Box title={`Tasks (${activeTasks} aktiv · ${blockedTasks} blockiert)`} accent="#a855f7">
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {tasks.length === 0 ? (
              <div style={{ color: "#333", fontSize: "12px", padding: "16px 0", textAlign: "center" }}>
                Keine Tasks geladen. Session Bridge aktiv?
              </div>
            ) : (
              tasks
                .sort((a, b) => {
                  const order = { blocked: 0, active: 1, done: 2 };
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                })
                .map((t, i) => (
                  <div key={t.id || i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 0", borderBottom: "1px solid #151515", fontSize: "11px" }}>
                    <Dot ok={t.status === "done" ? true : t.status === "blocked" ? false : "warn"} />
                    <span style={{ flex: 1, color: t.status === "done" ? "#444" : "#aaa", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.description}</span>
                    {t.status === "blocked" && t.reason && <span style={{ fontSize: "9px", color: "#ff444488" }}>{t.reason}</span>}
                  </div>
                ))
            )}
          </div>
        </Box>

        <Box title="Kanäle Live-Status" accent="#00ff88">
          {channelList.length === 0 ? (
            <div style={{ color: "#333", fontSize: "12px" }}>Keine Kanal-Daten vom Backend.</div>
          ) : (
            <div className="bc-channel-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
              {channelList.map((ch, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 2px", fontSize: "11px" }}>
                  <Dot ok={ch.status === true ? true : ch.status === false ? false : "warn"} />
                  <span style={{ color: ch.status === true ? "#aaa" : ch.status === false ? "#555" : "#aa8800" }}>{ch.name}</span>
                  {ch.detail && <span style={{ fontSize: "9px", color: "#444", marginLeft: "auto" }}>{ch.detail}</span>}
                </div>
              ))}
            </div>
          )}
        </Box>

        <Box title="Business / Scan / Queue" accent="#f59e0b">
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
              <span style={{ color: "#00ff88" }}>Revenue ${revenue.total ?? 0}</span>
              <span style={{ color: "#4a9eff" }}>Twitter queue {performance.twitter_queue ?? drafts.twitter_queue ?? 0}</span>
              <span style={{ color: "#ffaa00" }}>YouTube online {performance.youtube_videos_online ?? 0}</span>
            </div>
            {!scan.total ? (
              <div style={{ color: "#333", fontSize: "12px" }}>Keine Scan-Daten. Läuft ClawGuard?</div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "16px", marginBottom: "4px", fontSize: "13px", flexWrap: "wrap" }}>
                  <span style={{ color: "#00ff88" }}>✅ {scan.clean ?? 0} clean</span>
                  <span style={{ color: "#ffaa00" }}>⚠️ {scan.review ?? 0} review</span>
                  <span style={{ color: "#ff4444" }}>❌ {scan.high_risk ?? 0} high-risk</span>
                </div>
                <div style={{ fontSize: "10px", color: "#555", borderTop: "1px solid #1a1a1a", paddingTop: "6px" }}>
                  {scan.findings && scan.findings.length > 0 ? scan.findings.map((f, i) => (
                    <div key={i}>{f.severity === "CRITICAL" || f.severity === "HIGH" ? "❌" : "⚠️"} <span style={{ color: "#777" }}>{f.skill}</span> — {f.message}</div>
                  )) : "Keine Top-Findings im Payload."}
                </div>
                <div style={{ fontSize: "9px", color: "#333", marginTop: "6px" }}>
                  {scan.total} Skills · {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString("de-CH") : ""}
                </div>
              </>
            )}
            <div style={{ fontSize: "10px", color: "#444", borderTop: "1px solid #1a1a1a", paddingTop: "8px" }}>
              Uploads ready: {(uploads.ready_items || []).length} · drafts: {(drafts.items || []).length || drafts.total || 0}
            </div>
          </div>
        </Box>
      </div>

      <div style={{ textAlign: "center", marginTop: "14px", fontSize: "9px", color: "#222", fontFamily: "var(--m)", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
        <span>ClawSafe Business Center · Live-Daten alle 15s · Keine Fake-Werte</span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
