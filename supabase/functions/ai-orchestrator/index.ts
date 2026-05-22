// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const reqClone = req.clone();
    const body = await reqClone.json().catch(() => ({}));
    const intent = body.intent;

    if (!intent) throw new Error("لم يتم استلام الفكرة بشكل صحيح");

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("مفتاح Gemini مفقود في إعدادات سوبابيس");

    // تغيير اسم الموديل إلى النسخة المستقرة gemini-1.5-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `أنت خبير في هندسة الأوامر (Prompt Engineering). 
              المهمة: تحويل الفكرة التالية إلى "أمر ذهبي" احترافي، دقيق، وفعال جداً باللغة العربية.
              الفكرة: ${intent}
              يجب أن يكون الرد هو "الأمر" فقط بدون أي مقدمات أو شرح.` 
            }] 
          }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) throw new Error("لم ينجح الذكاء الاصطناعي في توليد نص");

    return new Response(JSON.stringify({ professional_prompt: result }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Detailed Error:", error.message);
    return new Response(JSON.stringify({ error: "فشل في معالجة الأمر", details: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});