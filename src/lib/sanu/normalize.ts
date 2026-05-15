import type { SanuEntry, SanuMeaning } from "./types";

const ALPHABET = [
  "А","Б","В","Г","Д","Ђ","Е","Ж","З","И","Ј","К","Л","Љ","М","Н","Њ",
  "О","П","Р","С","Т","Ћ","У","Ц","Ч","Џ","Ш",
];

const POS_FULL: Record<string, string> = {
  "им.": "именица",
  "ж.": "именица женског рода",
  "м.": "именица мушког рода",
  "с.": "именица средњег рода",
  "гл.": "глагол",
  "несврш.": "несвршени глагол",
  "сврш.": "свршени глагол",
  "пр.": "придев",
  "прид.": "придев",
  "прил.": "прилог",
  "узв.": "узвик",
  "везн.": "везник",
  "предл.": "предлог",
  "зам.": "заменица",
  "бр.": "број",
  "част.": "честица",
};

/** Skida akcente i ostavlja čistu ćiriličnu osnovu za sort/pretragu. */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function slugify(headword: string): string {
  const base = stripAccents(headword)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || "x";
}

function detectLetter(headword: string): string {
  const first = stripAccents(headword).trim().charAt(0).toUpperCase();
  return ALPHABET.includes(first) ? first : "А";
}

/** Razbija definiciju oblika "1) … — пример. 2) …" u nizove značenja. */
function splitMeanings(raw: string): SanuMeaning[] {
  if (!raw) return [{ number: 1, definition: "" }];

  // Numerisana značenja
  const parts = raw.split(/\s*(?=\d+\))/);
  const out: SanuMeaning[] = [];
  parts.forEach((part, idx) => {
    const m = part.match(/^(\d+)\)\s*(.*)$/s);
    const num = m ? parseInt(m[1], 10) : idx + 1;
    const body = (m ? m[2] : part).trim();
    if (!body) return;

    // Razdvoji definiciju od primera (potvrde počinju sa em-dash)
    const exSplit = body.split(/\s*—\s*/);
    const definition = exSplit.shift()?.trim() ?? "";
    const examples = exSplit
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    out.push({
      number: num,
      definition,
      examples: examples.length ? examples : undefined,
    });
  });

  return out.length ? out : [{ number: 1, definition: raw.trim() }];
}

/** Razdvaja akcentovanu odrednicu od dodatnih oblika ("аба́в, -а, -о"). */
function splitHeadword(raw: string): { accented: string; headword: string; grammar?: string } {
  const [head, ...rest] = raw.split(",").map((s) => s.trim());
  return {
    accented: head,
    headword: stripAccents(head),
    grammar: rest.length ? rest.join(", ") : undefined,
  };
}

interface RawEntry {
  headword: string;
  pos?: string;
  definition?: string;
  letter?: string;
  category?: string;
  etymology?: string;
}

/** Pretvara jedan ulazni red iz uvoznog JSON-a u SANU entry. */
export function toSanuEntry(raw: RawEntry, now = Date.now()): SanuEntry {
  const { accented, headword, grammar } = splitHeadword(raw.headword);
  const letter = raw.letter || detectLetter(headword);
  const pos = raw.pos?.trim();
  const meanings = splitMeanings(raw.definition ?? "");
  return {
    id: `sanu-${letter}-${slugify(accented)}`,
    headword,
    accented,
    pos,
    posFull: pos ? POS_FULL[pos] : undefined,
    grammar,
    etymology: raw.etymology,
    category: raw.category,
    letter,
    meanings,
    source: "SANU",
    sanuVerified: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Učitava ceo izvozni JSON (format `zaplanjski-recnik`) u SANU formu. */
export function normalizeImportedCorpus(json: any): SanuEntry[] {
  const out: SanuEntry[] = [];
  const now = Date.now();
  const byLetter = json?.recnik?.byLetter ?? {};
  for (const letter of Object.keys(byLetter)) {
    const list: RawEntry[] = byLetter[letter] || [];
    for (const r of list) {
      try {
        out.push(toSanuEntry({ ...r, letter: r.letter || letter }, now));
      } catch {
        // skip malformed
      }
    }
  }
  // Dedup po ID-u (ako se isti naslov pojavi dvaput, prvi pobeđuje)
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

export { ALPHABET };
