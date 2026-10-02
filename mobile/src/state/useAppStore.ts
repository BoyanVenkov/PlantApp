import { create } from "zustand";

interface AppState {
  /** Local file:// URIs of the photo(s) currently being analyzed. */
  pendingImageUris: string[];
  /** Whether this scan must be unlocked with a rewarded video. */
  pendingNeedsAd: boolean;
  setPendingScan: (uris: string[], needsAd: boolean) => void;
  clearPendingScan: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingImageUris: [],
  pendingNeedsAd: false,
  setPendingScan: (uris, needsAd) => set({ pendingImageUris: uris, pendingNeedsAd: needsAd }),
  clearPendingScan: () => set({ pendingImageUris: [], pendingNeedsAd: false }),
}));
