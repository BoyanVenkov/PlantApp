/**
 * The full shape of one plant analysis. Kept in sync by hand with
 * mobile/src/types/plant.ts — see the README "Keeping types in sync" note.
 */
export interface PlantAnalysis {
  isPlant: boolean;
  /** Set (with a plain-language reason) when isPlant is false or the photo is unusable. */
  rejectionReason: string | null;

  identification: {
    commonName: string;
    scientificName: string;
    family: string;
    /** 0-1. Low confidence should make the UI hedge, especially for edibility. */
    confidence: number;
    alternativeMatches: Array<{
      commonName: string;
      scientificName: string;
      confidence: number;
    }>;
  };

  care: {
    light: { level: "low" | "medium" | "bright_indirect" | "full_sun"; description: string };
    /** intervalDays: typical days between waterings — drives reminders in the app. */
    water: { frequencyDescription: string; intervalDays: number; description: string };
    temperature: { minCelsius: number; maxCelsius: number; description: string };
    humidity: { level: "low" | "medium" | "high"; description: string };
    soil: string;
    fertilizing: string;
    pruning: string;
    propagation: string;
    petToxicity: string;
  };

  health: {
    status: "healthy" | "mild_stress" | "sick" | "critical" | "unknown";
    summary: string;
    issuesDetected: string[];
    recommendations: string[];
  };

  edibility: {
    isEdible: boolean;
    edibleParts: string[];
    benefits: string[];
    risksAndWarnings: string[];
    preparationNotes: string;
    /** Always populated — this is a safety feature, not boilerplate. */
    safetyDisclaimer: string;
  };
}

export interface AnalyzeRequestBody {
  images: string[]; // base64-encoded JPEG/PNG, no data: prefix
}
