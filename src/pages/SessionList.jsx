export default function SessionList({ user, onNavigate }) {
  return (
    <div style={s.container}>
      <p style={s.text}>セッション一覧（準備中）</p>
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  text: {
    color: "#64748b",
    fontSize: 14,
  },
};
