import { useState, useEffect } from "react";
import { getSession, getGames, getRules, setSession } from "../lib/firestoreRest";
import { ArrowLeft, Check, CheckCircle2, Circle } from "lucide-react";

const c = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  dim: "#64748b",
  amber: "#f59e0b",
  green: "#10b981",
  greenBg: "rgba(16,185,129,0.12)",
  red: "#ef4444",
};

function pKey(p) {
  return p.type === "member" ? `m:${p.uid}` : `g:${p.guestId}`;
}

export default function Settlement({ sessionId, user, onNavigate }) {
  const [session, setSessionData] = useState(null);
  const [totals, setTotals] = useState([]);
  const [settled, setSettled] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [sessionId]);

  async function load() {
    setLoading(true);
    try {
      const [sess, games, rules] = await Promise.all([
        getSession(sessionId, user?.idToken),
        getGames(sessionId, user?.idToken),
        getRules(user?.idToken),
      ]);
      setSessionData(sess);
      setSettled(new Set(sess.settledParticipants ?? []));

      const ruleMap = Object.fromEntries(rules.map(r => [r.id, r]));
      const map = {};
      for (const p of (sess.participants ?? [])) {
        const key = pKey(p);
        map[key] = { key, name: p.displayName ?? p.name ?? "?", finalScore: 0, chips: 0, chipPts: 0 };
      }
      for (const g of games) {
        const rule = ruleMap[g.ruleId];
        for (const r of (g.results ?? [])) {
          const key = r.type === "member" ? `m:${r.uid}` : `g:${r.guestId}`;
          if (!map[key]) continue;
          map[key].finalScore += r.finalScore ?? 0;
          const chipCount = r.chips ?? 0;
          map[key].chips += chipCount;
          map[key].chipPts += rule?.hasChip ? chipCount * (rule.chipRate ?? 0) : 0;
        }
      }
      setTotals(Object.values(map).sort((a, b) => b.finalScore - a.finalScore));
    } catch (e) {
      console.error("Settlement load failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSettled(key) {
    if (!user) return;
    setSaving(true);
    try {
      const next = new Set(settled);
      next.has(key) ? next.delete(key) : next.add(key);
      setSettled(next);

      const allDone = totals.length > 0 && totals.every(t => next.has(t.key));
      const now = new Date().toISOString();
      await setSession({
        ...session,
        settledParticipants: [...next],
        settled: allDone,
        settledAt: allDone ? now : null,
      }, user.idToken);
      setSessionData(prev => ({
        ...prev,
        settledParticipants: [...next],
        settled: allDone,
        settledAt: allDone ? now : null,
      }));
    } catch (e) {
      console.error("toggleSettled failed", e);
      setSettled(settled);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "日付不明";
    const [y, m, d] = dateStr.split("-");
    return `${y}年${Number(m)}月${Number(d)}日`;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <span style={{ color: c.dim, fontSize: 14 }}>読み込み中…</span>
      </div>
    );
  }

  const allDone = totals.length > 0 && totals.every(t => settled.has(t.key));

  return (
    <div>
      <button style={s.backLink} onClick={() => onNavigate("session-detail", { sessionId })}>
        <ArrowLeft size={15} />
        <span>セッションに戻る</span>
      </button>

      <div style={s.infoCard}>
        <div style={s.infoDate}>{formatDate(session?.date)}</div>
        <div style={{ fontSize: 12, color: c.dim, marginTop: 2 }}>精算管理</div>
      </div>

      {allDone && (
        <div style={s.allDoneBanner}>
          <Check size={16} />
          全員の精算が完了しました
        </div>
      )}

      <h2 style={s.sectionTitle}>精算状況</h2>
      <div style={s.list}>
        {totals.map(t => {
          const done = settled.has(t.key);
          return (
            <button
              key={t.key}
              style={{ ...s.row, ...(done ? s.rowDone : {}) }}
              onClick={() => toggleSettled(t.key)}
              disabled={saving}
            >
              <div style={s.rowLeft}>
                <div style={s.playerName}>{t.name}</div>
                <div style={s.scores}>
                  <span style={{ color: t.finalScore >= 0 ? c.green : c.red, fontWeight: 700 }}>
                    {t.finalScore > 0 ? "+" : ""}{t.finalScore.toFixed(1)}pt
                  </span>
                  {t.chips !== 0 && (
                    <span style={{ color: c.dim, fontSize: 12 }}>
                      　チップ {t.chips > 0 ? "+" : ""}{t.chips}枚
                      {t.chipPts !== 0 && `（${t.chipPts > 0 ? "+" : ""}${t.chipPts}）`}
                    </span>
                  )}
                </div>
              </div>
              <div style={s.rowRight}>
                {done
                  ? <CheckCircle2 size={22} color={c.green} />
                  : <Circle size={22} color={c.dim} />}
                <span style={{ ...s.statusLabel, ...(done ? s.statusDone : s.statusPending) }}>
                  {done ? "精算済" : "未精算"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p style={s.hint}>タップで精算済み／未精算を切り替えられます</p>
    </div>
  );
}

const s = {
  backLink: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "none", border: "none", color: c.amber,
    fontSize: 14, cursor: "pointer", padding: "4px 0", marginBottom: 12,
  },
  infoCard: {
    padding: "12px 14px", background: c.card,
    borderRadius: 10, border: `1px solid ${c.border}`, marginBottom: 12,
  },
  infoDate: { fontSize: 16, fontWeight: 700, color: c.text },
  allDoneBanner: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 14px", marginBottom: 12,
    background: c.greenBg, border: "1px solid rgba(16,185,129,0.35)",
    borderRadius: 10, color: c.green, fontSize: 14, fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 600, color: c.dim,
    textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px",
  },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px", background: c.card,
    border: `1px solid ${c.border}`, borderRadius: 10,
    cursor: "pointer", width: "100%", textAlign: "left",
    transition: "border-color 0.15s, background 0.15s",
  },
  rowDone: {
    background: "rgba(16,185,129,0.06)",
    border: "1px solid rgba(16,185,129,0.3)",
  },
  rowLeft: { display: "flex", flexDirection: "column", gap: 4 },
  playerName: { fontSize: 15, fontWeight: 600, color: c.text },
  scores: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 13 },
  rowRight: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 },
  statusLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" },
  statusDone: { color: c.green },
  statusPending: { color: c.dim },
  hint: { margin: "12px 0 0", fontSize: 11, color: c.dim, textAlign: "center" },
};
