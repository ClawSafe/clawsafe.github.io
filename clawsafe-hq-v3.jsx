const { useState, useEffect, useMemo } = React;

const API = window.__CLAWSAFE_API_BASE__ || "";
const TABS = ["overview", "twitter", "youtube", "fiverr", "github", "sora", "schedule"];

function useFetchJson(path, interval = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch(`${API}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, interval);
    return () => clearInterval(id);
  }, [path, interval]);

  return { data, error, reload: load };
}

function fmtCountdown(seconds) {
  if (seconds == null) return "Noch nicht geplant";
  if (seconds <= 0) return "Jetzt fällig";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function card(title, body, accent = "#00ff88") {
  return React.createElement("div", {
    style: { background: "#111", border: `1px solid ${accent}33`, borderTop: `2px solid ${accent}`, borderRadius: 8, padding: 14 }
  }, [
    React.createElement("div", { key: "t", style: { color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, fontSize: 11, marginBottom: 10 } }, title),
    body
  ]);
}

function NotesBox({ id, placeholder = "Notizen für dich" }) {
  const key = `hq-v3-note:${id}`;
  const [value, setValue] = useState(localStorage.getItem(key) || "");
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return React.createElement("textarea", {
    value,
    onChange: (e) => setValue(e.target.value),
    placeholder,
    style: { width: "100%", minHeight: 90, marginTop: 10, background: "#0b0b0b", color: "#d1d5db", border: "1px solid #222", borderRadius: 6, padding: 10 }
  });
}

function QueueEditor({ item }) {
  const key = `hq-v3-edit:${item.id}`;
  const [value, setValue] = useState(localStorage.getItem(key) || item.content || "");
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return React.createElement("div", { style: { marginTop: 10 } }, [
    React.createElement("div", { key: "label", style: { fontSize: 12, color: "#9ca3af", marginBottom: 6 } }, "Text-Preview zum Bearbeiten (lokaler Entwurf)"),
    React.createElement("textarea", {
      key: "ta",
      value,
      onChange: (e) => setValue(e.target.value),
      style: { width: "100%", minHeight: 110, background: "#0b0b0b", color: "#e5e7eb", border: "1px solid #222", borderRadius: 6, padding: 10 }
    }),
    item.video ? React.createElement("div", { key: "v", style: { fontSize: 12, color: "#6b7280", marginTop: 8 } }, `Video: ${item.video}`) : null
  ]);
}

function PlatformTab({ name, status, queueItems, nextPost }) {
  const accent = name === "fiverr" ? "#f59e0b" : name === "github" ? "#60a5fa" : "#00ff88";
  return React.createElement("div", { style: { display: "grid", gap: 12 } }, [
    card(`${name} status`, React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { fontSize: 22, color: "#fff", fontWeight: 700 } }, status.status || "unknown"),
      React.createElement("div", { key: 2, style: { color: "#9ca3af", marginTop: 8 } }, `Nächster geplanter Schritt: ${nextPost?.product || "Noch offen"}`),
      React.createElement("div", { key: 3, style: { color: "#9ca3af", marginTop: 6 } }, `Countdown: ${fmtCountdown(nextPost?.countdown_seconds)}`),
      React.createElement("ul", { key: 4, style: { marginTop: 12, color: "#d1d5db" } }, (status.human_tasks || []).map((t, i) => React.createElement("li", { key: i, style: { marginBottom: 6 } }, t)))
    ]), accent),
    card(`${name} queue`, React.createElement("div", null,
      queueItems.length ? queueItems.map((item) => React.createElement("div", { key: item.id, style: { borderBottom: "1px solid #1a1a1a", padding: "10px 0" } }, [
        React.createElement("div", { key: "h", style: { display: "flex", justifyContent: "space-between", gap: 8 } }, [
          React.createElement("strong", { key: 1, style: { color: "#fff" } }, item.product || item.content),
          React.createElement("span", { key: 2, style: { color: "#6b7280", fontSize: 12 } }, item.status)
        ]),
        React.createElement("div", { key: "p", style: { color: "#9ca3af", marginTop: 6, fontSize: 13 } }, item.content || "Ohne Text"),
        React.createElement("div", { key: "m", style: { color: "#6b7280", marginTop: 6, fontSize: 12 } }, `Promotet: ${item.product || "n/a"} · Geplant: ${item.schedule || item.suggested_schedule || "noch offen"}`),
        React.createElement(QueueEditor, { key: "e", item }),
        React.createElement(NotesBox, { key: "n", id: item.id, placeholder: "Was sollten wir an diesem Post/Video verbessern?" })
      ])) : React.createElement("div", { style: { color: "#6b7280" } }, "Keine Einträge in dieser Plattform-Queue.")
    ), accent)
  ]);
}

function App() {
  const [tab, setTab] = useState("overview");
  const hq = useFetchJson("/api/hq-status");
  const queue = useFetchJson("/api/content-queue");
  const platforms = useFetchJson("/api/platform-status");
  const scheduler = useFetchJson("/business/scheduler-preview.json", 20000);

  const items = queue.data?.items || [];
  const nextByPlatform = queue.data?.next_by_platform || {};
  const p = platforms.data?.platforms || {};
  const schedules = scheduler.data?.items || [];

  const tabButtons = TABS.map((name) => React.createElement("button", {
    key: name,
    onClick: () => setTab(name),
    style: {
      padding: "8px 12px", borderRadius: 6, border: "1px solid #1f2937", cursor: "pointer",
      background: tab === name ? "#111827" : "#0a0a0a", color: tab === name ? "#fff" : "#9ca3af"
    }
  }, name.toUpperCase()));

  const overview = React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 } }, [
    card("Revenue", React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { fontSize: 28, color: "#fff", fontWeight: 700 } }, `$${hq.data?.revenue?.total || 0}`),
      React.createElement("div", { key: 2, style: { color: "#9ca3af" } }, `Echte Orders: ${hq.data?.revenue?.orders || 0}`)
    ])),
    card("Twitter", React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { color: "#fff", fontSize: 24, fontWeight: 700 } }, `${hq.data?.performance?.twitter_queue || 0} queued`),
      React.createElement("div", { key: 2, style: { color: "#9ca3af" } }, `Nächster Post in: ${fmtCountdown(nextByPlatform.twitter?.countdown_seconds)}`)
    ]), "#60a5fa"),
    card("YouTube", React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { color: "#fff", fontSize: 24, fontWeight: 700 } }, `${hq.data?.performance?.youtube_videos_online || 0} live`),
      React.createElement("div", { key: 2, style: { color: "#9ca3af" } }, `${p.youtube?.staged_count || 0} staged / approval nötig`)
    ]), "#ef4444"),
    card("Fiverr", React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { color: "#fff", fontSize: 20, fontWeight: 700 } }, p.fiverr?.gig_url || "Login nötig"),
      React.createElement("div", { key: 2, style: { color: "#9ca3af" } }, "Keine Links aus Käufernachrichten anklicken. Immer doppelt prüfen.")
    ]), "#f59e0b")
  ]);

  let content = overview;
  if (tab === "twitter") content = React.createElement(PlatformTab, { name: "twitter", status: p.twitter || {}, queueItems: items.filter(i => i.platform === "twitter"), nextPost: nextByPlatform.twitter });
  if (tab === "youtube") content = React.createElement(PlatformTab, { name: "youtube", status: p.youtube || {}, queueItems: items.filter(i => i.platform === "youtube"), nextPost: nextByPlatform.youtube });
  if (tab === "fiverr") content = React.createElement(PlatformTab, { name: "fiverr", status: p.fiverr || {}, queueItems: items.filter(i => i.platform === "fiverr"), nextPost: nextByPlatform.fiverr });
  if (tab === "github") content = React.createElement("div", { style: { display: "grid", gap: 12 } }, [
    card("GitHub outreach", React.createElement("div", null, [
      React.createElement("div", { key: 1, style: { color: "#fff", fontWeight: 700, fontSize: 20 } }, "Live issue tracking"),
      React.createElement("ul", { key: 2, style: { color: "#d1d5db" } }, (p.github?.latest_posts || []).map((url) => React.createElement("li", { key: url, style: { marginBottom: 6 } }, React.createElement("a", { href: url, target: "_blank", style: { color: "#93c5fd" } }, url)))),
      React.createElement(NotesBox, { key: 3, id: "github-replies", placeholder: "Antwortstil, Follow-up-Ideen, Einwände..." })
    ]), "#60a5fa")
  ]);
  if (tab === "sora") content = React.createElement("div", { style: { display: "grid", gap: 12 } }, [
    card("Sora 2 production queue", React.createElement("div", null,
      (platforms.data?.platforms?.sora?.queued_count != null ? [
        React.createElement("div", { key: "count", style: { color: "#fff", fontWeight: 700, fontSize: 24 } }, `${platforms.data.platforms.sora.queued_count} pending`),
        React.createElement("div", { key: "tasks", style: { color: "#d1d5db", marginTop: 10 } }, (platforms.data.platforms.sora.human_tasks || []).join(" · "))
      ] : [React.createElement("div", { key: "empty", style: { color: "#6b7280" } }, "Sora queue lädt...")])
    ), "#a855f7"),
    card("Sora notes", React.createElement(NotesBox, { id: "sora-queue", placeholder: "Welche Clips/Prompts sollten wir nächste Woche priorisieren?" }), "#a855f7")
  ]);
  if (tab === "schedule") content = React.createElement("div", { style: { display: "grid", gap: 12 } }, [
    card("Nächste geplante Schritte", React.createElement("div", null,
      schedules.length ? schedules.map((item) => React.createElement("div", { key: item.id, style: { padding: "10px 0", borderBottom: "1px solid #1a1a1a" } }, [
        React.createElement("div", { key: 1, style: { color: "#fff", fontWeight: 700 } }, `${item.platform} · ${item.product || item.angle}`),
        React.createElement("div", { key: 2, style: { color: "#9ca3af", marginTop: 4 } }, `Geplant: ${item.schedule || item.suggested_schedule || 'offen'}`),
        React.createElement("div", { key: 3, style: { color: item.needs_rewrite ? "#f59e0b" : "#6b7280", marginTop: 4, fontSize: 12 } }, item.needs_rewrite ? "Vorher überarbeiten, damit es nicht repetitiv wirkt." : "Kann so weitergeplant werden.")
      ])) : React.createElement("div", { style: { color: "#6b7280" } }, "Noch keine Scheduler-Vorschau vorhanden." )
    ), "#00ff88")
  ]);

  return React.createElement("div", { style: { minHeight: "100vh", background: "#070b11", color: "#d1d5db", fontFamily: "Inter, system-ui, sans-serif", padding: 18 } }, [
    React.createElement("div", { key: "head", style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 } }, [
      React.createElement("div", { key: 1 }, [
        React.createElement("div", { key: "t", style: { color: "#00ff88", fontWeight: 800, fontSize: 22 } }, "ClawSafe HQ v3"),
        React.createElement("div", { key: "s", style: { color: "#9ca3af", marginTop: 4 } }, "Plattform-Tabs, einfache Aufgabenansicht, Countdown, Queue-Preview und lokale Notizen")
      ]),
      React.createElement("div", { key: 2, style: { color: "#6b7280", fontSize: 12 } }, `HQ ${hq.error ? 'stale' : 'live'} · Queue ${queue.error ? 'stale' : 'live'} · Platforms ${platforms.error ? 'stale' : 'live'}`)
    ]),
    React.createElement("div", { key: "tabs", style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 } }, tabButtons),
    content
  ]);
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
