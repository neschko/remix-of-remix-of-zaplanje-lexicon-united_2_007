import Dexie, { type Table } from "dexie";
import type { SanuEntry } from "./sanu/types";

export interface AppMeta {
  key: string;
  value: any;
}

class ZaplanjeDB extends Dexie {
  entries!: Table<SanuEntry, string>;
  meta!: Table<AppMeta, string>;

  constructor() {
    super("zaplanje-recnik");
    this.version(1).stores({
      entries: "id, headword, letter, source, category, sanuVerified",
      meta: "key",
    });
  }
}

export const db = new ZaplanjeDB();

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: any) {
  await db.meta.put({ key, value });
}
