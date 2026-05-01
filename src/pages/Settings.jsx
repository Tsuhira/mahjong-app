import { useState, useEffect } from "react";
import { getRules, setRule, deleteRule } from "../lib/firestoreRest";

const DEFAULT_RULES = [
  {
    id: "sanma-default",
    name: "三麻（標準）",
    playerCount: 3,
    initialPoints: 35000,
    returnPoints: 40000,
    uma: [20, 0, -20],
    hasChip: true,
    chipRate: 1000,
  },
  {
    id: "yonma-default",
    name: "四麻（標準）",
    playerCount: 4,
    initialPoints: 25000,
    returnPoints: 30000,
    uma: [20, 10, -10, -20],
    hasChip: false,
    chipRate: 0,
  },
];

function emptyForm(playerCount = 4) {
  return {
    id: "",
    name: "",
    playerCount,
    initialPoints: 25000,
    returnPoints: 30000,
    uma: playerCount === 3 ? [20, 0, -20] : [20, 10, -10, -20],
    hasChip: false,
    chipRate: 0,
  };
}

export default function Settings({ user }) {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(null); // null | form object
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRules();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRules() {
    try {
      const list = await getRules(user?.idToken);
      setRules(list);
      if (list.length === 0 && user?.idToken) {
        await seedDefaultRules(user.idToken);
      }
    } catch (e) {
      setRules([]);
      setError("ルールの読み込みに失敗しました: " + e.message);
    }
  }

  async function seedDefaultRules(idToken) {
    for (const rule of DEFAULT_RULES) {
      await setRule(rule, idToken);
    }
    const list = await getRules(idToken);
    setRules(list);
  }

  async function handleSave() {
    if (!editing.name.trim()) {
      setError("ルール名を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setRule(editing, user?.idToken);
      await loadRules();
      setEditing(null);
    } catch (e) {
      setError("保存に失敗しました: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId) {
    if (!window.confirm("このルールを削除しますか？")) return;
    try {
      await deleteRule(ruleId, user?.idToken);
      await loadRules();
    } catch (e) {
      setError("削除に失敗しました: " + e.message);
    }
  }

  function handlePlayerCountChange(count) {
    const pc = Number(count);
    setEditing(prev => ({
      ...prev,
      playerCount: pc,
      uma: pc === 3 ? [20, 0, -20] : [20, 10, -10, -20],
    }));
  }

  function handleUmaChange(index, value) {
    setEditing(prev => {
      const uma = [...prev.uma];
      uma[index] = Number(value);
      return { ...prev, uma };
    });
  }

  if (rules === null) {
    return <p style={s.loading}>読み込み中…</p>;
  }

  if (editing) {
    return (
      <div style={s.container}>
        <div style={s.formHeader}>
          <h2 style={s.heading}>{editing.id ? "ルール編集" : "ルール作成"}</h2>
          <button style={s.cancelBtn} onClick={() => { setEditing(null); setError(null); }}>
            キャンセル
          </button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.field}>
          <label style={s.label}>ルール名</label>
          <input
            style={s.input}
            value={editing.name}
            onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
            placeholder="例: 三麻（標準）"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>人数</label>
          <select
            style={s.input}
            value={editing.playerCount}
            onChange={e => handlePlayerCountChange(e.target.value)}
          >
            <option value={3}>3人</option>
            <option value={4}>4人</option>
          </select>
        </div>

        <div style={s.field}>
          <label style={s.label}>配給原点</label>
          <input
            style={s.input}
            type="number"
            value={editing.initialPoints}
            onChange={e => setEditing(p => ({ ...p, initialPoints: Number(e.target.value) }))}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>返し点</label>
          <input
            style={s.input}
            type="number"
            value={editing.returnPoints}
            onChange={e => setEditing(p => ({ ...p, returnPoints: Number(e.target.value) }))}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>ウマ</label>
          <div style={s.umaRow}>
            {editing.uma.map((v, i) => (
              <input
                key={i}
                style={{ ...s.input, flex: 1 }}
                type="number"
                value={v}
                onChange={e => handleUmaChange(i, e.target.value)}
              />
            ))}
          </div>
          <p style={s.hint}>
            {editing.playerCount === 3
              ? "1位 / 2位 / 3位の順"
              : "1位 / 2位 / 3位 / 4位の順"}
          </p>
        </div>

        <div style={s.field}>
          <label style={s.checkLabel}>
            <input
              type="checkbox"
              checked={editing.hasChip}
              onChange={e => setEditing(p => ({ ...p, hasChip: e.target.checked }))}
              style={s.checkbox}
            />
            チップあり
          </label>
        </div>

        {editing.hasChip && (
          <div style={s.field}>
            <label style={s.label}>チップレート（点/枚）</label>
            <input
              style={s.input}
              type="number"
              value={editing.chipRate}
              onChange={e => setEditing(p => ({ ...p, chipRate: Number(e.target.value) }))}
            />
          </div>
        )}

        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.listHeader}>
        <h2 style={s.heading}>ルール設定</h2>
        <button style={s.addBtn} onClick={() => { setError(null); setEditing(emptyForm()); }}>
          ＋ 追加
        </button>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {rules.length === 0 ? (
        <p style={s.empty}>ルールがありません</p>
      ) : (
        <ul style={s.list}>
          {rules.map(rule => (
            <li key={rule.id} style={s.item}>
              <div style={s.itemInfo}>
                <span style={s.itemName}>{rule.name}</span>
                <span style={s.itemMeta}>
                  {rule.playerCount}人 / 原点{rule.initialPoints.toLocaleString()} / 返し{rule.returnPoints.toLocaleString()}
                </span>
                <span style={s.itemMeta}>
                  ウマ [{rule.uma?.join(", ")}]{rule.hasChip ? ` / チップ${rule.chipRate}点` : ""}
                </span>
              </div>
              <div style={s.itemActions}>
                <button
                  style={s.editBtn}
                  onClick={() => { setError(null); setEditing({ ...rule }); }}
                >
                  編集
                </button>
                <button style={s.deleteBtn} onClick={() => handleDelete(rule.id)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  loading: {
    color: "#94a3b8",
    fontSize: 14,
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    margin: 0,
    fontSize: 16,
    fontWeight: "bold",
    color: "#f1f5f9",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    margin: 0,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: 6,
    border: "1px solid rgba(248,113,113,0.3)",
  },
  empty: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    padding: "24px 0",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "#1e293b",
    borderRadius: 8,
    padding: "12px 14px",
    border: "1px solid #334155",
    gap: 8,
  },
  itemInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#f1f5f9",
  },
  itemMeta: {
    fontSize: 12,
    color: "#94a3b8",
  },
  itemActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  input: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#f1f5f9",
    fontSize: 14,
    padding: "8px 10px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  umaRow: {
    display: "flex",
    gap: 6,
  },
  hint: {
    margin: 0,
    fontSize: 11,
    color: "#64748b",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#f1f5f9",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  saveBtn: {
    background: "#f59e0b",
    color: "#0f172a",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontSize: 15,
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    marginTop: 8,
  },
  addBtn: {
    background: "rgba(245,158,11,0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.4)",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  editBtn: {
    background: "rgba(148,163,184,0.1)",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  cancelBtn: {
    background: "none",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "rgba(248,113,113,0.1)",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
};
