import type { AppDatabase } from "../types";

const STORAGE_KEY = "marketing_mvp_db_v1";

const defaultDatabase: AppDatabase = {
  campaigns: [],
  assets: [],
  videos: [],
};

export const loadDatabase = (): AppDatabase => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultDatabase };
    }
    const parsed = JSON.parse(raw) as AppDatabase;
    return {
      campaigns: parsed.campaigns ?? [],
      assets: parsed.assets ?? [],
      videos: parsed.videos ?? [],
    };
  } catch {
    return { ...defaultDatabase };
  }
};

export const saveDatabase = (db: AppDatabase): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const updateDatabase = (
  updater: (db: AppDatabase) => AppDatabase
): AppDatabase => {
  const db = loadDatabase();
  const next = updater(db);
  saveDatabase(next);
  return next;
};