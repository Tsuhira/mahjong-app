import { useState, useEffect } from "react";
import { getSession, getGames, setSession, deleteGame, getUsers, setUser } from "../lib/firestoreRest";
import { ArrowLeft, Plus, Check, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

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

export default function SessionDetail({ sessionId, user, onNavigate }) {
  const [session, setSessionData] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (sessionId) loadData();
  }, [sessionId]);

  async function loadData() {
    setLoading(true);
    try {
      const [sess, gameList] = await Promise.all([
        getSession(sessionId, user?.idToken),
        getGames(sessionId, user?.idToken),
      ]);
      setSessionData(sess);
      setGames(gameList);
    } catch (e) {
      console.error("loadData failed", e);
    } finally {
      setLoading(false);
    }
  }

  function playerName(result) {
    if (!session?.participants) return result.uid ?? result.guestId ?? "?";
    const p = session.participants.find(p =>
      result.type === "member"
        ? p.type === "member" && p.uid === result.uid
        : p.type === "guest" && p.guestId === result.guestId
    );
    return p?.displayName ?? p?.name ?? "?";
  }

  function calcTotals() {
    if (!session?.participants) return [];
    const map = {};
    for (const p of session.participants) {
      const key = p.type === "member" ? `m:${p.uid}` : `g:${p.guestId}`;
      map[key] = {
        name: p.displayName ?? p.name ?? "?",
        type: p.type,
        uid: p.uid,
        guestId: p.guestId,
        finalScore: 0,
        chips: 0,
      };
    }
    for (const g of games) {
      for (const r of (g.results ?? [])) {
        const key = r.type === "member" ? `m:${r.uid}` : `g:${r.guestId}`;
        if (map[key]) {
          map[key].finalScore += r.finalScore ?? 0;
          map[key].chips += r.chips ?? 0;
        }
      }
    }
    return Object.values(map).sort((a, b) => b.finalScore - a.finalScore);
  }

  async function handleDeleteGame(gameId) {
    if (!window.confirm("この局を削除しますか？")) return;
    try {
      await deleteGame(sessionId, gameId, user.idToken);
      setGames(prev => prev.filter(g => g.id !== gameId));
    } catch (e) {
      console.error("deleteGame failed", e);
    }
  }

  async function handleSettle(settled) {
    if (!user || settling) return;
    setSettling(true);
    try {
      const now = new Date().toISOString();
      await setSession({
        ...session,
        settled,
        settledAt: settled ? now : null,
      }, user.idToken);

      if (settled) {
        const memberTotals = {};
        for (const g of games) {
          for (const r of (g.results ?? [])) {
            if (r.type !== "member") continue;
            if (!memberTotals[r.uid]) memberTotals[r.uid] = { pts: 0, cnt: 0 };
            memberTotals[r.uid].pts += r.finalScore ?? 0;
            memberTotals[r.uid].cnt += 1;
          }
        }
        const allUsers = await getUsers(user.idToken);
        await Promise.all(
          Object.entries(memberTotals).map(([uid, t]) => {
            const u = allUsers.find(u => u.id === uid) ?? {};
            return setUser(uid, {
              totalPoints: (u.totalPoints ?? 0) + t.pts,
              totalGames: (u.totalGames ?? 0) + t.cnt,
              lastPlayedAt: now,
            }, user.idToken);
          })
        );
      }

      await loadData();
    } catch (e) {
      console.error("handleSettle failed", e);
    } finally {
      setSettling(false);
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

  if (!session) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p style={{ color: c.dim }}>セッションが見つかりません</p>
        <button style={s.backLink} onClick={() => onNavigate("sessions")}>
          ← 一覧へ戻る
        </button>
      </div>
    );
  }

  const participantLabel = (session.participants ?? [])
    .map(p => p.displayName ?? p.name ?? "?")
    .join("、");
  const totals = calcTotals();

  return (
    <div>
      <button style={s.backLink} onClick={() => onNavigate("sessions")}>
        <ArrowLeft size={15} />
        <span>一覧へ戻る</span>
      </button>

      {/* Session info card */}
      <div style={s.infoCard}>
        <div style={s.infoDate}>{formatDate(session.date)}</div>
        <div style={s.infoParticipants}>{participantLabel || "参加者なし"}</div>
      </div>

      {/* Settled toggle */}
      <div style={s.settleRow}>
        {session.settled ? (
          <>
            <span style={s.settledBadge}>
              <Check size={14} /> 精算済み
            </span>
            {user && (
              <button
                style={s.unsettleBtn}
                onClick={() => handleSettle(false)}
                disabled={settling}
              >
                {settling ? "処理中…" : "取り消す"}
              </button>
            )}
          </>
        ) : (
          user && (
            <button
              style={{ ...s.settleBtn, opacity: (settling || games.length === 0) ? 0.5 : 1 }}
              onClick={() => handleSettle(true)}
              disabled={settling || games.length === 0}
            >
              {settling ? "処理中…" : <><ToggleLeft size={16} /> 精算済みにする</>}
            </button>
          )
        )}
      </div>

      {/* Add game button */}
      {user && !session.settled && (
        <button
          style={s.addBtn}
          onClick={() => onNavigate("game-form", {
            sessionId,
            sessionParticipants: session.participants,
          })}
        >
          <Plus size={15} />
          <span>局を追加</span>
        </button>
      )}

      {/* Games list */}
      <h2 style={s.sectionTitle}>局一覧</h2>
      {games.length === 0 ? (
        <div style={s.empty}>
          <span style={{ color: c.dim, fontSize: 14 }}>まだ局がありません</span>
        </div>
      ) : (
        <div style={s.gameList}>
          {games.map((game, idx) => (
            <div key={game.id} style={s.gameCard}>
              <div style={s.gameHeader}>
                <span style={s.gameIndex}>{idx + 1}局目</span>
                {user && !session.settled && (
                  <div style={s.gameActions}>
                    <button
                      style={s.iconBtn}
                      title="編集"
                      onClick={() => onNavigate("game-form", {
                        sessionId,
                        gameId: game.id,
                        sessionParticipants: session.participants,
                      })}
                    >
                      <Pencil size={14} color={c.amber} />
                    </button>
                    <button
                      style={s.iconBtn}
                      title="削除"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      <Trash2 size={14} color={c.red} />
                    </button>
                  </div>
                )}
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>順位</th>
                    <th style={s.th}>プレイヤー</th>
                    <th style={{ ...s.th, textAlign: "right" }}>素点</th>
                    <th style={{ ...s.th, textAlign: "right" }}>最終点</th>
                    <th style={{ ...s.th, textAlign: "right" }}>チップ</th>
                  </tr>
                </thead>
                <tbody>
                  {(game.results ?? [])
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((r, i) => (
                      <tr key={i}>
                        <td style={s.td}>{r.rank}位</td>
                        <td style={s.td}>{playerName(r)}</td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          {r.rawScore?.toLocaleString() ?? "–"}
                        </td>
                        <td style={{
                          ...s.td,
                          textAlign: "right",
                          fontWeight: 600,
                          color: (r.finalScore ?? 0) >= 0 ? c.green : c.red,
                        }}>
                          {r.finalScore != null
                            ? `${r.finalScore > 0 ? "+" : ""}${r.finalScore.toFixed(1)}`
                            : "–"}
                        </td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          {r.chips != null ? r.chips : "–"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Player totals */}
      {totals.length > 0 && (
        <>
          <h2 style={s.sectionTitle}>プレイヤー別合計</h2>
          <div style={s.gameCard}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>プレイヤー</th>
                  <th style={{ ...s.th, textAlign: "right" }}>合計得点</th>
                  <th style={{ ...s.th, textAlign: "right" }}>チップ計</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t, i) => (
                  <tr key={i} style={i === 0 ? { background: "rgba(245,158,11,0.05)" } : {}}>
                    <td style={{ ...s.td, fontWeight: i === 0 ? 700 : 400 }}>{t.name}</td>
                    <td style={{
                      ...s.td,
                      textAlign: "right",
                      fontWeight: 700,
                      color: t.finalScore >= 0 ? c.green : c.red,
                    }}>
                      {t.finalScore > 0 ? "+" : ""}{t.finalScore.toFixed(1)}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>{t.chips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    color: c.amber,
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: 12,
  },
  infoCard: {
    padding: "12px 14px",
    background: c.card,
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    marginBottom: 12,
  },
  infoDate: {
    fontSize: 16,
    fontWeight: 700,
    color: c.text,
    marginBottom: 4,
  },
  infoParticipants: {
    fontSize: 13,
    color: c.dim,
  },
  settleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  settledBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 14px",
    background: c.greenBg,
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 20,
    color: c.green,
    fontSize: 13,
    fontWeight: 600,
  },
  settleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: c.greenBg,
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 8,
    color: c.green,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  unsettleBtn: {
    padding: "6px 12px",
    background: "transparent",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.dim,
    fontSize: 12,
    cursor: "pointer",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "10px 14px",
    marginBottom: 16,
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 10,
    color: c.amber,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: c.dim,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    margin: "0 0 8px",
  },
  gameList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  gameCard: {
    background: c.card,
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    overflow: "hidden",
    marginBottom: 8,
  },
  gameHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: `1px solid ${c.border}`,
  },
  gameIndex: {
    fontSize: 12,
    fontWeight: 600,
    color: c.amber,
  },
  gameActions: {
    display: "flex",
    gap: 2,
  },
  iconBtn: {
    background: "none",
    border: "none",
    padding: "4px 6px",
    cursor: "pointer",
    borderRadius: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "6px 10px",
    textAlign: "left",
    color: c.dim,
    fontSize: 11,
    fontWeight: 600,
    borderBottom: `1px solid ${c.border}`,
    background: "rgba(0,0,0,0.15)",
  },
  td: {
    padding: "8px 10px",
    color: c.text,
    borderBottom: `1px solid rgba(51,65,85,0.4)`,
  },
  empty: {
    display: "flex",
    justifyContent: "center",
    padding: "24px 0",
    marginBottom: 8,
  },
};
