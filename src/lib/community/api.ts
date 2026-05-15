import { community } from "./client";
import { getDeviceId, getDeviceName } from "@/lib/device";

export type CommunityEntry = {
  id: string;
  device_id: string;
  author_name: string | null;
  headword: string;
  letter: string | null;
  type: string | null;
  type_full: string | null;
  definition: string;
  meanings: any;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  etymology: string | null;
  category: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  entry_id: string;
  device_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type PublishedDictionary = {
  id: string;
  device_id: string;
  author_name: string;
  title: string;
  description: string | null;
  entries: any;
  entries_count: number;
  created_at: string;
  updated_at: string;
};

export type VoteTarget = "community_entry" | "entry_edit" | "published_dictionary";

// ---------- COMMUNITY ENTRIES ----------

export async function listCommunityEntries(): Promise<CommunityEntry[]> {
  const { data, error } = await community
    .from("community_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CommunityEntry[]) || [];
}

export async function createCommunityEntry(input: {
  headword: string;
  definition: string;
  type?: string;
  type_full?: string;
  letter?: string;
  category?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  etymology?: string;
}) {
  const payload = {
    device_id: getDeviceId(),
    author_name: getDeviceName() || null,
    headword: input.headword.trim(),
    definition: input.definition.trim(),
    type: input.type || null,
    type_full: input.type_full || null,
    letter: input.letter || input.headword.trim().charAt(0).toUpperCase() || null,
    category: input.category || null,
    examples: input.examples || [],
    synonyms: input.synonyms || [],
    antonyms: input.antonyms || [],
    etymology: input.etymology || null,
  };
  const { data, error } = await community
    .from("community_entries")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as CommunityEntry;
}

// ---------- COMMENTS ----------

export async function listComments(entryId: string): Promise<Comment[]> {
  const { data, error } = await community
    .from("comments")
    .select("*")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Comment[]) || [];
}

export async function postComment(entryId: string, body: string) {
  const payload = {
    entry_id: entryId,
    device_id: getDeviceId(),
    author_name: getDeviceName() || null,
    body: body.trim(),
  };
  const { data, error } = await community
    .from("comments")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(id: string) {
  const { error } = await community.from("comments").delete().eq("id", id);
  if (error) throw error;
}

// ---------- VOTES ----------

export async function listVotesFor(targetType: VoteTarget, targetIds: string[]) {
  if (targetIds.length === 0) return [] as { target_id: string; device_id: string }[];
  const { data, error } = await community
    .from("votes")
    .select("target_id, device_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);
  if (error) throw error;
  return (data as { target_id: string; device_id: string }[]) || [];
}

export async function toggleVote(targetType: VoteTarget, targetId: string): Promise<boolean> {
  const device_id = getDeviceId();
  // Probaj da obrišeš postojeći glas
  const { data: existing, error: selErr } = await community
    .from("votes")
    .select("id")
    .eq("device_id", device_id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    const { error } = await community.from("votes").delete().eq("id", existing.id);
    if (error) throw error;
    return false; // glas uklonjen
  }
  const { error } = await community
    .from("votes")
    .insert({ device_id, target_type: targetType, target_id: targetId });
  if (error) throw error;
  return true; // glas dodat
}

// ---------- PUBLISHED DICTIONARIES ----------

export async function listPublishedDictionaries(): Promise<PublishedDictionary[]> {
  const { data, error } = await community
    .from("published_dictionaries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PublishedDictionary[]) || [];
}

export async function publishDictionary(input: {
  title: string;
  description?: string;
  entries: any[];
  author_name: string;
}) {
  const payload = {
    device_id: getDeviceId(),
    author_name: input.author_name.trim(),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    entries: input.entries,
    entries_count: input.entries.length,
  };
  const { data, error } = await community
    .from("published_dictionaries")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as PublishedDictionary;
}

export async function deletePublishedDictionary(id: string) {
  const { error } = await community.from("published_dictionaries").delete().eq("id", id);
  if (error) throw error;
}
