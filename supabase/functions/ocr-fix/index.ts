import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface EntryInput {
  id: string;
  headword: string;
  accented?: string;
  pos?: string;
  definition: string;
}

const SYSTEM = `Ти си стручни лектор за Речник САНУ заплањског говора. На основу добијене ОCR одреднице, провери и исправи евентуалне OCR грешке (погрешна слова, изостављени акценти, спојене речи, погрешна интерпункција).
Не мењај смисао, само очисти текст. Врати JSON објекат са пољима:
- corrected_headword (стринг)
- corrected_accented (стринг или null)
- corrected_definition (стринг)
- confidence (број између 0 и 1, колико си сигуран)
- changes_summary (кратак опис промена на српском, или "без промена")`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supa.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entries } = (await req.json()) as { entries: EntryInput[] };
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 20) {
      return new Response(JSON.stringify({ error: "1–20 entries required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const e of entries) {
      const userMsg = `Одредница: ${e.accented || e.headword}\nТип: ${e.pos || ""}\nДефиниција: ${e.definition}`;
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Превише захтева, покушајте касније" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Кредити су потрошени, додајте их у подешавањима" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!resp.ok) {
        results.push({ id: e.id, error: `AI error ${resp.status}` });
        continue;
      }
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        results.push({ id: e.id, error: "Не могу да парсирам одговор" });
        continue;
      }
      results.push({
        id: e.id,
        original: e,
        corrected: {
          headword: parsed.corrected_headword ?? e.headword,
          accented: parsed.corrected_accented ?? e.accented,
          definition: parsed.corrected_definition ?? e.definition,
        },
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        summary: parsed.changes_summary ?? "",
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
