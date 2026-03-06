import { NextResponse } from "next/server";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1/models";
const MODEL_CASCADE = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

async function callGemini(modelName, apiKey, prompt) {
  const res = await fetch(`${GEMINI_BASE}/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err?.error?.message || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY غير موجود" }, { status: 500 });
    }

    const { userMessage, roleData, history } = await req.json().catch(() => ({}));
    if (!userMessage?.trim()) return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });

    const ctx = `أنت مدرب مهني خبير في "${roleData?.label || "مجال عام"}" ورؤية السعودية 2030.
درجة خطر الذكاء الاصطناعي: ${roleData?.riskScore || 0}%.
المهارات الحالية: ${(roleData?.currentSkills || []).join("، ")}.
مهارات المستقبل: ${(roleData?.futureSkills || []).join("، ")}.
أجب دائماً بالعربية. كن مشجعاً وعملياً. استخدم نقاطاً ورموزاً تعبيرية.`;

    const hist = (history || [])
      .map(m => `${m.role === "user" ? "المستخدم" : "المدرب"}: ${m.content}`)
      .join("\n");

    const fullPrompt = `${ctx}\n\n${hist}\nالمستخدم: ${userMessage}\nالمدرب:`;

    let lastError = null;
    for (const model of MODEL_CASCADE) {
      try {
        const text = await callGemini(model, apiKey, fullPrompt);
        return NextResponse.json({ reply: text, _model: model });
      } catch (err) {
        const retryable = err.status === 429 || err.status === 404 || (err.message || "").includes("quota");
        if (retryable) { lastError = err; continue; }
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "تعذر الوصول لجميع النماذج. حاول مرة أخرى لاحقاً." }, { status: 429 });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}