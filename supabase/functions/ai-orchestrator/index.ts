// @ts-ignore
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  // 1. التعامل مع طلبات التحقق من المتصفح (Preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const idea = body.intent || body.idea || body.prompt;

    if (!idea) {
      return new Response(JSON.stringify({ error: "يرجى كتابة فكرة" }), { 
        status: 400, 
        headers: CORS_HEADERS 
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY in Secrets"); // ستظهر في الـ Logs بوضوح
      return new Response(JSON.stringify({ error: "إعدادات السيرفر غير مكتملة (API_KEY)" }), { 
        status: 500, 
        headers: CORS_HEADERS 
      });
    }

    // 2. استدعاء Gemini مع إضافة Error Handling للاستجابة نفسها
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أنت مهندس أوامر محترف لـ "أوامركم". حول هذه الفكرة لأمر مفصل وبأسلوب احترافي باللغة العربية: ${idea}` }] }]
      })
    });

    const data = await response.json();

    // التحقق من أن جوجل أرسلت بيانات صحيحة
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini Error Response:", data);
      return new Response(JSON.stringify({ error: "فشل Gemini في توليد المحتوى، تأكد من سلامة الطلب" }), { 
        status: 500, 
        headers: CORS_HEADERS 
      });
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ 
      professional_prompt: resultText,
      professionalPrompt: resultText 
    }), { 
      status: 200, 
      headers: CORS_HEADERS 
    });

  } catch (error: any) {
    // 3. أهم تعديل: إضافة الـ Headers حتى في حالة الخطأ الكارثي
    console.error("Main Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: CORS_HEADERS // هذا السطر سيمنع الـ EarlyDrop
    });
  }
});