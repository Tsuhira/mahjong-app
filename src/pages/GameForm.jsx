import { useState, useEffect } from "react";
import { getRules, getGames, setGame, getUser, setUser } from "../lib/firestoreRest";
import { ChevronLeft, Calculator, Save, Check, AlertTriangle } from "lucide-react";

// 同点は配列インデックス小さい方（上家）を上位とする
function calcRanks(scores) {
  const indexed = scores.map((score, i) => ({ score, i }));
  indexed.sort((a, b) => b.score - a.score || a.i - b.i);
  const ranks = new Array(scores.length);
  indexed.forEach(({ i }, rank) => { ranks[i] = rank + 1; });
  return ranks;
}

function calcFinalScores(rawScores, rule) {
  const { initialPoints, returnPoints, uma, playerCount } = rule;
  const oka = (returnPoints - initialPoints) * playerCount / 1000;
  const ranks = calcRanks(rawScores);
  return rawScores.map((raw, i) => {
    let score = (raw - returnPoints) / 1000 + uma[ranks[i] - 1];
    if (ranks[i] === 1) score += oka;
    return Math.round(score * 10) / 10;
  });
}

const MEDAL = ["🥇", "🥈", "🥉"];
const STEPS = ["ルール選択", "参加者確認", "素点入力"];

export default function GameForm({ sessionId, gameId, sessionParticipants = [], user, onNavigate }) {
  const [step, setStep] = useState(0);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rawScores, setRawScores] = useState([]);
  const [chips, setChips] = useState([]);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRules(user?.idToken)
      .then(r => {
        setRules(r);
        if (gameId) loadExistingGame(r);
        else setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  async function loadExistingGame(ruleList) {
    try {
      const games = await getGames(sessionId, user?.idToken);
      const game = games.find(g => g.id === gameId);
      if (!game) { setLoading(false); return; }
      const rule = ruleList.find(r => r.id === game.ruleId);
      if (rule) {
        setSelectedRule(rule);
        const gamePlayers = game.results.map(r => ({
          ...r,
          name: r.name || sessionParticipants.find(p =>
            (r.type === "member" ? p.uid === r.uid : p.guestId === r.guestId))?.name || "?",
        }));
        setPlayers(gamePlayers);
        setRawScores(game.results.map(r => String(r.rawScore)));
        setChips(game.results.map(r => String(r.chips ?? 0)));
        setStep(2);
      }
      setLoading(false);
    } catch (e) { setError(e.message); setLoading(false); }
  }

  function handleRuleSelect(rule) {
    setSelectedRule(rule);
    const count = rule.playerCount;
    const initial = sessionParticipants.length <= count
      ? [...sessionParticipants]
      : sessionParticipants.slice(0, count);
    setPlayers(initial);
    setRawScores(new Array(count).fill(""));
    setChips(new Array(count).fill("0"));
    setStep(1);
  }

  function togglePlayer(p) {
    const alreadyIn = players.some(x => x === p);
    if (alreadyIn) {
      if (players.length > selectedRule.playerCount) {
        setPlayers(players.filter(x => x !== p));
      }
    } else if (players.length < selectedRule.playerCount) {
      setPlayers([...players, p]);
    }
  }

  function handleCalc() {
    setError("");
    const scores = rawScores.map(s => parseInt(s) || 0);
    const finalScores = calcFinalScores(scores, selectedRule);
    const ranks = calcRanks(scores);
    const rawTotal = scores.reduce((a, b) => a + b, 0);
    const expected = selectedRule.initialPoints * selectedRule.playerCount;
    const finalTotal = Math.round(finalScores.reduce((a, b) => a + b, 0) * 10) / 10;
    setPreview({ scores, finalScores, ranks, rawTotal, expected, finalTotal });
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const game = {
        ...(gameId ? { id: gameId } : {}),
        ruleId: selectedRule.id,
        createdAt: now,
        results: players.map((p, i) => ({
          ...(p.type === "member" ? { uid: p.uid } : { guestId: p.guestId }),
          name: p.name,
          type: p.type,
          rawScore: preview.scores[i],
          rank: preview.ranks[i],
          finalScore: preview.finalScores[i],
          chips: selectedRule.hasChip ? (parseInt(chips[i]) || 0) : 0,
        })),
      };
      await setGame(sessionId, game, user?.idToken);

      // メンバーのユーザー統計を更新
      await Promise.allSettled(
        players.map(async (p, i) => {
          if (p.type !== "member" || !p.uid) return;
          const current = await getUser(p.uid, user?.idToken);
          const prevTotal = current?.totalPoints ?? 0;
          const prevCount = current?.totalGames ?? 0;
          await setUser(p.uid, {
            displayName: p.name,
            totalPoints: Math.round((prevTotal + preview.finalScores[i]) * 10) / 10,
            totalGames: prevCount + 1,
            lastPlayedAt: now,
          }, user?.idToken);
        })
      );

      onNavigate("session-detail", { sessionId });
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <div style={s.center}>読み込み中...</div>;

  const rawTotal = rawScores.reduce((sum, v) => sum + (parseInt(v) || 0), 0);
  const expectedTotal = selectedRule ? selectedRule.initialPoints * selectedRule.playerCount : 0;
  const totalOk = selectedRule && rawTotal === expectedTotal;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button
          style={s.backBtn}
          onClick={() => step > 0 ? setStep(s => s - 1) : onNavigate("session-detail", { sessionId })}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={s.title}>{gameId ? "対局編集" : "対局入力"}</h2>
      </div>

      {/* ステップインジケーター */}
      <div style={s.stepBar}>
        {STEPS.map((label, i) => (
          <div key={i} style={s.stepItem}>
            <div style={{ ...s.stepDot, ...(i <= step ? s.stepDotActive : i < step ? s.stepDotDone : {}) }}>
              {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
            </div>
            <span style={{ ...s.stepLabel, ...(i === step ? s.stepLabelActive : {}) }}>{label}</span>
            {i < STEPS.length - 1 && (
              <div style={{ ...s.stepLine, ...(i < step ? s.stepLineActive : {}) }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Step 0: ルール選択 */}
      {step === 0 && (
        <div style={s.section}>
          <p style={s.sectionHint}>使用するルールを選択してください</p>
          {rules.length === 0 ? (
            <div style={s.emptyBox}>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>ルールが未作成です</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>設定画面でルールを作成してください</p>
            </div>
          ) : (
            <div style={s.cardList}>
              {rules.map(rule => (
                <button key={rule.id} style={s.ruleCard} onClick={() => handleRuleSelect(rule)}>
                  <div style={s.ruleName}>{rule.name}</div>
                  <div style={s.ruleMeta}>
                    {rule.playerCount}人 &middot; 持ち{(rule.initialPoints ?? 0).toLocaleString()}
                    &nbsp;&middot; 返し{(rule.returnPoints ?? 0).toLocaleString()}
                    {Array.isArray(rule.uma) && ` · ウマ [${rule.uma.join("/")}]`}
                    {rule.hasChip && ` · チップ×${rule.chipRate}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: 参加者確認 */}
      {step === 1 && selectedRule && (
        <div style={s.section}>
          <p style={s.sectionHint}>
            {sessionParticipants.length > selectedRule.playerCount
              ? `対局する ${selectedRule.playerCount} 人を選択してください（現在 ${players.length}人選択中）`
              : `参加者 ${selectedRule.playerCount} 人を確認してください`}
          </p>
          <div style={s.cardList}>
            {sessionParticipants.map((p, i) => {
              const selected = players.includes(p);
              const canToggle = sessionParticipants.length > selectedRule.playerCount;
              return (
                <div
                  key={i}
                  style={{ ...s.playerCard, ...(selected ? s.playerCardSelected : {}), ...(canToggle ? { cursor: "pointer" } : {}) }}
                  onClick={canToggle ? () => togglePlayer(p) : undefined}
                >
                  <span style={s.playerName}>{p.name}</span>
                  <span style={{ ...s.playerBadge, ...(p.type === "guest" ? s.guestBadge : {}) }}>
                    {p.type === "member" ? "メンバー" : "ゲスト"}
                  </span>
                  {selected && <Check size={15} color="#c9a227" style={{ marginLeft: "auto" }} />}
                </div>
              );
            })}
          </div>
          <button
            style={{ ...s.primaryBtn, ...(players.length !== selectedRule.playerCount ? s.btnDisabled : {}) }}
            disabled={players.length !== selectedRule.playerCount}
            onClick={() => setStep(2)}
          >
            次へ →
          </button>
        </div>
      )}

      {/* Step 2: 素点入力 */}
      {step === 2 && selectedRule && (
        <div style={s.section}>
          <p style={s.sectionHint}>各プレイヤーの素点を入力してください</p>

          <div style={s.cardList}>
            {players.map((p, i) => (
              <div key={i} style={s.scoreRow}>
                <span style={s.scorePlayerName}>{p.name}</span>
                <div style={s.scoreInputs}>
                  <div style={s.inputGroup}>
                    <span style={s.inputLabel}>素点</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      style={s.input}
                      value={rawScores[i]}
                      placeholder="0"
                      onChange={e => {
                        const next = [...rawScores];
                        next[i] = e.target.value;
                        setRawScores(next);
                        setPreview(null);
                      }}
                    />
                  </div>
                  {selectedRule.hasChip && (
                    <div style={s.inputGroup}>
                      <span style={s.inputLabel}>チップ</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        style={{ ...s.input, width: 64 }}
                        value={chips[i]}
                        placeholder="0"
                        onChange={e => {
                          const next = [...chips];
                          next[i] = e.target.value;
                          setChips(next);
                          setPreview(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 合計チェック */}
          {rawScores.some(s => s !== "") && (
            <div style={{ ...s.totalBar, ...(totalOk ? s.totalOk : s.totalWarn) }}>
              <span>合計: {rawTotal.toLocaleString()}</span>
              <span style={{ opacity: 0.7 }}>/ {expectedTotal.toLocaleString()}</span>
              {!totalOk && (
                <span style={{ marginLeft: 4 }}>
                  (差: {rawTotal - expectedTotal > 0 ? "+" : ""}{(rawTotal - expectedTotal).toLocaleString()})
                </span>
              )}
              {totalOk && <Check size={14} style={{ marginLeft: 4 }} />}
            </div>
          )}

          <button
            style={{ ...s.calcBtn, ...(rawScores.some(v => v === "") ? s.btnDisabled : {}) }}
            disabled={rawScores.some(v => v === "")}
            onClick={handleCalc}
          >
            <Calculator size={15} />
            計算する
          </button>

          {/* 計算プレビュー */}
          {preview && (
            <div style={s.previewBox}>
              <div style={s.previewTitle}>計算結果</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>順位</th>
                    <th style={{ ...s.th, textAlign: "left" }}>名前</th>
                    <th style={s.th}>素点</th>
                    <th style={s.th}>最終点</th>
                    {selectedRule.hasChip && <th style={s.th}>チップ</th>}
                  </tr>
                </thead>
                <tbody>
                  {players
                    .map((p, i) => ({ p, i }))
                    .sort((a, b) => preview.ranks[a.i] - preview.ranks[b.i])
                    .map(({ p, i }) => {
                      const rank = preview.ranks[i];
                      const fs = preview.finalScores[i];
                      const chipPts = selectedRule.hasChip
                        ? (parseInt(chips[i]) || 0) * selectedRule.chipRate
                        : 0;
                      return (
                        <tr key={i}>
                          <td style={s.td}>
                            {rank <= 3 ? MEDAL[rank - 1] : <span style={{ color: "#64748b" }}>{rank}位</span>}
                          </td>
                          <td style={{ ...s.td, textAlign: "left", fontWeight: "500" }}>{p.name}</td>
                          <td style={s.td}>{preview.scores[i].toLocaleString()}</td>
                          <td style={{ ...s.td, fontWeight: "bold", color: fs >= 0 ? "#4ade80" : "#f87171" }}>
                            {fs > 0 ? "+" : ""}{fs}
                          </td>
                          {selectedRule.hasChip && (
                            <td style={{ ...s.td, color: "#94a3b8", fontSize: 12 }}>
                              {parseInt(chips[i]) || 0}枚
                              {chipPts !== 0 && ` (${chipPts > 0 ? "+" : ""}${chipPts.toFixed(1)})`}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {Math.abs(preview.finalTotal) > 0.05 && (
                <div style={s.warnRow}>
                  <AlertTriangle size={13} />
                  合計得点が0になっていません（{preview.finalTotal > 0 ? "+" : ""}{preview.finalTotal}）
                </div>
              )}

              <button
                style={{ ...s.saveBtn, ...(saving ? s.btnDisabled : {}) }}
                disabled={saving}
                onClick={handleSave}
              >
                <Save size={15} />
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const gold = "#c9a227";
const green = "#1a5c3a";

const s = {
  container: { paddingBottom: 24 },
  center: { textAlign: "center", padding: 48, color: "#94a3b8" },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20 },
  backBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#94a3b8", padding: 4, display: "flex", alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "bold", color: "#f1f5f9", margin: 0 },

  stepBar: {
    display: "flex", alignItems: "center",
    marginBottom: 24, gap: 0,
  },
  stepItem: { display: "flex", alignItems: "center", flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: "50%",
    background: "#334155", color: "#475569",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: "bold", flexShrink: 0,
  },
  stepDotActive: { background: gold, color: "#0f172a" },
  stepDotDone: { background: green, color: "#fff" },
  stepLabel: { fontSize: 10, color: "#475569", marginLeft: 4, whiteSpace: "nowrap" },
  stepLabelActive: { color: gold },
  stepLine: { flex: 1, height: 1, background: "#334155", margin: "0 4px" },
  stepLineActive: { background: gold },

  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionHint: { margin: 0, fontSize: 12, color: "#94a3b8" },

  emptyBox: {
    background: "#1e293b", borderRadius: 10, padding: "20px 16px",
    textAlign: "center", color: "#64748b",
  },
  cardList: { display: "flex", flexDirection: "column", gap: 8 },

  ruleCard: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
    padding: "12px 14px", cursor: "pointer", textAlign: "left",
    color: "#f1f5f9", transition: "border-color 0.15s",
  },
  ruleName: { fontSize: 15, fontWeight: "bold", color: gold, marginBottom: 4 },
  ruleMeta: { fontSize: 12, color: "#64748b" },

  playerCard: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
    padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
    color: "#94a3b8",
  },
  playerCardSelected: { border: `1px solid ${gold}`, background: "#1c2820", color: "#f1f5f9" },
  playerName: { fontSize: 14, fontWeight: "500", flex: 1 },
  playerBadge: {
    fontSize: 10, padding: "2px 6px", borderRadius: 4,
    background: "#1a5c3a", color: "#4ade80",
  },
  guestBadge: { background: "#1e3a5f", color: "#60a5fa" },

  primaryBtn: {
    background: green, color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 16px", fontSize: 14, fontWeight: "bold",
    cursor: "pointer", width: "100%", marginTop: 4,
  },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },

  scoreRow: {
    background: "#1e293b", borderRadius: 10, padding: "10px 12px",
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  scorePlayerName: { flex: 1, fontSize: 14, color: "#f1f5f9", minWidth: 60 },
  scoreInputs: { display: "flex", gap: 8, flexShrink: 0 },
  inputGroup: { display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" },
  inputLabel: { fontSize: 10, color: "#475569" },
  input: {
    width: 88, background: "#0f172a", border: "1px solid #334155",
    borderRadius: 6, padding: "6px 8px", color: "#f1f5f9",
    fontSize: 14, textAlign: "right",
  },

  totalBar: {
    display: "flex", alignItems: "center", gap: 4,
    borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: "bold",
  },
  totalOk: { background: "#14532d", color: "#4ade80" },
  totalWarn: { background: "#7f1d1d", color: "#f87171" },

  calcBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: green, color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 16px", fontSize: 14, fontWeight: "bold",
    cursor: "pointer", width: "100%",
  },

  previewBox: {
    background: "#1e293b", border: `1px solid ${gold}`, borderRadius: 10, padding: 14,
  },
  previewTitle: { fontSize: 13, fontWeight: "bold", color: gold, marginBottom: 10 },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "6px 8px", textAlign: "center",
    color: "#64748b", fontSize: 11, fontWeight: "bold",
    borderBottom: "1px solid #334155",
  },
  td: {
    padding: "8px", textAlign: "center",
    color: "#f1f5f9", borderBottom: "1px solid #0f172a",
  },

  warnRow: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#7f1d1d", color: "#f87171", borderRadius: 6,
    padding: "7px 10px", fontSize: 12, marginTop: 10,
  },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: gold, color: "#0f172a", border: "none", borderRadius: 10,
    padding: "12px 16px", fontSize: 14, fontWeight: "bold",
    cursor: "pointer", width: "100%", marginTop: 12,
  },

  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#7f1d1d", color: "#f87171", borderRadius: 8,
    padding: "10px 14px", fontSize: 13, marginBottom: 4,
  },
};
