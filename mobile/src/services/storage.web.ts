import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GardenPlant, PlantAnalysis, ScanRecord } from "@/types/plant";
import { persistImages } from "./images";

/**
 * Web preview: expo-sqlite needs extra wasm setup in the browser, so scans and
 * plants are kept as two JSON lists in localStorage instead. Same API as
 * storage.ts.
 */

const SCANS_KEY = "plantapp.scans";
const PLANTS_KEY = "plantapp.plants";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

async function writeList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

// ── Scans ──────────────────────────────────────────────────────────────────

export async function saveScan(imageUris: string[], analysis: PlantAnalysis): Promise<ScanRecord> {
  const id = newId();
  const record: ScanRecord = {
    id,
    createdAt: new Date().toISOString(),
    imageUris: persistImages(imageUris, id),
    analysis,
  };
  await writeList(SCANS_KEY, [...(await readList<ScanRecord>(SCANS_KEY)), record]);
  return record;
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  return (await readList<ScanRecord>(SCANS_KEY)).find((s) => s.id === id) ?? null;
}

export async function listScans(): Promise<ScanRecord[]> {
  return (await readList<ScanRecord>(SCANS_KEY)).sort(newestFirst);
}

export async function deleteScan(id: string): Promise<void> {
  await writeList(SCANS_KEY, (await readList<ScanRecord>(SCANS_KEY)).filter((s) => s.id !== id));
}

// ── My Plants ──────────────────────────────────────────────────────────────

export async function addPlant(input: Omit<GardenPlant, "id" | "createdAt">): Promise<GardenPlant> {
  const plant: GardenPlant = { ...input, id: newId(), createdAt: new Date().toISOString() };
  await writeList(PLANTS_KEY, [...(await readList<GardenPlant>(PLANTS_KEY)), plant]);
  return plant;
}

export async function getPlant(id: string): Promise<GardenPlant | null> {
  return (await readList<GardenPlant>(PLANTS_KEY)).find((p) => p.id === id) ?? null;
}

export async function getPlantByScanId(scanId: string): Promise<GardenPlant | null> {
  return (await readList<GardenPlant>(PLANTS_KEY)).find((p) => p.scanId === scanId) ?? null;
}

export async function listPlants(): Promise<GardenPlant[]> {
  return (await readList<GardenPlant>(PLANTS_KEY)).sort(newestFirst);
}

export async function updatePlant(
  id: string,
  changes: Partial<Pick<GardenPlant, "name" | "waterIntervalDays" | "lastWateredAt">>
): Promise<GardenPlant | null> {
  const plants = await readList<GardenPlant>(PLANTS_KEY);
  const index = plants.findIndex((p) => p.id === id);
  if (index === -1) return null;
  plants[index] = { ...plants[index], ...changes };
  await writeList(PLANTS_KEY, plants);
  return plants[index];
}

export async function deletePlant(id: string): Promise<void> {
  await writeList(PLANTS_KEY, (await readList<GardenPlant>(PLANTS_KEY)).filter((p) => p.id !== id));
}
