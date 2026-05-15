import { db, getMeta, setMeta } from "./db";
import { normalizeImportedCorpus } from "./sanu/normalize";

const SEED_KEY = "sanu-seed-version";
const SEED_VERSION = 1;

export async function ensureSeeded(onProgress?: (msg: string) => void): Promise<number> {
  const current = await getMeta<number>(SEED_KEY);
  const count = await db.entries.count();
  if (current === SEED_VERSION && count > 0) return count;

  onProgress?.("Учитавам SANU корпус…");
  const res = await fetch("/data/sanu-corpus.json");
  if (!res.ok) throw new Error("Не могу да учитам корпус");
  const json = await res.json();

  onProgress?.("Нормализујем у SANU формат…");
  const entries = normalizeImportedCorpus(json);

  onProgress?.(`Уписујем ${entries.length} одредница у локалну базу…`);
  await db.transaction("rw", db.entries, db.meta, async () => {
    await db.entries.clear();
    // Bulk u manjim grupama da izbegnemo IDB limit
    const CHUNK = 1000;
    for (let i = 0; i < entries.length; i += CHUNK) {
      await db.entries.bulkPut(entries.slice(i, i + CHUNK));
    }
    await setMeta(SEED_KEY, SEED_VERSION);
  });

  return entries.length;
}
