import { useState, useEffect } from "react";

export interface AppSettings {
  autoProceedThreshold: number;
  minimumFloorThreshold: number;
  modelName: string;
  outputDirectory: string;
  [key: string]: any;
}

export interface CareerDocument {
  contact: any;
  professionalSummary?: string;
  roles: any[];
  skillsInventory: any;
  education: any[];
  certifications: any[];
  projects: any[];
  isPlaceholder: boolean;
  hash: string;
}

export interface PositioningAngle {
  id: string;
  label: string;
  description: string;
  leadWith: string[];
  supportingEvidenceKeywords: string[];
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [careerDoc, setCareerDoc] = useState<CareerDocument | null>(null);
  const [angles, setAngles] = useState<PositioningAngle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, careerDocRes, anglesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/settings/career-document"),
        fetch("/api/settings/config/angles"),
      ]);

      if (!settingsRes.ok || !careerDocRes.ok || !anglesRes.ok) {
        throw new Error("Failed to load settings");
      }

      const settingsData = await settingsRes.json();
      const careerDocData = await careerDocRes.json();
      const anglesData = await anglesRes.json();

      setSettings(settingsData);
      setCareerDoc(careerDocData);
      setAngles(anglesData.angles || []);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }

      const updated = await response.json();
      setSettings(updated);
      return updated;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }

  async function addPendingAddition(
    type: "skill" | "experience" | "project" | "achievement",
    content: string
  ) {
    try {
      const response = await fetch("/api/settings/pending-addition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add pending addition");
      }

      return await response.json();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }

  return {
    settings,
    careerDoc,
    angles,
    loading,
    error,
    updateSettings,
    addPendingAddition,
    reload: loadSettings,
  };
}
