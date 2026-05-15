// SANU kanonski format za Заплањски речник
// Inspirisan stilom Rečnika SANU: odrednica, akcentovani oblik, gramatičke
// kvalifikative, kvalifikatori upotrebe, više numerisanih značenja sa
// definicijama i potvrdama (primerima).

export type SanuSource = "SANU" | "user" | "community";

export interface SanuExample {
  /** Tekst potvrde / primera upotrebe */
  text: string;
  /** Izvor potvrde (lokalitet, kazivač, knjiga) — opciono */
  source?: string;
}

export interface SanuMeaning {
  /** Numeracija značenja (1, 2, 3 …) */
  number: number;
  /** Glavna definicija */
  definition: string;
  /** Kvalifikatori (fig., zast., pej., …) */
  qualifiers?: string[];
  /** Sinonimi unutar dijalekta / standardnog jezika */
  synonyms?: string[];
  /** Antonimi */
  antonyms?: string[];
  /** Potvrde — primeri upotrebe */
  examples?: SanuExample[];
}

export interface SanuEntry {
  /** Stabilan ID (slug) */
  id: string;
  /** Odrednica bez akcenata (za pretragu i sortiranje) */
  headword: string;
  /** Akcentovani oblik odrednice (kako stoji u izvorniku) */
  accented?: string;
  /** Skraćena gramatička oznaka (im., gl., pr., …) */
  pos?: string;
  /** Pun oblik gramatičke oznake (imenica, glagol, …) */
  posFull?: string;
  /** Rod / vrsta / dodatne morfološke oznake */
  grammar?: string;
  /** Etimologija */
  etymology?: string;
  /** Tematska kategorija (Тело и здравље, Природа …) */
  category?: string;
  /** Slovo azbuke pod kojim se vodi */
  letter: string;
  /** Lista numerisanih značenja */
  meanings: SanuMeaning[];
  /** Izvor unosa — SANU se favorizuje u prikazu */
  source: SanuSource;
  /** Da li je SANU verifikovan (ima prioritet pri sortu i prikazu) */
  sanuVerified: boolean;
  /** Vremenske oznake */
  createdAt: number;
  updatedAt: number;
}

export interface SanuCorpus {
  format: "sanu-zaplanjski";
  version: 1;
  alphabet: string[];
  entries: SanuEntry[];
}
