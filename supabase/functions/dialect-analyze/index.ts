import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-3-flash-preview",
]);

const SYSTEM = `Ти си стручњак за дијалектологију српског језика, посебно за заплањско-јужноморавски говор. Анализирај дати текст или транскрипт говора. Идентификуј:
1. Дијалекатске црте (фонетика, морфологија, синтакса)
2. Карактеристичне заплањске лексеме (са објашњењима)
3. Стандардни српски еквивалент
4. Степен очуваности дијалекта (1–10)
5. Препоруке/коментар

Одговори у JSON формату:
{
  "dialect_features": [{"feature":"","example":"","explanation":""}],
  "lexemes": [{"word":"","standard":"","note":""}],
  "standard_serbian": "",
  "preservation_score": 0,
  "comment": ""
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const body = await req.json();
    const { text, audio_path, audio_mime, model: modelIn } = body as {
      text?: string;
      audio_path?: string;
      audio_mime?: string;
      model?: string;
    };
    const model = modelIn && ALLOWED_MODELS.has(modelIn) ? modelIn : "google/gemini-2.5-flash";
    if (!text && !audio_path) {
      return new Response(JSON.stringify({ error: "text or audio_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [];
    if (text) userContent.push({ type: "text", text });

    if (audio_path) {
      // Use service role to download from private bucket
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      // Verify ownership: path must start with user_id/
      if (!audio_path.startsWith(userData.user.id + "/")) {
        return new Response(JSON.stringify({ error: "Forbidden audio path" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: file, error: dlErr } = await admin.storage
        .from("analysis-audio")
        .download(audio_path);
      if (dlErr || !file) {
        return new Response(JSON.stringify({ error: "Audio download failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      // base64 encode
      let b64 = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        b64 += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      b64 = btoa(b64);
      userContent.push({
        type: "input_audio",
        input_audio: { data: b64, format: (audio_mime || "audio/mpeg").split("/")[1] || "mp3" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent.length === 1 && userContent[0].type === "text" ? userContent[0].text : userContent },
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
      return new Response(JSON.stringify({ error: "Кредити су потрошени" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let result: any = {};
    try { result = JSON.parse(content); } catch { result = { raw: content }; }

    // Save history
    await supa.from("analysis_history").insert({
      user_id: userData.user.id,
      kind: audio_path ? "audio" : "text",
      input_text: text || null,
      audio_path: audio_path || null,
      model,
      result,
    });

    return new Response(JSON.stringify({ result, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
