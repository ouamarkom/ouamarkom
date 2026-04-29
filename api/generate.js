// api/generate.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { idea } = req.body;

    if (!idea) {
        return res.status(400).json({ message: 'Idea is required' });
    }

    try {
        // تأكد أنك سميت المفتاح في ملف .env بـ GEMINI_API_KEY
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // استخدام موديل Flash لأنه الأسرع والأرخص لمنصة "أوامركم"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = "أنت مهندس أوامر (Prompt Engineer) محترف. مهمتك هي تحويل فكرة المستخدم الخام إلى أمر (Prompt) احترافي، دقيق، وفعال باللغة العربية ليستخدمه في تطبيقات الذكاء الاصطناعي.";
        
        const prompt = `${systemPrompt}\n\nحول هذه الفكرة إلى أمر احترافي: ${idea}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const professionalPrompt = response.text();

        if (!professionalPrompt) {
            throw new Error('لم يتم استلام نص من Gemini');
        }

        return res.status(200).json({ professionalPrompt });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({
            error: 'فشل في توليد الأمر عبر Gemini. تأكد من إعداد المفتاح بشكل صحيح.',
            details: error.message
        });
    }
}