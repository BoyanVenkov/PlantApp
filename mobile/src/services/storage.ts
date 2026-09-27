import * as SQLite from "expo-sqlite";
import type { GardenPlant, PlantAnalysis, ScanRecord } from "@/types/plant";
import { persistImages } from "./images";

const db = SQLite.openDatabaseSync("plantapp.db");

db.execSync(`
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    image_uris TEXT NOT NULL,
    analysis TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY NOT NULL,
    scan_id TEXT,
    name TEXT NOT NULL,
    scientific_name TEXT NOT NULL,
    image_uri TEXT NOT NULL,
    water_interval_days INTEGER NOT NULL,
    last_watered_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Scans ──────────────────────────────────────────────────────────────────

interface ScanRow {
  id: string;
  created_at: string;
  image_uris: string;
  analysis: string;
}

function rowToScanRecord(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    imageUris: JSON.parse(row.image_uris),
    analysis: JSON.parse(row.analysis) as PlantAnalysis,
  };
}

export async function saveScan(imageUris: string[], analysis: PlantAnalysis): Promise<ScanRecord> {
  const id = newId();
  const record: ScanRecord = {
    id,
    createdAt: new Date().toISOString(),
    imageUris: persistImages(imageUris, id),
    analysis,
  };

  await db.runAsync(
    "INSERT INTO scans (id, created_at, image_uris, analysis) VALUES (?, ?, ?, ?)",
    record.id,
    record.createdAt,
    JSON.stringify(record.imageUris),
    JSON.stringify(record.analysis)
  );

  return record;
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const row = await db.getFirstAsync<ScanRow>("SELECT * FROM scans WHERE id = ?", id);
  return row ? rowToScanRecord(row) : null;
}

export async function listScans(): Promise<ScanRecord[]> {
  const rows = await db.getAllAsync<ScanRow>("SELECT * FROM scans ORDER BY created_at DESC");
  return rows.map(rowToScanRecord);
}

/** Image files are left in place: a plant in My Plants may still show them. */
export async function deleteScan(id: string): Promise<void> {
  await db.runAsync("DELETE FROM scans WHERE id = ?", id);
}

// ── My Plants ──────────────────────────────────────────────────────────────

interface PlantRow {
  id: string;
  scan_id: string | null;
  name: string;
  scientific_name: string;
  image_uri: string;
  water_interval_days: number;
  last_watered_at: string;
  created_at: string;
}

function rowToPlant(row: PlantRow): GardenPlant {
  return {
    id: row.id,
    scanId: row.scan_id,
    name: row.name,
    scientificName: row.scientific_name,
    imageUri: row.image_uri,
    waterIntervalDays: row.water_interval_days,
    lastWateredAt: row.last_watered_at,
    createdAt: row.created_at,
  };
}

export async function addPlant(input: Omit<GardenPlant, "id" | "createdAt">): Promise<GardenPlant> {
  const plant: GardenPlant = { ...input, id: newId(), createdAt: new Date().toISOString() };
  await db.runAsync(
    `INSERT INTO plants (id, scan_id, name, scientific_name, image_uri, water_interval_days, last_watered_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    plant.id,
    plant.scanId,
    plant.name,
    plant.scientificName,
    plant.imageUri,
    plant.waterIntervalDays,
    plant.lastWateredAt,
    plant.createdAt
  );
  return plant;
}

export async function getPlant(id: string): Promise<GardenPlant | null> {
  const row = await db.getFirstAsync<PlantRow>("SELECT * FROM plants WHERE id = ?", id);
  return row ? rowToPlant(row) : null;
}

export async function getPlantByScanId(scanId: string): Promise<GardenPlant | null> {
  const row = await db.getFirstAsync<PlantRow>("SELECT * FROM plants WHERE scan_id = ?", scanId);
  return row ? rowToPlant(row) : null;
}

export async function listPlants(): Promise<GardenPlant[]> {
  const rows = await db.getAllAsync<PlantRow>("SELECT * FROM plants ORDER BY created_at DESC");
  return rows.map(rowToPlant);
}

export async function updatePlant(
  id: string,
  changes: Partial<Pick<GardenPlant, "name" | "waterIntervalDays" | "lastWateredAt">>
): Promise<GardenPlant | null> {
  const current = await getPlant(id);
  if (!current) return null;
  const next = { ...current, ...changes };
  await db.runAsync(
    "UPDATE plants SET name = ?, water_interval_days = ?, last_watered_at = ? WHERE id = ?",
    next.name,
    next.waterIntervalDays,
    next.lastWateredAt,
    id
  );
  return next;
}

export async function deletePlant(id: string): Promise<void> {
  await db.runAsync("DELETE FROM plants WHERE id = ?", id);
}
