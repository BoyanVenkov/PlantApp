import { create } from "zustand";

interface AppState {
  /** Local file:// URIs of the photo(s) currently being analyzed. */
  pendingImageUris: string[];
  setPendingImageUris: (uris: string[]) => void;
  clearPendingImageUris: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingImageUris: [],
  setPendingImageUris: (uris) => set({ pendingImageUris: uris }),
  clearPendingImageUris: () => set({ pendingImageUris: [] }),
}));
