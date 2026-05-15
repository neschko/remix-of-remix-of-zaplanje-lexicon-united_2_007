// Poseban Supabase klijent koji u svaki zahtev ubacuje x-device-id zaglavlje.
// Koristimo ga za sve community pozive (RLS politike koriste to zaglavlje
// za UPDATE/DELETE provere vlasništva).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getDeviceId } from "@/lib/device";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const community = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      "x-device-id": typeof window !== "undefined" ? getDeviceId() : "",
    },
  },
});
