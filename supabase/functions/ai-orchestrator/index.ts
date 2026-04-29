// @ts-ignore
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    // نحن هنا نقبل أي مسمى للفكرة لضمان العمل
    const idea = body.intent || body.idea || body.prompt;

    if (!idea) {
      return new Response(JSON.stringify({ error: "يرجى كتابة فكرة" }), { status: 400, headers: CORS_HEADERS });
    }

    // جلب المفتاح مباشرة من بيئة Deno
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY_MISSING" }), { status: 500, headers: CORS_HEADERS });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أنت مهندس أوامر محترف لـ "أوامركم". حول هذه الفكرة لأمر مفصل وبأسلوب احترافي باللغة العربية: ${idea}` }] }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return new Response(JSON.stringify({ error: "فشل Gemini في التوليد" }), { status: 500, headers: CORS_HEADERS });
    }

    // نرسل النتيجة بمسميين لضمان أن يفهمها كود الجافاسكريبت مهما كان الاسم الذي يبحث عنه
    return new Response(JSON.stringify({ 
      professional_prompt: resultText,
      professionalPrompt: resultText 
    }), { status: 200, headers: CORS_HEADERS });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS });
  }
});