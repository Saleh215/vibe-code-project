import { NextResponse } from "next/server";

// ─── app/api/analyze/route.js ─────────────────────────────────────────────────
// Groq API (مجاني) + pdf2json لقراءة PDF (يعمل مع Node 20.15)

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

// ─── PDF extraction using pdf2json (works with Node 20.15) ────────────────────
async function extractPdfText(buffer) {
  const PDFParser = (await import("pdf2json")).default;
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);
    parser.on("pdfParser_dataReady", (data) => {
      try {
        const text = data.Pages
          .flatMap(p => p.Texts)
          .map(t => decodeURIComponent(t.R.map(r => r.T).join("")))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        resolve(text);
      } catch (e) {
        reject(new Error("فشل استخراج النص من PDF"));
      }
    });
    parser.on("pdfParser_dataError", (err) => {
      reject(new Error(err?.parserError || "فشل قراءة PDF"));
    });
    parser.parseBuffer(buffer);
  });
}

function buildPrompt(resumeText) {
  return `You are a Saudi career expert for Vision 2030. Analyze the resume and return ONLY a JSON object. Start with { and end with }. No explanation, no markdown.

RESUME:
${resumeText}

Return this exact JSON (fill real values from the resume):
{"label":"محاسب قانوني","riskScore":75,"currentSkills":["Excel","SAP","التدقيق الورقي","إعداد الميزانيات","تسوية الحسابات"],"futureSkills":["المحاسبة الرقمية بالذكاء الاصطناعي","تحليل البيانات المالية","أتمتة العمليات المحاسبية","الذكاء الاصطناعي في التدقيق","المحاسبة السحابية"],"courses":[{"title":"أساسيات تحليل البيانات المالية","provider":"Coursera","duration":"4 أسابيع","level":"مبتدئ"},{"title":"الذكاء الاصطناعي في المحاسبة","provider":"edX","duration":"6 أسابيع","level":"متوسط"},{"title":"أتمتة العمليات المالية","provider":"Udacity","duration":"8 أسابيع","level":"متقدم"}]}

STRICT RULES:
1. label: Arabic job title from resume (2-4 words)
2. riskScore: number 0-100 only, no quotes
   - 70-90: routine jobs (data entry, basic accounting, clerical)
   - 40-69: mixed jobs (HR, marketing, law)
   - 10-39: technical/creative (software, AI, healthcare, teaching)
3. currentSkills: exactly 5 Arabic strings from the resume
4. futureSkills: exactly 5 Arabic strings for Vision 2030
5. courses: exactly 3 objects, all values in Arabic
6. Return ONLY the JSON. Nothing before {, nothing after }.`;
}

function parseResponse(raw) {
  if (!raw) throw new Error("استجابة فارغة");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("لم يُرجع النموذج JSON صالح");
  const text = raw.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`خطأ في JSON: ${e.message}`);
  }
}

async function callGroq(model, apiKey, prompt) {
  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err?.error?.message || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  return parseResponse(raw);
}

export async function POST(req) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY غير موجود — أضفه في .env.local أو Vercel Environment Variables" },
        { status: 500 }
      );
    }

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
          resumeText = await extractPdfText(buf);
          if (!resumeText.trim()) throw new Error("empty");
        } catch (e) {
          return NextResponse.json(
            { error: e.message === "empty" ? "ملف PDF فارغ أو محمي بكلمة مرور" : `فشل قراءة PDF: ${e.message}` },
            { status: 500 }
          );
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

    const prompt = buildPrompt(resumeText);
    let lastError = null;

    for (const model of GROQ_MODELS) {
      try {
        console.log(`[analyze] Trying Groq/${model}...`);
        const parsed = await callGroq(model, apiKey, prompt);

        if (!parsed.label || parsed.riskScore === undefined) {
          throw new Error("بيانات غير مكتملة");
        }

        parsed.riskScore = Math.min(100, Math.max(0, Number(parsed.riskScore) || 0));
        console.log(`[analyze] ✅ Success: ${model}`);
        return NextResponse.json({ ...parsed, _model: model });

      } catch (err) {
        const isRetryable = err.status === 429 || err.status === 503 ||
          (err.message || "").includes("rate") || (err.message || "").includes("limit");
        if (isRetryable) { lastError = err; continue; }
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "تم تجاوز حصة Groq المجانية مؤقتاً. حاول بعد دقيقة.", quotaExhausted: true },
      { status: 429 }
    );

  } catch (err) {
    console.error("[analyze] Unexpected:", err?.message);
    return NextResponse.json({ error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}