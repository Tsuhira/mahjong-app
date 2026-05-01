import { useState, useEffect } from "react";
import { getUsers } from "../lib/firestoreRest";
import { Trophy, Calendar, Users, RefreshCw } from "lucide-react";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#c9a227", "#94a3b8", "#cd7f32"];
const PODIUM_HEIGHTS = [64, 44, 32];

export default function Ranking({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("total");
  const [error, setError] = useState("");

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  function load() {
    setLoading(true);
    setError("");
    getUsers(user?.idToken)
      .then(u => { setUsers(u); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  const ranked = [...users]
    .filter(u => {
      if (tab === "monthly") {
        if (!u.lastPlayedAt) return false;
        const d = new Date(u.lastPlayedAt);
        return d.getFullYear() === thisYear && d.getMonth() + 1 === thisMonth;
      }
      return true;
    })
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  function fmtScore(n) {
    const v = n ?? 0;
    return (v > 0 ? "+" : "") + Number(v).toFixed(1);
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  }

  return (
    <div style={s.container}>
      {/* タブ */}
      <div style={s.tabBar}>
        <button
          style={{ ...s.tab, ...(tab === "total" ? s.tabActive : {}) }}
          onClick={() => setTab("total")}
        >
          <Trophy size={13} />
          累積
        </button>
        <button
          style={{ ...s.tab, ...(tab === "monthly" ? s.tabActive : {}) }}
          onClick={() => setTab("monthly")}
        >
          <Calendar size={13} />
          {thisMonth}月
        </button>
        <button style={s.refreshBtn} onClick={load} disabled={loading}>
          <RefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <div style={s.center}>読み込み中...</div>
      ) : ranked.length === 0 ? (
        <div style={s.emptyBox}>
          <Users size={36} color="#334155" />
          <p style={{ margin: "12px 0 0", color: "#475569", fontSize: 13 }}>
            {tab === "monthly" ? `${thisMonth}月のプレイデータがありません` : "データがありません"}
          </p>
        </div>
      ) : (
        <>
          {/* 表彰台 */}
          {top3.length > 0 && (
            <div style={s.podiumWrap}>
              {/* 2位 / 1位 / 3位 の順で表示 */}
              {[1, 0, 2].map(idx => {
                if (!top3[idx]) return <div key={idx} style={{ flex: 1 }} />;
                const u = top3[idx];
                const score = u.totalPoints ?? 0;
                return (
                  <div key={idx} style={s.podiumItem}>
                    <div style={s.podiumMedal}>{MEDAL[idx]}</div>
                    <div style={s.podiumName}>{u.name ?? u.id}</div>
                    <div style={{ ...s.podiumScore, color: MEDAL_COLORS[idx] }}>
                      {fmtScore(score)}
                    </div>
                    <div style={s.podiumGames}>{u.gameCount ?? 0}戦</div>
                    <div style={{
                      ...s.podiumBase,
                      height: PODIUM_HEIGHTS[idx],
                      background: `linear-gradient(180deg, ${MEDAL_COLORS[idx]}44, ${MEDAL_COLORS[idx]}88)`,
                      border: `1px solid ${MEDAL_COLORS[idx]}66`,
                    }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* 4位以下のテーブル */}
          {rest.length > 0 && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>順位</th>
                    <th style={{ ...s.th, textAlign: "left" }}>名前</th>
                    <th style={s.th}>合計得点</th>
                    <th style={s.th}>対局</th>
                    <th style={s.th}>最終日</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((u, i) => {
                    const score = u.totalPoints ?? 0;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #1e2d40" }}>
                        <td style={{ ...s.td, color: "#64748b", fontSize: 12 }}>{i + 4}位</td>
                        <td style={{ ...s.td, textAlign: "left", fontWeight: "500", color: "#f1f5f9" }}>
                          {u.name ?? u.id}
                        </td>
                        <td style={{ ...s.td, fontWeight: "bold", color: score >= 0 ? "#4ade80" : "#f87171" }}>
                          {fmtScore(score)}
                        </td>
                        <td style={{ ...s.td, color: "#64748b" }}>{u.gameCount ?? 0}</td>
                        <td style={{ ...s.td, color: "#64748b", fontSize: 11 }}>{fmtDate(u.lastPlayedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 全員テーブル（3人以下の場合も表示） */}
          {rest.length === 0 && top3.length > 0 && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>順位</th>
                    <th style={{ ...s.th, textAlign: "left" }}>名前</th>
                    <th style={s.th}>合計得点</th>
                    <th style={s.th}>対局</th>
                    <th style={s.th}>最終日</th>
                  </tr>
                </thead>
                <tbody>
                  {top3.map((u, i) => {
                    const score = u.totalPoints ?? 0;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #1e2d40" }}>
                        <td style={{ ...s.td }}>{MEDAL[i]}</td>
                        <td style={{ ...s.td, textAlign: "left", fontWeight: "500", color: "#f1f5f9" }}>
                          {u.name ?? u.id}
                        </td>
                        <td style={{ ...s.td, fontWeight: "bold", color: score >= 0 ? "#4ade80" : "#f87171" }}>
                          {fmtScore(score)}
                        </td>
                        <td style={{ ...s.td, color: "#64748b" }}>{u.gameCount ?? 0}</td>
                        <td style={{ ...s.td, color: "#64748b", fontSize: 11 }}>{fmtDate(u.lastPlayedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const gold = "#c9a227";

const s = {
  container: { display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 },
  center: { textAlign: "center", padding: 48, color: "#94a3b8" },

  tabBar: {
    display: "flex", gap: 6, background: "#1e293b",
    borderRadius: 10, padding: 4, alignItems: "center",
  },
  tab: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "8px 10px", background: "none", border: "none", borderRadius: 8,
    color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: "500",
  },
  tabActive: { background: gold, color: "#0f172a" },
  refreshBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#475569", padding: "8px 10px", borderRadius: 8, display: "flex",
  },

  errorBox: {
    background: "#7f1d1d", color: "#f87171", borderRadius: 8,
    padding: "10px 14px", fontSize: 13,
  },

  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "48px 0",
  },

  podiumWrap: {
    display: "flex", alignItems: "flex-end", gap: 8,
    padding: "8px 4px 0", justifyContent: "center",
  },
  podiumItem: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", maxWidth: 120,
  },
  podiumMedal: { fontSize: 26, lineHeight: 1, marginBottom: 4 },
  podiumName: {
    fontSize: 12, fontWeight: "bold", color: "#f1f5f9",
    textAlign: "center", marginBottom: 2, wordBreak: "break-all",
    maxWidth: "100%", padding: "0 4px",
  },
  podiumScore: {
    fontSize: 15, fontWeight: "bold", marginBottom: 1,
  },
  podiumGames: { fontSize: 10, color: "#64748b", marginBottom: 4 },
  podiumBase: {
    width: "100%", borderRadius: "4px 4px 0 0",
  },

  tableWrap: {
    background: "#1e293b", borderRadius: 10, overflow: "hidden",
    border: "1px solid #334155",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "9px 8px", textAlign: "center",
    color: "#64748b", background: "#0f172a",
    fontWeight: "bold", fontSize: 11,
    borderBottom: "1px solid #334155",
  },
  td: { padding: "10px 8px", textAlign: "center", color: "#94a3b8" },
};
