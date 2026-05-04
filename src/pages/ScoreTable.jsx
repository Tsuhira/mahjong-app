import { useState } from "react";

const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

function calcScore(isDealer, isTsumo, han, fu, honba) {
  const bp = fu * Math.pow(2, han + 2);
  const honbaBonus = honba * 300;
  const honbaEach = honba * 100;

  let level = null;
  if (han >= 13) level = "yakuman";
  else if (han >= 11) level = "sanbaiman";
  else if (han >= 8) level = "baiman";
  else if (han >= 6) level = "haneman";
  else if (han >= 5 || bp >= 2000) level = "mangan";

  const levelLabel = {
    mangan: "満貫", haneman: "跳満", baiman: "倍満",
    sanbaiman: "三倍満", yakuman: "役満",
  };

  if (level) {
    const koBase  = { mangan: 8000, haneman: 12000, baiman: 16000, sanbaiman: 24000, yakuman: 32000 };
    const oyaBase = { mangan: 12000, haneman: 18000, baiman: 24000, sanbaiman: 36000, yakuman: 48000 };
    const koTsumoKo  = { mangan: 1000, haneman: 1500, baiman: 2000, sanbaiman: 3000, yakuman: 4000 };
    const koTsumoOya = { mangan: 2000, haneman: 3000, baiman: 4000, sanbaiman: 6000, yakuman: 8000 };
    const oyaTsumoEach = { mangan: 2000, haneman: 3000, baiman: 4000, sanbaiman: 6000, yakuman: 8000 };

    if (isTsumo) {
      if (isDealer) {
        const each = oyaTsumoEach[level];
        return { level: levelLabel[level], isDealer, isTsumo, each, total: each * 3 + honbaBonus, honbaBonus, honbaEach };
      } else {
        const fromKo = koTsumoKo[level];
        const fromOya = koTsumoOya[level];
        return { level: levelLabel[level], isDealer, isTsumo, fromKo, fromOya, total: fromOya + fromKo * 2 + honbaBonus, honbaBonus, honbaEach };
      }
    } else {
      const base = isDealer ? oyaBase[level] : koBase[level];
      return { level: levelLabel[level], isDealer, isTsumo, total: base + honbaBonus, honbaBonus };
    }
  } else {
    if (isTsumo) {
      if (isDealer) {
        const each = Math.ceil((bp * 2) / 100) * 100;
        return { isDealer, isTsumo, each, total: each * 3 + honbaBonus, honbaBonus, honbaEach };
      } else {
        const fromOya = Math.ceil((bp * 2) / 100) * 100;
        const fromKo  = Math.ceil(bp / 100) * 100;
        return { isDealer, isTsumo, fromKo, fromOya, total: fromOya + fromKo * 2 + honbaBonus, honbaBonus, honbaEach };
      }
    } else {
      const base = isDealer
        ? Math.ceil((bp * 6) / 100) * 100
        : Math.ceil((bp * 4) / 100) * 100;
      const kiriagemangan = (!isDealer && base === 7700) || (isDealer && base === 11600);
      const manganBase = isDealer ? 12000 : 8000;
      const effectiveBase = kiriagemangan ? manganBase : base;
      return { isDealer, isTsumo, total: effectiveBase + honbaBonus, honbaBonus, kiriagemangan, originalBase: kiriagemangan ? base : null, manganBase: kiriagemangan ? manganBase : null };
    }
  }
}

export default function ScoreTable() {
  const [isDealer, setIsDealer] = useState(false);
  const [isTsumo, setIsTsumo] = useState(false);
  const [han, setHan] = useState(3);
  const [fu, setFu] = useState(30);
  const [honba, setHonba] = useState(0);

  const result = calcScore(isDealer, isTsumo, han, fu, honba);

  return (
    <div style={s.wrap}>
      <p style={s.sectionTitle}>条件入力</p>

      {/* 親子 / ツモロン */}
      <div style={s.row}>
        <div style={s.toggleGroup}>
          <button style={{ ...s.toggle, ...(isDealer ? {} : s.toggleOn) }} onClick={() => setIsDealer(false)}>子</button>
          <button style={{ ...s.toggle, ...(isDealer ? s.toggleOn : {}) }} onClick={() => setIsDealer(true)}>親</button>
        </div>
        <div style={s.toggleGroup}>
          <button style={{ ...s.toggle, ...(!isTsumo ? s.toggleOn : {}) }} onClick={() => setIsTsumo(false)}>ロン</button>
          <button style={{ ...s.toggle, ...(isTsumo ? s.toggleOn : {}) }} onClick={() => setIsTsumo(true)}>ツモ</button>
        </div>
      </div>

      {/* 翻数 */}
      <div style={s.inputRow}>
        <span style={s.label}>翻数</span>
        <div style={s.stepper}>
          <button style={s.stepBtn} onClick={() => setHan(h => Math.max(1, h - 1))}>－</button>
          <span style={s.stepVal}>{han}翻</span>
          <button style={s.stepBtn} onClick={() => setHan(h => Math.min(13, h + 1))}>＋</button>
        </div>
      </div>

      {/* 符数 */}
      <div style={s.inputRow}>
        <span style={s.label}>符数</span>
        <div style={s.fuGrid}>
          {FU_LIST.map(f => (
            <button
              key={f}
              style={{ ...s.fuBtn, ...(fu === f ? s.fuBtnOn : {}) }}
              onClick={() => setFu(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 本場 */}
      <div style={s.inputRow}>
        <span style={s.label}>本場</span>
        <div style={s.stepper}>
          <button style={s.stepBtn} onClick={() => setHonba(h => Math.max(0, h - 1))}>－</button>
          <span style={s.stepVal}>{honba}本場</span>
          <button style={s.stepBtn} onClick={() => setHonba(h => Math.min(20, h + 1))}>＋</button>
        </div>
      </div>

      {/* 結果 */}
      <div style={s.resultCard}>
        {result.level && <div style={s.levelBadge}>{result.level}</div>}
        {result.kiriagemangan && <div style={s.levelBadge}>切り上げ満貫</div>}
        <div style={s.totalRow}>
          <span style={s.totalLabel}>合計</span>
          <span style={s.totalVal}>{result.total.toLocaleString()}点</span>
        </div>
        <div style={s.divider} />
        {result.isTsumo ? (
          result.isDealer ? (
            <Detail label="全員から" val={`各${result.each.toLocaleString()}点`} />
          ) : (
            <>
              <Detail label="親から" val={`${result.fromOya.toLocaleString()}点`} />
              <Detail label="子から" val={`各${result.fromKo.toLocaleString()}点`} />
            </>
          )
        ) : (
          <Detail
            label="放銃者から"
            val={result.kiriagemangan
              ? `${result.manganBase.toLocaleString()}(${result.originalBase.toLocaleString()})点`
              : `${(result.total - result.honbaBonus).toLocaleString()}点`}
          />
        )}
        {honba > 0 && (
          <Detail
            label={`本場ボーナス (${honba}本場)`}
            val={result.isTsumo
              ? `各${result.honbaEach.toLocaleString()}点`
              : `+${result.honbaBonus.toLocaleString()}点`}
            sub
          />
        )}
      </div>
    </div>
  );
}

function Detail({ label, val, sub }) {
  return (
    <div style={{ ...s.detail, ...(sub ? s.detailSub : {}) }}>
      <span style={s.detailLabel}>{label}</span>
      <span style={s.detailVal}>{val}</span>
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  sectionTitle: { margin: 0, fontSize: 12, color: "#64748b", letterSpacing: 1 },
  row: { display: "flex", gap: 12 },
  toggleGroup: {
    display: "flex",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #334155",
    flex: 1,
  },
  toggle: {
    flex: 1,
    padding: "10px 0",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
  },
  toggleOn: {
    background: "#f59e0b",
    color: "#0f172a",
  },
  inputRow: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  label: { fontSize: 12, color: "#94a3b8" },
  stepper: { display: "flex", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#f1f5f9",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepVal: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "#f1f5f9" },
  fuGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  fuBtn: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #475569",
    background: "#0f172a",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
    minWidth: 44,
  },
  fuBtnOn: {
    background: "#f59e0b",
    color: "#0f172a",
    border: "1px solid #f59e0b",
    fontWeight: 700,
  },
  resultCard: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 4,
  },
  levelBadge: {
    alignSelf: "flex-start",
    background: "#dc2626",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 10px",
    borderRadius: 99,
  },
  totalRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 13, color: "#94a3b8" },
  totalVal: { fontSize: 28, fontWeight: 800, color: "#f59e0b" },
  divider: { height: 1, background: "#334155" },
  detail: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#cbd5e1",
  },
  detailSub: { color: "#64748b", fontSize: 12 },
  detailLabel: {},
  detailVal: { fontWeight: 600 },
};
