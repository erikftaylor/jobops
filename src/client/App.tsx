import { useEffect, useState } from "react";
import "./App.css";
import HealthStatus from "./components/HealthStatus";
import ApplicationStudioPage from "./features/studio/pages/ApplicationStudioPage";
import WorkspacePage from "./features/workspace/pages/WorkspacePage";
import SettingsModal from "./features/settings/components/SettingsModal";

interface WorkspaceViewState {
  type: "workspace";
  jobId: string;
}

type AppViewState = { type: "studio" } | WorkspaceViewState;

function App() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppViewState>({ type: "studio" });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealth(data);
      } catch (err) {
        console.error("Failed to fetch health:", err);
        setHealth({
          status: "unhealthy",
          error: "Failed to connect to server",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  const handleOpenWorkspace = (jobId: string) => {
    setCurrentView({ type: "workspace", jobId });
  };

  const handleBackToStudio = () => {
    setCurrentView({ type: "studio" });
  };

  return (
    <div className="app">
      {currentView.type === "studio" ? (
        <ApplicationStudioPage onOpenWorkspace={handleOpenWorkspace} />
      ) : (
        <WorkspacePage
          jobId={currentView.jobId}
          onBack={handleBackToStudio}
        />
      )}

      {/* Settings Button */}
      <button
        className="app-settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙️
      </button>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Footer Status */}
      <footer className="app-footer">
        <div className="status-bar">
          {!loading && health && <HealthStatus health={health} />}
          {loading && <div className="status-item">Checking system status...</div>}
        </div>
      </footer>
    </div>
  );
}

export default App;
