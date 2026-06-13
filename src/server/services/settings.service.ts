import { getDatabase } from "../db/database.js";

export interface Setting {
  key: string;
  value: string;
  dataType?: string;
  description?: string;
}

export interface AppSettings {
  autoProceedThreshold: number;
  minimumFloorThreshold: number;
  modelName: string;
  outputDirectory: string;
  [key: string]: any;
}

const DEFAULT_SETTINGS: Record<string, Setting> = {
  autoProceedThreshold: {
    key: "auto_proceed_threshold",
    value: "75",
    dataType: "integer",
    description: "Auto-apply if fit score exceeds this threshold",
  },
  minimumFloorThreshold: {
    key: "minimum_floor_threshold",
    value: "50",
    dataType: "integer",
    description: "Do not consider jobs below this fit threshold",
  },
  modelName: {
    key: "model_name",
    value: "claude-opus-4-1",
    dataType: "string",
    description: "Claude model to use for analysis",
  },
  outputDirectory: {
    key: "output_directory",
    value: "./output",
    dataType: "string",
    description: "Where to save generated artifacts",
  },
  minFitScoreToApply: {
    key: "min_fit_score_to_apply",
    value: "70",
    dataType: "integer",
    description: "Minimum fit score before recommending application",
  },
  fitScoreBands: {
    key: "fit_score_bands",
    value:
      '[{"min": 0, "max": 30, "label": "Poor"}, {"min": 31, "max": 60, "label": "Fair"}, {"min": 61, "max": 100, "label": "Good"}]',
    dataType: "json",
    description: "Fit score bands for grouping",
  },
  preferredLocations: {
    key: "preferred_locations",
    value: "[]",
    dataType: "json",
    description: "Preferred job locations",
  },
  preferredJobTypes: {
    key: "preferred_job_types",
    value: '["full-time"]',
    dataType: "json",
    description: "Preferred employment types",
  },
  requiredSkills: {
    key: "required_skills",
    value: "[]",
    dataType: "json",
    description: "Must-have skills",
  },
  niceToHaveSkills: {
    key: "nice_to_have_skills",
    value: "[]",
    dataType: "json",
    description: "Nice-to-have skills",
  },
};

class SettingsService {
  getSetting(key: string): Setting | null {
    const db = getDatabase().getConnection();
    const row = db
      .prepare("SELECT * FROM settings WHERE key = ?")
      .get(key) as any;
    return row || null;
  }

  getAllSettings(): AppSettings {
    const db = getDatabase().getConnection();
    const rows = db
      .prepare("SELECT * FROM settings")
      .all() as any[];

    const settings: AppSettings = {
      autoProceedThreshold: 75,
      minimumFloorThreshold: 50,
      modelName: "claude-opus-4-1",
      outputDirectory: "./output",
    };

    for (const row of rows) {
      const camelKey = this.snakeToCamel(row.key);
      settings[camelKey] = this.parseValue(row.value, row.data_type);
    }

    return settings;
  }

  setSetting(key: string, value: string, dataType?: string): Setting {
    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    const existing = this.getSetting(key);

    if (existing) {
      db.prepare(
        "UPDATE settings SET value = ?, data_type = ?, last_updated = ? WHERE key = ?"
      ).run(value, dataType || existing.dataType, now, key);
    } else {
      // Use key as ID to ensure uniqueness
      db.prepare(
        "INSERT INTO settings (id, key, value, data_type, last_updated) VALUES (?, ?, ?, ?, ?)"
      ).run(
        key,
        key,
        value,
        dataType || "string",
        now
      );
    }

    return {
      key,
      value,
      dataType: dataType || (existing?.dataType || "string"),
    };
  }

  updateThreshold(key: string, value: number): Setting {
    if (value < 0 || value > 100) {
      throw new Error("Threshold must be between 0 and 100");
    }
    return this.setSetting(key, String(value), "integer");
  }

  updateModelName(modelName: string): Setting {
    const validModels = [
      "claude-opus-4-1",
      "claude-opus-4",
      "claude-sonnet-4-20250514",
      "claude-haiku-3-5",
    ];
    if (!validModels.includes(modelName)) {
      throw new Error(`Invalid model name. Valid options: ${validModels.join(", ")}`);
    }
    return this.setSetting("model_name", modelName, "string");
  }

  updateOutputDirectory(directory: string): Setting {
    if (!directory.trim()) {
      throw new Error("Output directory cannot be empty");
    }
    return this.setSetting("output_directory", directory, "string");
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  private parseValue(value: string, dataType?: string): any {
    if (!dataType) return value;

    try {
      if (dataType === "integer") return parseInt(value, 10);
      if (dataType === "json") return JSON.parse(value);
      if (dataType === "boolean") return value === "true";
    } catch {
      return value;
    }

    return value;
  }

  ensureDefaultSettings(): void {
    for (const setting of Object.values(DEFAULT_SETTINGS)) {
      const existing = this.getSetting(setting.key);
      if (!existing) {
        this.setSetting(setting.key, setting.value, setting.dataType);
      }
    }
  }
}

export function createSettingsService(): SettingsService {
  return new SettingsService();
}
