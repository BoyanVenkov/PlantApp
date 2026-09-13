import * as SQLite from "expo-sqlite";
import type { PlantAnalysis, ScanRecord } from "@/types/plant";

const db = SQLite.openDatabaseSync("plantapp.db");

db.execSync(`
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    image_uris TEXT NOT NULL,
    analysis TEXT NOT NULL
  );
`);

function rowToScanRecord(row: { id: string; created_at: string; image_uris: string; analysis: string }): ScanRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    imageUris: JSON.parse(row.image_uris),
    analysis: JSON.parse(row.analysis) as PlantAnalysis,
  };
}

export async function saveScan(imageUris: string[], analysis: PlantAnalysis): Promise<ScanRecord> {
  const record: ScanRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    imageUris,
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
  const row = await db.getFirstAsync<{ id: string; created_at: string; image_uris: string; analysis: string }>(
    "SELECT * FROM scans WHERE id = ?",
    id
  );
  return row ? rowToScanRecord(row) : null;
}

export async function listScans(): Promise<ScanRecord[]> {
  const rows = await db.getAllAsync<{ id: string; created_at: string; image_uris: string; analysis: string }>(
    "SELECT * FROM scans ORDER BY created_at DESC"
  );
  return rows.map(rowToScanRecord);
}

export async function deleteScan(id: string): Promise<void> {
  await db.runAsync("DELETE FROM scans WHERE id = ?", id);
}
