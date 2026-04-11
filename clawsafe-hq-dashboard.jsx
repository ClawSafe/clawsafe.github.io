const { useState, useEffect, useCallback } = React;

const API = window.__CLAWSAFE_API_BASE__ || "";
const POLL_MS = 15000;
const mono = "'JetBrains Mono', monospace";
const sans = "'IBM Plex Sans', -apple-system, sans-serif";

function useLiveJson(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastOk, setLastOk] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastOk(new Date());
    } catch (err) {
      setError(err.message || String(err));
    }
  }, [path]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, error, lastOk, refresh };
}

function shellColor(status) {
  if (["live", "active", "ready", "done", "production", true].includes(status)) return "#00ff88";
  if (["blocked", "error", false].includes(status)) return "#ff4d4f";
  return "#f5a623";
}

function Card({ title, accent = "#00ff88", children, span = 1 }) {
  return (
    <div style={{ background: "#0f141b", border: "1px solid #18212b", borderTop: `2px solid ${accent}`, borderRadius: 10, padding: 16, gridColumn: `span ${span}` }}>
      <div style={{ fontFamily: mono, fontSize: 11, color: "#6e7a8a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1px" }}>{title}</div>
      {children}
    </div>
  );
}

function Metric({ value, label, sub, color = "#e8edf4" }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#7f8a99" }}>{label}</div>
      {sub ? <div style={{ fontSize: 11, color: "#55606d", marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

function Dot({ color }) {
  return <span style={{ width: 8, height: 8, borderRadius: 999, display: "inline-block", background: color, boxShadow: `0 0 8px ${color}55` }} />;
}

function Row({ children, border = true }) {
  return <div style={{ padding: "10px 0", borderBottom: border ? "1px solid #171f29" : "none" }}>{children}</div>;
}

function fmtMoney(v) {
  if (typeof v !== "number") return "$0";
  return `$${v}`;
}

function fmtDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("de-CH"); } catch { return v; }
}

function HQDashboard() {
  const hq = useLiveJson("/api/hq-status");
  const system = useLiveJson("/api/system-status");

  const data = hq.data || {};
  const sys = system.data || {};
  const revenue = data.revenue || {};
  const scans = data.scan_totals || {};
  const drafts = data.drafts || {};
  const uploads = data.uploads || {};
  const perf = data.performance || {};
  const requests = data.requests || [];
  const projects = sys.projects || [];
  const youtubeRecent = perf.youtube_recent_videos || [];
  const analytics = perf.youtube_analytics || null;
  const analyticsError = perf.youtube_analytics_error || "";
  const lastUpdate = hq.lastOk || system.lastOk;

  return (
    <div style={{ minHeight: "100vh", background: "#070b11", color: "#dde6f1", fontFamily: sans, padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        a { color: #6eb6ff; }
        @media (max-width: 1100px) {
          .hq-grid { grid-template-columns: 1fr !important; }
          .hq-metrics { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 720px) {
          .hq-metrics { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🐾</span>
            <span style={{ fontFamily: mono, fontSize: 18, color: "#00ff88", fontWeight: 700 }}>ClawSafe HQ</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: hq.error || system.error ? "#ff4d4f" : "#00ff88" }}>
              {hq.error || system.error ? "DEGRADED" : "LIVE"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#748091", marginTop: 4 }}>
            Revenue, queue and scans from <span style={{ fontFamily: mono }}>/api/hq-status</span>, projects from <span style={{ fontFamily: mono }}>/api/system-status</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#6b7686" }}>{lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString("de-CH")}` : "Waiting for backend"}</span>
          <button onClick={() => { hq.refresh(); system.refresh(); }} style={{ fontFamily: mono, fontSize: 11, background: "#111923", color: "#d6e2f0", border: "1px solid #223041", borderRadius: 6, padding: "8px 12px", cursor: "pointer" }}>Refresh</button>
          <a href="/system" style={{ fontFamily: mono, fontSize: 11, textDecoration: "none", border: "1px solid #223041", borderRadius: 6, padding: "8px 12px" }}>System View</a>
        </div>
      </div>

      {(hq.error || system.error) ? (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #462227", background: "#1a0f12", borderRadius: 8, color: "#ff9ea0", fontSize: 12 }}>
          {hq.error ? <div>HQ API error: {hq.error}</div> : null}
          {system.error ? <div>System API error: {system.error}</div> : null}
        </div>
      ) : null}

      <div className="hq-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <Card title="Revenue" accent={revenue.total > 0 ? "#00ff88" : "#f5a623"}>
          <Metric value={fmtMoney(revenue.total || 0)} label="Real revenue" sub={`${revenue.orders || 0} orders · ${revenue.real_orders || 0} paid`} color={revenue.total > 0 ? "#00ff88" : "#f5a623"} />
        </Card>
        <Card title="Queue" accent="#59a7ff">
          <Metric value={drafts.twitter_queued || 0} label="Twitter queued" sub={`${uploads.ready_count || 0} YouTube ready · ${requests.length} requests`} color="#59a7ff" />
        </Card>
        <Card title="ClawGuard" accent="#ffb347">
          <Metric value={scans.skills || 0} label="Skills scanned" sub={`${scans.findings || 0} findings · ${scans.high_risk || 0} high-risk`} color="#ffb347" />
        </Card>
        <Card title="Projects" accent="#bb86fc">
          <Metric value={projects.length || 0} label="Tracked projects" sub={`${(projects || []).filter(p => p.status === 'live').length} live`} color="#bb86fc" />
        </Card>
      </div>

      <div className="hq-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <Card title="Queue detail" accent="#59a7ff">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <Metric value={drafts.twitter_count || 0} label="Twitter drafts" color="#59a7ff" />
              <Metric value={uploads.ready_count || 0} label="YouTube ready" color="#00ff88" />
              <Metric value={perf.twitter_posted || 0} label="Twitter posted" color="#f5a623" />
            </div>
            <Row>
              <div style={{ fontSize: 12, color: "#8c97a6", marginBottom: 6 }}>Next Twitter items</div>
              {(perf.next_twitter_items || []).length ? (perf.next_twitter_items || []).slice(0, 4).map((item, idx) => (
                <div key={idx} style={{ fontSize: 12, color: "#d7e0ea", marginBottom: 6 }}>{item}</div>
              )) : <div style={{ fontSize: 12, color: "#5d6978" }}>No queued Twitter items.</div>}
            </Row>
            <Row border={false}>
              <div style={{ fontSize: 12, color: "#8c97a6", marginBottom: 6 }}>YouTube staging</div>
              {(perf.next_youtube_items || []).length ? (perf.next_youtube_items || []).slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ fontSize: 12, color: "#d7e0ea", marginBottom: 6 }}>{item}</div>
              )) : <div style={{ fontSize: 12, color: "#5d6978" }}>Nothing staged for YouTube right now.</div>}
            </Row>
          </Card>

          <Card title="Projects from /api/system-status" accent="#bb86fc">
            {projects.length ? projects.map((project, idx) => {
              const color = shellColor(project.status);
              return (
                <Row key={idx} border={idx < projects.length - 1}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Dot color={color} />
                        <span style={{ fontFamily: mono, fontSize: 12, color: "#e7eef8" }}>{project.name}</span>
                        <span style={{ fontFamily: mono, fontSize: 10, color }}>{String(project.status).toUpperCase()}</span>
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12, color: "#738091" }}>{project.detail}</div>
                    </div>
                    <div style={{ minWidth: 120 }}>
                      <div style={{ height: 6, background: "#131a22", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${project.progress || 0}%`, height: "100%", background: color }} />
                      </div>
                      <div style={{ textAlign: "right", marginTop: 4, fontFamily: mono, fontSize: 10, color: "#6b7686" }}>{project.progress || 0}%</div>
                    </div>
                  </div>
                </Row>
              );
            }) : <div style={{ fontSize: 12, color: "#5d6978" }}>No project telemetry returned yet.</div>}
          </Card>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Card title="Scans" accent="#ffb347">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Metric value={scans.files || 0} label="Files scanned" color="#e8edf4" />
              <Metric value={scans.clean || 0} label="Clean skills" color="#00ff88" />
              <Metric value={scans.needs_review || 0} label="Needs review" color="#f5a623" />
              <Metric value={scans.high_risk || 0} label="High-risk" color="#ff4d4f" />
            </div>
          </Card>

          <Card title="YouTube analytics" accent="#ff4d4f">
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: mono, fontSize: 12, color: "#e8edf4" }}>{perf.youtube_videos_online || 0} videos online</div>
              <div style={{ fontSize: 12, color: "#7e8a99" }}>{perf.youtube_subscribers || 0} subscribers · {perf.youtube_views || 0} total views</div>
            </div>
            {analytics ? (
              <>
                <Row>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Metric value={analytics.views || 0} label={`Views ${analytics.startDate} → ${analytics.endDate}`} color="#ff4d4f" />
                    <Metric value={analytics.subscribersGained || 0} label="Subscribers gained" color="#00ff88" />
                    <Metric value={analytics.likes || 0} label="Likes" color="#59a7ff" />
                    <Metric value={analytics.estimatedMinutesWatched || 0} label="Minutes watched" color="#ffb347" />
                  </div>
                </Row>
                <Row border={false}>
                  <div style={{ fontSize: 12, color: "#7e8a99" }}>Average view duration: {Math.round(analytics.averageViewDuration || 0)}s</div>
                </Row>
              </>
            ) : (
              <Row border={false}>
                <div style={{ fontSize: 12, color: analyticsError ? "#ff9ea0" : "#5d6978" }}>
                  {analyticsError || "YouTube Analytics API not available yet."}
                </div>
              </Row>
            )}
            <div style={{ marginTop: 10, fontSize: 12, color: "#8c97a6" }}>Recent videos</div>
            {youtubeRecent.length ? youtubeRecent.slice(0, 4).map((video, idx) => (
              <Row key={idx} border={idx < Math.min(youtubeRecent.length, 4) - 1}>
                <div style={{ fontSize: 12, color: "#d7e0ea" }}>{video.title}</div>
                <div style={{ fontSize: 11, color: "#6b7686", marginTop: 4 }}>{video.views || 0} views · {video.likes || 0} likes · {fmtDate(video.published)}</div>
              </Row>
            )) : <div style={{ fontSize: 12, color: "#5d6978", marginTop: 8 }}>No recent video data yet.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HQDashboard />);
