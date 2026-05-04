export default function Layout({ page, onNavigate, children }) {
  const tabs = [
    { name: "sessions", label: "対戦一覧", icon: "📋" },
    { name: "ranking", label: "ランキング", icon: "🏆" },
    { name: "score-table", label: "点数表", icon: "🧮" },
    { name: "settings", label: "設定", icon: "⚙️" },
  ];

  return (
    <div style={s.root}>
      <header style={s.header}>
        <span style={s.title}>🀄 麻雀対戦表</span>
      </header>
      <main style={s.main}>{children}</main>
      <nav style={s.nav}>
        {tabs.map(tab => (
          <button
            key={tab.name}
            style={{
              ...s.tab,
              ...(page === tab.name ? s.tabActive : {}),
            }}
            onClick={() => onNavigate(tab.name)}
          >
            <span style={s.tabIcon}>{tab.icon}</span>
            <span style={s.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    height: "100dvh",
    background: "#0f172a",
    color: "#f1f5f9",
    fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
  },
  header: {
    padding: "12px 16px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f59e0b",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  nav: {
    display: "flex",
    borderTop: "1px solid #334155",
    background: "#1e293b",
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    fontSize: 11,
  },
  tabActive: {
    color: "#f59e0b",
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
  },
};
