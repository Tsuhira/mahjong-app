import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import SessionList from "./pages/SessionList";
import SessionDetail from "./pages/SessionDetail";
import GameForm from "./pages/GameForm";
import Ranking from "./pages/Ranking";
import Settings from "./pages/Settings";

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

  const topLevelPage = ["sessions", "ranking", "settings"].includes(page.name)
    ? page.name
    : "sessions";

  function renderPage() {
    switch (page.name) {
      case "sessions":
        return <SessionList user={user} onNavigate={navigate} />;
      case "session-detail":
        return <SessionDetail sessionId={page.params?.sessionId} user={user} onNavigate={navigate} />;
      case "game-form":
        return <GameForm sessionId={page.params?.sessionId} gameId={page.params?.gameId} user={user} onNavigate={navigate} />;
      case "ranking":
        return <Ranking user={user} />;
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
};
