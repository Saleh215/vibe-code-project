import { NextResponse } from "next/server";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1/models";
const MODEL_CASCADE = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

// ─── FIXED: No angle-bracket placeholders that confuse Gemini ────────────────
// Using a concrete example instead so the model always returns valid JSON
function buildPrompt(resumeText) {
  return `You are a Saudi career expert. Analyze the resume and return ONLY a JSON object. No explanation, no markdown, no backticks. Start your response with { and end with }.

RESUME:
${resumeText}

Return this exact JSON structure (fill in real values based on the resume):
{"label":"مطور برمجيات","riskScore":25,"currentSkills":["JavaScript","React","Node.js","SQL","Git"],"futureSkills":["الذكاء الاصطناعي التوليدي","MLOps","هندسة البيانات","أمن السحابة","تطوير وكلاء الذكاء الاصطناعي"],"courses":[{"title":"أساسيات الذكاء الاصطناعي والتعلم الآلي","provider":"Coursera","duration":"4 أسابيع","level":"مبتدئ"},{"title":"تطبيقات نماذج اللغة الكبيرة","provider":"DeepLearning.AI","duration":"6 أسابيع","level":"متوسط"},{"title":"بناء وكلاء الذكاء الاصطناعي","provider":"Udacity","duration":"8 أسابيع","level":"متقدم"}]}

RULES for your response:
1. label: Arabic job title from the resume (2-4 words)
2. riskScore: number between 0 and 100 (no quotes, just the number)
   - 70 to 90 for routine jobs (data entry, basic accounting, clerical)
   - 40 to 69 for mixed jobs (HR, marketing, law, logistics)
   - 10 to 39 for technical or creative jobs (software, AI, healthcare, teaching)
3. currentSkills: array of 5 strings extracted from the resume
4. futureSkills: array of 5 Arabic strings for Vision 2030 future skills
5. courses: array of exactly 3 course objects with title, provider, duration, level all in Arabic
6. ALL string values must be in Arabic
7. Return ONLY the JSON object. Start with { and end with }. Nothing else.`;
}

// ─── Bullet-proof response parser ────────────────────────────────────────────
function parseGeminiResponse(raw) {
  if (!raw || typeof raw !== "string") throw new Error("استجابة فارغة من Gemini");

  // Strip markdown fences
  let text = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  // If model prefixed with explanation text, find the first {
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart === -1 || braceEnd === -1) {
    throw new Error(`لم يُرجع Gemini JSON صالح. الاستجابة: ${text.slice(0, 120)}`);
  }
  text = text.slice(braceStart, braceEnd + 1);

  // Fix common JSON issues from LLMs
  text = text
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1")
    // Fix unquoted numeric values that might have dashes (the original bug)
    .replace(/"riskScore"\s*:\s*-?\s*(\d+)/g, '"riskScore": $1');

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}. Text: ${text.slice(0, 200)}`);
  }
}

async function callGemini(modelName, apiKey, prompt) {
  const url = `${GEMINI_BASE}/${modelName}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,       // Lower = more predictable JSON output
        maxOutputTokens: 2048,
        topP: 0.8,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const e = new Error(errBody?.error?.message || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();

  // Check for safety blocks
  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error("تم حجب الاستجابة بسبب فلاتر الأمان");
  }

  const raw = candidate?.content?.parts?.[0]?.text || "";
  return parseGeminiResponse(raw);
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "⚙️ GEMINI_API_KEY غير موجود. أضفه في Vercel → Settings → Environment Variables أو في .env.local" },
        { status: 500 }
      );
    }

    // ── Parse incoming request: JSON text or FormData (PDF/TXT) ──────────────
    let resumeText = "";
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file");
      if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

      const buf = Buffer.from(await file.arrayBuffer());
      const name = (file.name || "").toLowerCase();

      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
          const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
          const result = await pdfParse(buf);
          resumeText = result.text;
          if (!resumeText.trim()) throw new Error("empty");
        } catch (pdfErr) {
          const msg = pdfErr.message === "empty"
            ? "ملف PDF فارغ أو محمي بكلمة مرور"
            : "فشل قراءة PDF — نفّذ: npm install pdf-parse ثم أعد تشغيل السيرفر";
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      } else {
        resumeText = buf.toString("utf-8");
      }
    } else {
      const body = await req.json().catch(() => ({}));
      resumeText = body.resumeText || "";
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "نص السيرة الذاتية فارغ" }, { status: 400 });
    }

    // ── Try each model, fall through on quota/404 errors ─────────────────────
    const prompt = buildPrompt(resumeText);
    let lastError = null;

    for (const model of MODEL_CASCADE) {
      try {
        console.log(`[analyze] Trying ${model}...`);
        const parsed = await callGemini(model, apiKey, prompt);

        if (!parsed.label || parsed.riskScore === undefined) {
          throw new Error("بيانات غير مكتملة في الاستجابة");
        }

        // Ensure riskScore is a number
        parsed.riskScore = Number(parsed.riskScore) || 0;

        console.log(`[analyze] ✅ ${model} succeeded`);
        return NextResponse.json({ ...parsed, _model: model });

      } catch (err) {
        const msg = err.message || "";
        const isRetryable =
          err.status === 429 || err.status === 404 ||
          msg.includes("quota") || msg.includes("not found") ||
          msg.includes("404") || msg.includes("429");

        if (isRetryable) {
          console.warn(`[analyze] ⚠️  ${model}: ${msg.slice(0, 80)} — trying next`);
          lastError = err;
          continue;
        }

        // Hard error — return immediately with full message
        console.error(`[analyze] ❌ ${model}: ${msg}`);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    // All models exhausted
    console.error("[analyze] All models failed:", lastError?.message);
    return NextResponse.json(
      {
        error: "تم استنفاد حصة جميع النماذج. أنشئ مفتاح API جديد على https://aistudio.google.com/apikey",
        quotaExhausted: true,
      },
      { status: 429 }
    );

  } catch (err) {
    console.error("[analyze] Unexpected:", err?.message);
    return NextResponse.json({ error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}