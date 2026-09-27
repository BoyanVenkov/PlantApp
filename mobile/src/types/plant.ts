/**
 * Mirrors server/src/types.ts exactly — this is the contract for the
 * /api/analyze response. If you change one, change the other.
 */
export interface PlantAnalysis {
  isPlant: boolean;
  rejectionReason: string | null;

  identification: {
    commonName: string;
    scientificName: string;
    family: string;
    confidence: number;
    alternativeMatches: Array<{
      commonName: string;
      scientificName: string;
      confidence: number;
    }>;
  };

  care: {
    light: { level: "low" | "medium" | "bright_indirect" | "full_sun"; description: string };
    /** intervalDays is missing on scans made before watering reminders existed. */
    water: { frequencyDescription: string; intervalDays?: number; description: string };
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
    safetyDisclaimer: string;
  };
}

/** A saved scan, i.e. a PlantAnalysis plus the local bookkeeping around it. */
export interface ScanRecord {
  id: string;
  createdAt: string; // ISO timestamp
  imageUris: string[]; // local file:// URIs (persist across app restarts)
  analysis: PlantAnalysis;
}

/** A plant the user is caring for in "My Plants" — the thing reminders are scheduled for. */
export interface GardenPlant {
  id: string;
  /** The scan it was added from; its care guide lives there (may since be deleted). */
  scanId: string | null;
  name: string;
  scientificName: string;
  imageUri: string;
  waterIntervalDays: number;
  lastWateredAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}
