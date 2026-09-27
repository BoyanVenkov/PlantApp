import { create } from "zustand";
import { isAdFree } from "@/services/subscriptions";

interface AppState {
  /** Local file:// URIs of the photo(s) currently being analyzed. */
  pendingImageUris: string[];
  /** Whether this scan must be unlocked with a rewarded video. */
  pendingNeedsAd: boolean;
  setPendingScan: (uris: string[], needsAd: boolean) => void;
  clearPendingScan: () => void;

  /** null until RevenueCat has answered; ads stay hidden while unknown. */
  adFree: boolean | null;
  setAdFree: (adFree: boolean) => void;
  refreshAdFree: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  pendingImageUris: [],
  pendingNeedsAd: false,
  setPendingScan: (uris, needsAd) => set({ pendingImageUris: uris, pendingNeedsAd: needsAd }),
  clearPendingScan: () => set({ pendingImageUris: [], pendingNeedsAd: false }),

  adFree: null,
  setAdFree: (adFree) => set({ adFree }),
  refreshAdFree: async () => set({ adFree: await isAdFree() }),
}));
