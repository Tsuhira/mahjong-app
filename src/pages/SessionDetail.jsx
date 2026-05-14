import { useState, useEffect } from "react";
import { getSession, getGames, setSession, deleteSession, deleteGame, getKumaMembers, getGuests, setGuest } from "../lib/firestoreRest";
import { ArrowLeft, Plus, Check, Pencil, Trash2, UserPlus, X, Receipt } from "lucide-react";

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
  const [editingParticipants, setEditingParticipants] = useState(false);

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

  async function handleDeleteSession() {
    if (!window.confirm("このセッションと全ての局を削除しますか？")) return;
    try {
      await Promise.all(games.map(g => deleteGame(sessionId, g.id, user.idToken)));
      await deleteSession(sessionId, user.idToken);
      onNavigate("sessions");
    } catch (e) {
      console.error("deleteSession failed", e);
    }
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
        <div style={s.infoDate}>
          {session.name ? `${session.name}（${formatDate(session.date)}）` : formatDate(session.date)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...s.infoParticipants, flex: 1 }}>{participantLabel || "参加者なし"}</div>
          {user && (
            <div style={{ display: "flex", gap: 6 }}>
              <button style={s.editParticipantsBtn} onClick={() => setEditingParticipants(true)}>
                <UserPlus size={13} /> 編集
              </button>
              <button style={s.deleteSessionBtn} onClick={handleDeleteSession}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {editingParticipants && (
        <EditParticipantsModal
          session={session}
          games={games}
          user={user}
          onSaved={async (newParticipants, newName) => {
            await setSession({ ...session, name: newName, participants: newParticipants }, user.idToken);
            await loadData();
            setEditingParticipants(false);
          }}
          onClose={() => setEditingParticipants(false)}
        />
      )}

      {/* Settled status / button */}
      <div style={s.settleRow}>
        {session.settled ? (
          <span style={s.settledBadge}>
            <Check size={14} /> 精算済み
          </span>
        ) : null}
        <button
          style={{ ...s.settleBtn, opacity: games.length === 0 ? 0.5 : 1 }}
          disabled={games.length === 0}
          onClick={() => onNavigate("settlement", { sessionId })}
        >
          <Receipt size={15} /> 精算へ
        </button>
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
  editParticipantsBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 6,
    color: c.amber,
    fontSize: 12,
    padding: "4px 8px",
    cursor: "pointer",
    flexShrink: 0,
  },
  deleteSessionBtn: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 6,
    color: c.red,
    padding: "4px 7px",
    cursor: "pointer",
    flexShrink: 0,
  },
};

function EditParticipantsModal({ session, games, user, onSaved, onClose }) {
  const [members, setMembers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [participants, setParticipants] = useState(session.participants ?? []);
  const [sessionName, setSessionName] = useState(session.name ?? "");
  const [newGuestName, setNewGuestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ゲームに登場済みのキー（削除不可）
  const usedKeys = new Set(
    games.flatMap(g => (g.results ?? []).map(r =>
      r.type === "member" ? `m:${r.uid}` : `g:${r.guestId}`
    ))
  );

  useEffect(() => {
    Promise.all([
      getKumaMembers(user?.idToken).catch(() => []),
      getGuests(user?.idToken).catch(() => []),
    ]).then(([m, g]) => { setMembers(m); setGuests(g); });
  }, [user?.idToken]);

  function key(p) {
    return p.type === "member" ? `m:${p.uid}` : `g:${p.guestId}`;
  }

  function isIn(p) {
    return participants.some(x => key(x) === key(p));
  }

  function addMember(m) {
    if (isIn({ type: "member", uid: m.id })) return;
    setParticipants(prev => [...prev, { type: "member", uid: m.id, displayName: m.name ?? m.displayName ?? m.id }]);
  }

  function addGuest(g) {
    if (isIn({ type: "guest", guestId: g.id })) return;
    setParticipants(prev => [...prev, { type: "guest", guestId: g.id, name: g.name }]);
  }

  function remove(p) {
    if (usedKeys.has(key(p))) return;
    setParticipants(prev => prev.filter(x => key(x) !== key(p)));
  }

  async function handleAddGuest() {
    const name = newGuestName.trim();
    if (!name) return;
    try {
      await setGuest({ name }, user?.idToken);
      const updated = await getGuests(user?.idToken);
      setGuests(updated);
      const created = updated.find(g => g.name === name && !guests.some(og => og.id === g.id));
      if (created) addGuest(created);
      setNewGuestName("");
    } catch (e) {
      setError("ゲスト追加に失敗: " + e.message);
    }
  }

  async function handleSave() {
    if (participants.length < 2) { setError("2人以上必要です"); return; }
    setSaving(true);
    try {
      await onSaved(participants, sessionName.trim());
    } catch (e) {
      setError("保存に失敗しました: " + e.message);
      setSaving(false);
    }
  }

  const addableMembers = members.filter(m => !isIn({ type: "member", uid: m.id }));
  const addableGuests = guests.filter(g => !isIn({ type: "guest", guestId: g.id }));

  return (
    <div style={ms.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ms.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: c.text }}>セッションを編集</h3>
          <button style={ms.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {error && <p style={ms.error}>{error}</p>}

        {/* セッション名 */}
        <p style={ms.label}>セッション名（任意）</p>
        <input
          style={ms.input}
          placeholder="例：正月麻雀、合宿など"
          value={sessionName}
          onChange={e => setSessionName(e.target.value)}
        />

        {/* 現在の参加者 */}
        <p style={ms.label}>参加者（{participants.length}人）</p>
        <div style={ms.chipRow}>
          {participants.map((p, i) => {
            const k = key(p);
            const locked = usedKeys.has(k);
            return (
              <div key={i} style={{ ...ms.chip, ...(locked ? ms.chipLocked : {}) }}>
                <span>{p.displayName ?? p.name ?? "?"}</span>
                {!locked && (
                  <button style={ms.removeBtn} onClick={() => remove(p)}><X size={10} /></button>
                )}
              </div>
            );
          })}
        </div>

        {/* メンバー追加 */}
        {addableMembers.length > 0 && (
          <>
            <p style={ms.label}>メンバーを追加</p>
            <div style={ms.chipRow}>
              {addableMembers.map(m => (
                <button key={m.id} style={ms.addChip} onClick={() => addMember(m)}>
                  + {m.name ?? m.displayName ?? m.id}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ゲスト追加 */}
        {addableGuests.length > 0 && (
          <>
            <p style={ms.label}>ゲストを追加</p>
            <div style={ms.chipRow}>
              {addableGuests.map(g => (
                <button key={g.id} style={ms.addChip} onClick={() => addGuest(g)}>
                  + {g.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 新規ゲスト */}
        <p style={ms.label}>新規ゲスト</p>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            style={ms.input}
            placeholder="名前を入力"
            value={newGuestName}
            onChange={e => setNewGuestName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddGuest()}
          />
          <button style={ms.addGuestBtn} onClick={handleAddGuest} disabled={!newGuestName.trim()}>追加</button>
        </div>

        <button style={{ ...ms.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "保存中…" : "保存する"}
        </button>
      </div>
    </div>
  );
}

const ms = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
  },
  modal: {
    background: "#1e293b", borderRadius: "14px 14px 0 0",
    border: "1px solid #334155", borderBottom: "none",
    padding: "16px 16px 48px", width: "100%", maxWidth: 480,
    maxHeight: "80vh", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: 8,
  },
  closeBtn: {
    background: "none", border: "none", color: c.dim, cursor: "pointer", padding: 4,
  },
  label: { margin: "4px 0 4px", fontSize: 11, color: c.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  error: { color: "#f87171", fontSize: 13, margin: 0, padding: "6px 10px", background: "rgba(248,113,113,0.1)", borderRadius: 6 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 20, padding: "4px 10px", fontSize: 13, color: c.text,
  },
  chipLocked: { opacity: 0.5 },
  removeBtn: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: c.dim, display: "flex", alignItems: "center",
  },
  addChip: {
    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 20, padding: "4px 10px", fontSize: 13, color: c.amber, cursor: "pointer",
  },
  input: {
    flex: 1, background: "#0f172a", border: "1px solid #334155",
    borderRadius: 8, color: c.text, fontSize: 14, padding: "8px 10px",
  },
  addGuestBtn: {
    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 8, color: c.amber, fontSize: 13, padding: "8px 12px", cursor: "pointer",
  },
  saveBtn: {
    marginTop: 8, background: c.amber, color: "#0f172a", border: "none",
    borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", width: "100%",
  },
};
