export default function SessionDetail({ sessionId, user, onNavigate }) {
  return (
    <div style={s.container}>
      <p style={s.text}>セッション詳細（準備中）</p>
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
