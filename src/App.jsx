import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import SessionList from "./pages/SessionList";
import SessionDetail from "./pages/SessionDetail";
import GameForm from "./pages/GameForm";
import Settlement from "./pages/Settlement";
import Ranking from "./pages/Ranking";
import Settings from "./pages/Settings";
import ScoreTable from "./pages/ScoreTable";

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState({ name: "sessions" });

  function navigate(name, params = {}) {
    setPage({ name, params });
  }

  if (loading) {
    return (
      <div style={s.loading}>
        <span style={s.loadingText}>読み込み中…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={s.loading}>
        <div style={s.loginBox}>
          <div style={s.loginIcon}>🀄</div>
          <p style={s.loginTitle}>麻雀対戦表</p>
          <p style={s.loginDesc}>くまアプリからアクセスしてください</p>
        </div>
      </div>
    );
  }

  const topLevelPage = ["sessions", "ranking", "score-table", "settings"].includes(page.name)
    ? page.name
    : "sessions";

  function renderPage() {
    switch (page.name) {
      case "sessions":
        return <SessionList user={user} onNavigate={navigate} />;
      case "session-detail":
        return <SessionDetail sessionId={page.params?.sessionId} user={user} onNavigate={navigate} />;
      case "game-form":
        return <GameForm sessionId={page.params?.sessionId} gameId={page.params?.gameId} sessionParticipants={page.params?.sessionParticipants} user={user} onNavigate={navigate} />;
      case "settlement":
        return <Settlement sessionId={page.params?.sessionId} user={user} onNavigate={navigate} />;
      case "ranking":
        return <Ranking user={user} />;
      case "score-table":
        return <ScoreTable />;
      case "settings":
        return <Settings user={user} />;
      default:
        return <SessionList user={user} onNavigate={navigate} />;
    }
  }

  return (
    <Layout page={topLevelPage} onNavigate={name => navigate(name)}>
      {renderPage()}
    </Layout>
  );
}

const s = {
  loading: {
    width: "100%",
    height: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  loginBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "32px 24px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 16,
    maxWidth: 280,
    textAlign: "center",
  },
  loginIcon: { fontSize: 48 },
  loginTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9" },
  loginDesc: { margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 },
};
