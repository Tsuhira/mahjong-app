import { useState, useEffect } from "react";
import { getSessions, setSession, getUsers, getGuests, setGuest } from "../lib/firestoreRest";
import { Plus, Check, ChevronRight, UserPlus } from "lucide-react";

const c = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  dim: "#64748b",
  amber: "#f59e0b",
  green: "#10b981",
  greenBg: "rgba(16,185,129,0.12)",
  blue: "#60a5fa",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return "日付不明";
  const [y, m, d] = dateStr.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export default function SessionList({ user, onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await getSessions(user?.idToken);
      list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      setSessions(list);
    } catch (e) {
      console.error("getSessions failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreated(newSessionId) {
    setShowCreate(false);
    await load();
    onNavigate("session-detail", { sessionId: newSessionId });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <span style={{ color: c.dim, fontSize: 14 }}>読み込み中…</span>
      </div>
    );
  }

  return (
    <div>
      {user && (
        <button style={s.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          <span>新規セッション</span>
        </button>
      )}

      {sessions.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: 32 }}>🀄</span>
          <p style={{ color: c.dim, fontSize: 14, margin: "8px 0 0" }}>セッションがありません</p>
        </div>
      ) : (
        <div style={s.list}>
          {sessions.map(sess => {
            const names = (sess.participants ?? [])
              .map(p => p.displayName ?? p.name ?? "?")
              .join("、");
            return (
              <button
                key={sess.id}
                style={s.card}
                onClick={() => onNavigate("session-detail", { sessionId: sess.id })}
              >
                <div style={s.cardLeft}>
                  <div style={s.cardDate}>{formatDate(sess.date)}</div>
                  <div style={s.cardNames}>{names || "参加者なし"}</div>
                </div>
                <div style={s.cardRight}>
                  {sess.settled && (
                    <span style={s.settledBadge}>
                      <Check size={10} /> 精算済み
                    </span>
                  )}
                  <ChevronRight size={16} color={c.dim} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          user={user}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateModal({ user, onCreated, onClose }) {
  const [date, setDate] = useState(today());
  const [members, setMembers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getUsers(user?.idToken).catch(() => []),
      getGuests(user?.idToken).catch(() => []),
    ]).then(([u, g]) => {
      setMembers(u);
      setGuests(g);
    });
  }, []);

  function toggleMember(m) {
    const key = `m:${m.id}`;
    setSelected(prev =>
      prev.some(p => p._key === key)
        ? prev.filter(p => p._key !== key)
        : [...prev, { _key: key, type: "member", uid: m.id, displayName: m.name ?? m.displayName ?? m.id }]
    );
  }

  function toggleGuest(g) {
    const key = `g:${g.id}`;
    setSelected(prev =>
      prev.some(p => p._key === key)
        ? prev.filter(p => p._key !== key)
        : [...prev, { _key: key, type: "guest", guestId: g.id, name: g.name }]
    );
  }

  async function handleAddGuest() {
    const name = newGuestName.trim();
    if (!name) return;
    try {
      await setGuest({ name }, user?.idToken);
      const updated = await getGuests(user?.idToken);
      setGuests(updated);
      const created = updated.find(g => g.name === name && !guests.some(og => og.id === g.id));
      if (created) {
        const key = `g:${created.id}`;
        setSelected(prev => [...prev, { _key: key, type: "guest", guestId: created.id, name: created.name }]);
      }
      setNewGuestName("");
      setAddingGuest(false);
    } catch (e) {
      setError("ゲスト追加に失敗しました: " + e.message);
    }
  }

  async function handleCreate() {
    if (selected.length < 2) {
      setError("参加者を2人以上選択してください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const participants = selected.map(({ _key, ...rest }) => rest); // eslint-disable-line no-unused-vars
      const newId = await setSession({
        date,
        settled: false,
        settledAt: null,
        createdBy: user?.uid ?? null,
        participants,
      }, user?.idToken);
      onCreated(newId);
    } catch (e) {
      setError("作成に失敗しました: " + e.message);
      setSaving(false);
    }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <h2 style={s.modalTitle}>新規セッション</h2>

        <div style={s.field}>
          <label style={s.label}>日付</label>
          <input
            type="date"
            style={s.dateInput}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>参加者（{selected.length}人選択中）</label>

          {members.length > 0 && (
            <>
              <p style={s.subLabel}>メンバー</p>
              <div style={s.playerGrid}>
                {members.map(m => {
                  const sel = selected.some(p => p._key === `m:${m.id}`);
                  return (
                    <button
                      key={m.id}
                      style={{ ...s.playerChip, ...(sel ? s.playerChipSelected : {}) }}
                      onClick={() => toggleMember(m)}
                    >
                      {sel && <Check size={11} />}
                      {m.name ?? m.displayName ?? m.id}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <p style={s.subLabel}>ゲスト</p>
          <div style={s.playerGrid}>
            {guests.map(g => {
              const sel = selected.some(p => p._key === `g:${g.id}`);
              return (
                <button
                  key={g.id}
                  style={{ ...s.playerChip, ...s.guestChip, ...(sel ? s.playerChipSelected : {}) }}
                  onClick={() => toggleGuest(g)}
                >
                  {sel && <Check size={11} />}
                  {g.name}
                </button>
              );
            })}
            {addingGuest ? (
              <div style={s.guestInputRow}>
                <input
                  autoFocus
                  style={s.guestInput}
                  value={newGuestName}
                  onChange={e => setNewGuestName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddGuest(); if (e.key === "Escape") setAddingGuest(false); }}
                  placeholder="名前を入力"
                />
                <button style={s.guestAddOkBtn} onClick={handleAddGuest}>追加</button>
              </div>
            ) : (
              <button style={s.addGuestBtn} onClick={() => setAddingGuest(true)}>
                <UserPlus size={12} />
                ゲスト追加
              </button>
            )}
          </div>
        </div>

        {error && <p style={s.errorText}>{error}</p>}

        <div style={s.modalActions}>
          <button style={s.cancelBtn} onClick={onClose}>キャンセル</button>
          <button
            style={{ ...s.okBtn, opacity: (saving || selected.length < 2) ? 0.5 : 1 }}
            disabled={saving || selected.length < 2}
            onClick={handleCreate}
          >
            {saving ? "作成中…" : "作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  createBtn: {
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
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 0",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    cursor: "pointer",
    color: c.text,
    textAlign: "left",
    width: "100%",
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  cardDate: {
    fontSize: 15,
    fontWeight: 700,
    color: c.text,
  },
  cardNames: {
    fontSize: 12,
    color: c.dim,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  settledBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 8px",
    background: c.greenBg,
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 20,
    color: c.green,
    fontSize: 11,
    fontWeight: 600,
  },

  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
    padding: "0 0 env(safe-area-inset-bottom)",
  },
  modal: {
    background: "#1e293b",
    borderRadius: "16px 16px 0 0",
    padding: "20px 16px 32px",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85dvh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: c.text,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: c.dim,
  },
  subLabel: {
    margin: "4px 0 2px",
    fontSize: 11,
    color: c.dim,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  dateInput: {
    background: "#0f172a",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.text,
    fontSize: 15,
    padding: "10px 12px",
    width: "100%",
    boxSizing: "border-box",
  },
  playerGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  playerChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 12px",
    background: "#0f172a",
    border: `1px solid ${c.border}`,
    borderRadius: 20,
    color: c.dim,
    fontSize: 13,
    cursor: "pointer",
  },
  playerChipSelected: {
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.5)",
    color: c.amber,
  },
  guestChip: {
    border: `1px solid rgba(96,165,250,0.3)`,
    color: c.blue,
  },
  guestInputRow: {
    display: "flex",
    gap: 6,
    width: "100%",
  },
  guestInput: {
    flex: 1,
    background: "#0f172a",
    border: `1px solid ${c.border}`,
    borderRadius: 20,
    color: c.text,
    fontSize: 13,
    padding: "7px 12px",
    outline: "none",
  },
  guestAddOkBtn: {
    background: "rgba(96,165,250,0.15)",
    border: "1px solid rgba(96,165,250,0.4)",
    borderRadius: 20,
    color: c.blue,
    fontSize: 13,
    padding: "7px 12px",
    cursor: "pointer",
  },
  addGuestBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 12px",
    background: "transparent",
    border: "1px dashed rgba(96,165,250,0.4)",
    borderRadius: 20,
    color: "rgba(96,165,250,0.7)",
    fontSize: 13,
    cursor: "pointer",
  },
  errorText: {
    margin: 0,
    fontSize: 12,
    color: "#f87171",
    padding: "8px 10px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: 6,
    border: "1px solid rgba(248,113,113,0.3)",
  },
  modalActions: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "transparent",
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    color: c.dim,
    fontSize: 14,
    cursor: "pointer",
  },
  okBtn: {
    flex: 2,
    padding: "12px",
    background: c.amber,
    border: "none",
    borderRadius: 10,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
