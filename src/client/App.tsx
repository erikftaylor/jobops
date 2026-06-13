import { useEffect, useState } from "react";
import "./App.css";
import HealthStatus from "./components/HealthStatus";
import JobsPage from "./features/jobs/pages/JobsPage";
import SettingsModal from "./features/settings/components/SettingsModal";

function App() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <div className="app">
      <JobsPage />

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
