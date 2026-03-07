import { NextResponse } from "next/server";

// ─── app/api/chat/route.js ────────────────────────────────────────────────────
// يستخدم Groq API للمدرب الذكي — مجاني وسريع جداً

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

async function callGroq(model, apiKey, messages) {
  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err?.error?.message || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

export async function POST(req) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY غير موجود في متغيرات البيئة" },
        { status: 500 }
      );
    }

    const { userMessage, roleData, history } = await req.json().catch(() => ({}));
    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
    }

    // ── Build messages array (OpenAI format that Groq uses) ───────────────────
    const systemPrompt = `أنت مدرب مهني خبير في "${roleData?.label || "مجال عام"}" ورؤية السعودية 2030.
درجة خطر الذكاء الاصطناعي على هذه المهنة: ${roleData?.riskScore || 0}%.
المهارات الحالية: ${(roleData?.currentSkills || []).join("، ")}.
مهارات المستقبل المطلوبة: ${(roleData?.futureSkills || []).join("، ")}.
أجب دائماً بالعربية. كن مشجعاً وعملياً ومختصراً. استخدم نقاطاً ورموزاً تعبيرية.`;

    const messages = [
      { role: "system", content: systemPrompt },
      // Add conversation history
      ...(history || []).slice(-6).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    let lastError = null;
    for (const model of GROQ_MODELS) {
      try {
        console.log(`[chat] Trying Groq/${model}...`);
        const reply = await callGroq(model, apiKey, messages);
        console.log(`[chat] ✅ Success: ${model}`);
        return NextResponse.json({ reply, _model: model });
      } catch (err) {
        const isRetryable = err.status === 429 || err.status === 503 ||
          (err.message || "").includes("rate") || (err.message || "").includes("limit");
        if (isRetryable) { lastError = err; continue; }
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "تم تجاوز حصة Groq مؤقتاً. حاول بعد دقيقة." },
      { status: 429 }
    );

  } catch (err) {
    console.error("[chat] Unexpected:", err?.message);
    return NextResponse.json({ error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}