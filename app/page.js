"use client";

import { useState, useEffect, useRef } from "react";

// ── NO API KEYS HERE. All Gemini calls go through /api/analyze and /api/chat ──

const SAMPLES = [
  { key:"accounting", label:"محاسب", icon:"📊", text:`الاسم: أحمد العمري\nالمسمى الوظيفي: محاسب قانوني معتمد\nالخبرة: 8 سنوات في إعداد التقارير المالية وتسوية الحسابات وإدخال البيانات يدوياً\nالمهارات: Excel التقليدي، SAP، التدقيق الورقي، إعداد الميزانيات\nالتعليم: بكالوريوس محاسبة - جامعة الملك سعود` },
  { key:"hr", label:"موارد بشرية", icon:"👥", text:`الاسم: سارة الشهري\nالمسمى الوظيفي: مديرة موارد بشرية\nالخبرة: 6 سنوات في التوظيف وإدارة الأداء وكشوف المرتبات\nالمهارات: إدارة الملفات الورقية، مقابلات العمل التقليدية، تقييم الأداء السنوي\nالتعليم: بكالوريوس إدارة أعمال - جامعة الملك عبدالعزيز` },
  { key:"software", label:"مطور برمجيات", icon:"💻", text:`الاسم: ريم السالم\nالمسمى الوظيفي: مطورة برمجيات Full-Stack\nالخبرة: 4 سنوات في React وNode.js وقواعد البيانات SQL\nالمهارات: JavaScript، Python، REST APIs، Git، Docker\nالتعليم: بكالوريوس هندسة حاسب آلي - جامعة الملك فهد` },
  { key:"marketing", label:"مسوّق", icon:"📣", text:`الاسم: خالد المطيري\nالمسمى الوظيفي: مدير تسويق رقمي\nالخبرة: 5 سنوات في إدارة الحملات الإعلانية على Facebook وGoogle\nالمهارات: إنشاء المحتوى، تحليل البيانات الأساسي، البريد الإلكتروني التسويقي\nالتعليم: بكالوريوس تسويق - جامعة الأمير سلطان` },
  { key:"law", label:"محامي", icon:"⚖️", text:`الاسم: نورة الحربي\nالمسمى الوظيفي: محامية متخصصة في قانون الشركات\nالخبرة: 7 سنوات في صياغة العقود التجارية والاستشارات القانونية\nالمهارات: البحث القانوني اليدوي، مراجعة المستندات، الإجراءات القضائية\nالتعليم: بكالوريوس قانون - جامعة الملك فيصل` },
  { key:"ai", label:"ذكاء اصطناعي", icon:"🧠", text:`الاسم: عمر الغامدي\nالمسمى الوظيفي: مهندس تعلم آلي\nالخبرة: 3 سنوات في بناء نماذج التصنيف والتنبؤ باستخدام Python وTensorFlow\nالمهارات: نماذج التعلم الآلي الكلاسيكية، تحليل البيانات، Scikit-learn، Pandas\nالتعليم: ماجستير علوم حاسب - KAUST` },
];

function guessIcon(label = "") {
  if (label.includes("محاسب")||label.includes("مالي")) return "📊";
  if (label.includes("موارد")||label.includes("hr")) return "👥";
  if (label.includes("تسويق")||label.includes("إعلان")) return "📣";
  if (label.includes("برمجيات")||label.includes("مطور")||label.includes("software")||label.includes("engineer")) return "💻";
  if (label.includes("ذكاء")||label.includes("تعلم آلي")||label.includes("بيانات")) return "🧠";
  if (label.includes("قانون")||label.includes("محامي")) return "⚖️";
  if (label.includes("طبيب")||label.includes("صحة")||label.includes("تمريض")) return "🏥";
  if (label.includes("هندس")||label.includes("ميكانيك")||label.includes("كهرب")) return "⚙️";
  if (label.includes("معلم")||label.includes("تعليم")) return "📚";
  if (label.includes("صحفي")||label.includes("إعلام")||label.includes("كاتب")) return "📰";
  return "💼";
}

async function analyzeResume(resumeText, file = null) {
  let body, headers = {};
  if (file) {
    const fd = new FormData();
    fd.append("file", file);
    body = fd;
  } else {
    body = JSON.stringify({ resumeText });
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch("/api/analyze", { method: "POST", headers, body });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "فشل الاتصال بالخادم");
    err.quotaExhausted = data.quotaExhausted || res.status === 429;
    throw err;
  }
  return { ...data, icon: guessIcon(data.label || "") };
}

async function sendChatMessage(userMessage, roleData, history) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage, roleData, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "فشل الاتصال");
  return data.reply;
}

// ═══════════════════════ UI Components ═══════════════════════════════════════

function AnimatedGauge({ score }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(0); let n = 0;
    const t = setInterval(() => { n += 2; if (n >= score) { setVal(score); clearInterval(t); } else setVal(n); }, 18);
    return () => clearInterval(t);
  }, [score]);
  const angle = (val / 100) * 180 - 90;
  const color = score >= 70 ? "#ef4444" : score >= 45 ? "#f59e0b" : "#22c55e";
  const label = score >= 70 ? "خطر مرتفع" : score >= 45 ? "خطر متوسط" : "خطر منخفض";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" }}>
      <svg width="240" height="130" viewBox="0 0 240 130">
        <defs>
          <linearGradient id="gG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round"/>
        <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="url(#gG)" strokeWidth="16" strokeLinecap="round" opacity="0.25"/>
        <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${(val/100)*314} 314`} filter="url(#glow)" style={{transition:"stroke-dasharray 0.08s"}}/>
        <g transform={`translate(120,120) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-84" stroke={color} strokeWidth="3" strokeLinecap="round" filter="url(#glow)"/>
          <circle cx="0" cy="0" r="6" fill={color}/><circle cx="0" cy="0" r="3" fill="#0f172a"/>
        </g>
        {[0,25,50,75,100].map(t=>{const a=(t/100)*180-90,r=(a-90)*Math.PI/180;return<line key={t} x1={120+92*Math.cos(r)} y1={120+92*Math.sin(r)} x2={120+106*Math.cos(r)} y2={120+106*Math.sin(r)} stroke="#334155" strokeWidth="2"/>;})}
      </svg>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"3rem",fontWeight:"900",color,lineHeight:1}}>{val}%</div>
        <div style={{marginTop:"6px",padding:"4px 18px",borderRadius:"20px",background:color+"22",border:`1px solid ${color}44`,color,fontWeight:"700",fontSize:"0.9rem"}}>{label}</div>
      </div>
    </div>
  );
}

function SkillGrid({ currentSkills=[], futureSkills=[] }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"12px",padding:"16px"}}>
        <div style={{color:"#ef4444",fontWeight:"700",marginBottom:"12px",fontSize:"0.85rem"}}>⚠️ المهارات الحالية (مهددة)</div>
        {currentSkills.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:"8px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"flex-start"}}>
            <span style={{color:"#ef4444",fontSize:"0.7rem",marginTop:"4px",flexShrink:0}}>✕</span>
            <span style={{color:"#94a3b8",fontSize:"0.85rem",lineHeight:"1.5"}}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"12px",padding:"16px"}}>
        <div style={{color:"#22c55e",fontWeight:"700",marginBottom:"12px",fontSize:"0.85rem"}}>🚀 مهارات المستقبل 2030</div>
        {futureSkills.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:"8px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"flex-start"}}>
            <span style={{color:"#22c55e",fontSize:"0.7rem",marginTop:"4px",flexShrink:0}}>✓</span>
            <span style={{color:"#e2e8f0",fontSize:"0.85rem",lineHeight:"1.5"}}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, idx }) {
  const C = {"مبتدئ":"#22c55e","متوسط":"#f59e0b","متقدم":"#ef4444"}[course.level]||"#6366f1";
  return (
    <div style={{background:"linear-gradient(135deg,rgba(30,41,59,.8),rgba(15,23,42,.9))",border:"1px solid rgba(99,102,241,.18)",borderRadius:"12px",padding:"16px",display:"flex",gap:"14px",alignItems:"flex-start",transition:"all .25s"}}
      onMouseEnter={e=>{e.currentTarget.style.border="1px solid rgba(99,102,241,.5)";e.currentTarget.style.transform="translateY(-2px)";}}
      onMouseLeave={e=>{e.currentTarget.style.border="1px solid rgba(99,102,241,.18)";e.currentTarget.style.transform="translateY(0)";}}>
      <div style={{width:"42px",height:"42px",borderRadius:"10px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0}}>
        {["📚","💻","🎓"][idx]??"📖"}
      </div>
      <div>
        <div style={{color:"#e2e8f0",fontWeight:"700",marginBottom:"4px"}}>{course.title}</div>
        <div style={{color:"#64748b",fontSize:"0.8rem",marginBottom:"8px"}}>{course.provider} · {course.duration}</div>
        <span style={{fontSize:"0.75rem",padding:"2px 12px",borderRadius:"20px",background:C+"1a",color:C,border:`1px solid ${C}40`}}>{course.level}</span>
      </div>
    </div>
  );
}

function Spinner() {
  const steps = ["تحديد المهنة","تقييم المخاطر","تحليل المهارات","بناء الخارطة"];
  const [s, setS] = useState(0);
  useEffect(()=>{const t=setInterval(()=>setS(x=>(x+1)%4),900);return()=>clearInterval(t);},[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(7,13,26,.97)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",width:"min(380px,90%)",padding:"44px 36px",background:"linear-gradient(135deg,rgba(15,23,42,.98),rgba(10,15,30,.99))",border:"1px solid rgba(99,102,241,.22)",borderRadius:"20px"}}>
        <div style={{position:"relative",width:"80px",height:"80px",margin:"0 auto 24px"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#6366f1",borderRightColor:"#8b5cf6",animation:"spin 1s linear infinite"}}/>
          <div style={{position:"absolute",inset:"10px",borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#a78bfa",borderLeftColor:"#6366f1",animation:"spin 1.6s linear infinite reverse"}}/>
          <div style={{position:"absolute",inset:"22px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>🧠</div>
        </div>
        <div style={{color:"#e2e8f0",fontWeight:"800",fontSize:"1.1rem",marginBottom:"8px"}}>Gemini يحلل سيرتك الذاتية</div>
        <div style={{color:"#818cf8",fontSize:"0.9rem",marginBottom:"20px",minHeight:"20px"}}>{steps[s]}...</div>
        <div style={{display:"flex",justifyContent:"center",gap:"6px",marginBottom:"16px"}}>
          {steps.map((_,i)=><div key={i} style={{height:"6px",width:i===s?"22px":"6px",borderRadius:"3px",background:i===s?"#6366f1":"rgba(99,102,241,.2)",transition:"all .3s"}}/>)}
        </div>
        <div style={{height:"3px",background:"rgba(99,102,241,.15)",borderRadius:"2px",overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)",borderRadius:"2px",animation:"bar 7s ease-in-out forwards"}}/>
        </div>
      </div>
    </div>
  );
}

function QuotaBanner({ onRetry }) {
  return (
    <div style={{padding:"18px 20px",borderRadius:"12px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",marginBottom:"16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
        <span style={{fontSize:"1.3rem"}}>⚠️</span>
        <strong style={{color:"#f59e0b"}}>تم استنفاد حصة API المجانية</strong>
      </div>
      <p style={{color:"#94a3b8",fontSize:"0.85rem",lineHeight:"1.8",marginBottom:"14px"}}>
        <strong style={{color:"#e2e8f0"}}>الحل الأسرع:</strong> أنشئ مفتاحاً في{" "}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:"#818cf8"}}>مشروع Google Cloud جديد</a> ثم حدّثه في <code style={{color:"#a78bfa"}}>.env.local</code> أو Vercel Environment Variables.
      </p>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <button onClick={onRetry} style={{padding:"8px 18px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontFamily:"'Cairo',sans-serif",fontWeight:"700",cursor:"pointer",fontSize:"0.85rem"}}>🔄 إعادة المحاولة</button>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
          style={{padding:"8px 18px",borderRadius:"8px",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",fontFamily:"'Cairo',sans-serif",fontWeight:"700",fontSize:"0.85rem",textDecoration:"none",display:"inline-flex",alignItems:"center"}}>
          🔑 مفتاح جديد
        </a>
      </div>
    </div>
  );
}

function ChatBot({ roleData }) {
  const init = `مرحباً! أنا مدرب مهني متخصص في **${roleData.label}** 🎯\n\nأستطيع مساعدتك في:\n• فهم تأثير الذكاء الاصطناعي على مسيرتك\n• اختيار الدورات المناسبة\n• بناء خطة تطوير مهني لرؤية 2030 🚀`;
  const [msgs, setMsgs] = useState([{role:"assistant",text:init}]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const end = useRef(null);
  useEffect(()=>end.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

  const send = async () => {
    if (!inp.trim()||loading) return;
    const msg = inp.trim(); setInp("");
    setMsgs(p=>[...p,{role:"user",text:msg}]);
    setLoading(true);
    try {
      const history = msgs.filter((_,i)=>i>0).map(m=>({role:m.role,content:m.text}));
      const reply = await sendChatMessage(msg, roleData, history);
      setMsgs(p=>[...p,{role:"assistant",text:reply}]);
    } catch(e) {
      setMsgs(p=>[...p,{role:"assistant",text:`⚠️ ${e.message}`}]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"420px"}}>
      <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-start":"flex-end",gap:"8px",alignItems:"flex-end"}}>
            {m.role==="assistant"&&<div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",flexShrink:0}}>🤖</div>}
            <div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",background:m.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(30,41,59,.85)",border:m.role==="user"?"none":"1px solid rgba(99,102,241,.18)",color:"#e2e8f0",fontSize:"0.87rem",lineHeight:"1.7",whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",alignItems:"flex-end"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center"}}>🤖</div>
            <div style={{padding:"12px 16px",borderRadius:"4px 16px 16px 16px",background:"rgba(30,41,59,.85)",border:"1px solid rgba(99,102,241,.18)",display:"flex",gap:"5px"}}>
              {[0,1,2].map(j=><div key={j} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#6366f1",animation:"bounce 1.2s infinite",animationDelay:`${j*.2}s`}}/>)}
            </div>
          </div>
        )}
        <div ref={end}/>
      </div>
      <div style={{padding:"10px 14px",borderTop:"1px solid rgba(99,102,241,.12)",display:"flex",gap:"8px"}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="اسألني عن مسيرتك..."
          style={{flex:1,background:"rgba(15,23,42,.8)",border:"1px solid rgba(99,102,241,.28)",borderRadius:"10px",padding:"10px 14px",color:"#e2e8f0",fontSize:"0.9rem",outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"}}/>
        <button onClick={send} disabled={loading||!inp.trim()}
          style={{padding:"10px 16px",borderRadius:"10px",border:"none",background:loading||!inp.trim()?"rgba(99,102,241,.2)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",cursor:loading||!inp.trim()?"default":"pointer",fontFamily:"'Cairo',sans-serif",fontSize:"0.9rem",transition:"all .2s"}}>
          ←
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════ MAIN APP ════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("home"); // "home" | "dashboard"
  const [result, setResult] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [quotaErr, setQuotaErr] = useState(false);
  const [tab, setTab] = useState("gauge");
  const [mode, setMode] = useState("text"); // "text" | "file"
  const [sample, setSample] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const go = () => { setView("home"); setResult(null); setText(""); setFile(null); setErr(null); setQuotaErr(false); setTab("gauge"); setSample(null); setMode("text"); };

  const analyze = async (t=text, f=file) => {
    if (!f&&!t.trim()) { setErr("الرجاء إدخال نص السيرة الذاتية أو رفع ملف."); return; }
    setErr(null); setQuotaErr(false); setLoading(true);
    try {
      const r = await analyzeResume(t, f);
      setResult(r); setTab("gauge"); setView("dashboard");
    } catch(e) {
      if (e.quotaExhausted) setQuotaErr(true);
      else setErr(e.message);
    } finally { setLoading(false); }
  };

  const pickFile = (f) => {
    if (!f) return;
    const ok = f.name.endsWith(".pdf")||f.name.endsWith(".txt")||f.type==="application/pdf"||f.type==="text/plain";
    if (!ok) { setErr("يُقبل فقط ملفات PDF أو TXT"); return; }
    setErr(null); setQuotaErr(false); setSample(null);
    if (f.name.endsWith(".txt")||f.type==="text/plain") {
      const r=new FileReader(); r.onload=e=>{setText(e.target.result);setFile(null);}; r.readAsText(f);
    } else { setFile(f); setText(""); }
  };

  const can = !loading&&(!!text.trim()||!!file);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    page: { minHeight:"100vh", background:"#070d1a", fontFamily:"'Cairo','Noto Sans Arabic',sans-serif", color:"#e2e8f0", direction:"rtl" },
    nav: { position:"sticky", top:0, zIndex:100, background:"rgba(7,13,26,.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(99,102,241,.12)", padding:"0 5%" },
    navInner: { maxWidth:"1200px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:"64px" },
    logo: { background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px" },
    logoBox: { width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" },
    card: { background:"linear-gradient(135deg,rgba(15,23,42,.94),rgba(10,15,30,.97))", border:"1px solid rgba(99,102,241,.14)", borderRadius:"16px" },
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{overflow-x:hidden}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#6366f1;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bar{0%{width:0}75%{width:82%}100%{width:100%}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .grid{background-image:linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px);background-size:44px 44px}
        .tbtn{padding:10px 18px;border-radius:10px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:.88rem;font-weight:700;transition:all .25s}
        .tbtn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
        .tbtn.off{background:rgba(30,41,59,.5);color:#64748b}
        .tbtn.off:hover{background:rgba(99,102,241,.15);color:#94a3b8}
        .mbtn{padding:8px 18px;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:.85rem;font-weight:600;transition:all .2s;border:1px solid rgba(99,102,241,.25)}
        .mbtn.on{background:rgba(99,102,241,.2);color:#818cf8;border-color:#6366f1}
        .mbtn.off{background:transparent;color:#475569}
        textarea{resize:vertical;outline:none}
        input[type=file]{display:none}
      `}</style>

      {loading && <Spinner/>}

      {/* ── NAV ── */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <button onClick={go} style={S.logo}>
            <div style={S.logoBox}>🌉</div>
            <div>
              <div style={{color:"#fff",fontWeight:"900",fontSize:"1rem"}}>جسر المهارات</div>
              <div style={{color:"#334155",fontSize:"0.65rem"}}>Skills Bridge · رؤية 2030</div>
            </div>
          </button>
          <div style={{display:"flex",gap:"6px"}}>
            {[["home","الرئيسية"],["dashboard","لوحة التحليل"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>id==="home"&&go()}
                style={{padding:"7px 14px",borderRadius:"8px",border:"none",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontSize:"0.82rem",fontWeight:"600",background:view===id?"rgba(99,102,241,.2)":"transparent",color:view===id?"#818cf8":"#475569",transition:"all .2s"}}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ══════════════════════ HOME PAGE ════════════════════════ */}
      {view === "home" && (
        <div className="grid">
          {/* Hero */}
          <div style={{padding:"60px 5% 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
            {/* Glow blobs */}
            <div style={{position:"absolute",top:"10%",left:"5%",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:"20%",right:"4%",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,.09) 0%,transparent 70%)",pointerEvents:"none"}}/>

            <div style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"5px 16px",borderRadius:"20px",background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",fontSize:"0.8rem",marginBottom:"20px"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e",display:"inline-block"}}/>
              Gemini AI · آمن 100% · يقرأ PDF · رؤية 2030
            </div>

            <h1 style={{fontSize:"clamp(2rem,5vw,4rem)",fontWeight:"900",lineHeight:"1.15",marginBottom:"16px"}}>
              <span style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>جسر المهارات</span>
              <br/>
              <span style={{color:"#e2e8f0",fontSize:"clamp(1.1rem,2.8vw,1.9rem)",fontWeight:"700"}}>اكتشف تأثير الذكاء الاصطناعي على مسيرتك</span>
            </h1>
            <p style={{color:"#64748b",fontSize:"1rem",maxWidth:"520px",margin:"0 auto 40px",lineHeight:"1.9"}}>
              الصق سيرتك أو ارفع PDF — يكتشف Gemini مهنتك تلقائياً ويبني تقريرك الكامل
            </p>
            <div style={{display:"flex",justifyContent:"center",gap:"32px",flexWrap:"wrap",marginBottom:"48px"}}>
              {[["🔒","مفتاح API آمن"],["📄","يقرأ PDF"],["🇸🇦","رؤية 2030"],["⚡","3 نماذج احتياطية"]].map(([ic,lb])=>(
                <div key={lb} style={{textAlign:"center"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"4px"}}>{ic}</div>
                  <div style={{color:"#334155",fontSize:"0.75rem"}}>{lb}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Input card */}
          <div style={{padding:"0 5% 72px",maxWidth:"820px",margin:"0 auto"}}>
            <div style={{...S.card,padding:"32px 36px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"22px"}}>
                <div style={{width:"38px",height:"38px",borderRadius:"10px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>🧠</div>
                <div>
                  <div style={{color:"#e2e8f0",fontWeight:"800",fontSize:"1.05rem"}}>التحليل الذكي الشامل</div>
                  <div style={{color:"#475569",fontSize:"0.8rem"}}>يعمل مع أي مهنة — محاسب، مهندس، طبيب، معلم...</div>
                </div>
              </div>

              {/* Mode toggle */}
              <div style={{display:"flex",gap:"8px",marginBottom:"18px"}}>
                <button className={`mbtn ${mode==="text"?"on":"off"}`} onClick={()=>setMode("text")}>📝 لصق النص</button>
                <button className={`mbtn ${mode==="file"?"on":"off"}`} onClick={()=>setMode("file")}>📄 رفع PDF</button>
              </div>

              {/* Text input */}
              {mode==="text" && (
                <>
                  <label style={{color:"#94a3b8",fontSize:"0.85rem",fontWeight:"600",display:"block",marginBottom:"8px"}}>📋 الصق نص السيرة الذاتية</label>
                  <textarea value={text}
                    onChange={e=>{setText(e.target.value);setErr(null);setQuotaErr(false);setSample(null);}}
                    placeholder={"مثال:\nالاسم: محمد العتيبي\nالمسمى الوظيفي: مهندس ميكانيكا\nالخبرة: 6 سنوات\nالمهارات: AutoCAD، SolidWorks، اختبار المواد"} rows={7}
                    style={{width:"100%",background:"rgba(15,23,42,.75)",border:`1px solid ${text.trim()?"rgba(99,102,241,.4)":"rgba(99,102,241,.2)"}`,borderRadius:"12px",padding:"12px 14px",color:"#e2e8f0",fontSize:"0.88rem",fontFamily:"'Cairo',sans-serif",direction:"rtl",lineHeight:"1.9",marginBottom:"14px",transition:"border-color .2s"}}/>
                  {/* Samples */}
                  <div style={{marginBottom:"18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                      <span style={{flex:1,height:"1px",background:"rgba(99,102,241,.12)"}}/>
                      <span style={{color:"#334155",fontSize:"0.75rem"}}>نماذج سريعة</span>
                      <span style={{flex:1,height:"1px",background:"rgba(99,102,241,.12)"}}/>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
                      {SAMPLES.map(s=>(
                        <button key={s.key} onClick={()=>{setText(s.text);setSample(s.key);setErr(null);setQuotaErr(false);setMode("text");setFile(null);}}
                          style={{padding:"5px 13px",borderRadius:"20px",border:`1px solid ${sample===s.key?"#6366f1":"rgba(99,102,241,.2)"}`,background:sample===s.key?"rgba(99,102,241,.18)":"transparent",color:sample===s.key?"#818cf8":"#64748b",cursor:"pointer",fontSize:"0.78rem",fontFamily:"'Cairo',sans-serif",transition:"all .2s"}}>
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* File input */}
              {mode==="file" && (
                <div onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDrag(true);}}
                  onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);pickFile(e.dataTransfer.files[0]);}}
                  style={{border:`2px dashed ${drag?"#6366f1":file?"#22c55e":"rgba(99,102,241,.3)"}`,borderRadius:"12px",padding:"36px 20px",textAlign:"center",background:drag?"rgba(99,102,241,.07)":file?"rgba(34,197,94,.05)":"rgba(15,23,42,.4)",cursor:"pointer",transition:"all .3s",marginBottom:"16px"}}>
                  <div style={{fontSize:"2.4rem",marginBottom:"10px",display:"inline-block",animation:file||drag?"none":"float 3s ease-in-out infinite"}}>{file?"✅":"📄"}</div>
                  {file ? (
                    <div>
                      <div style={{color:"#22c55e",fontWeight:"700",marginBottom:"4px"}}>{file.name}</div>
                      <div style={{color:"#64748b",fontSize:"0.8rem"}}>{(file.size/1024).toFixed(1)} KB · اضغط للتغيير</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{color:"#e2e8f0",fontWeight:"700",marginBottom:"4px"}}>اسحب ملف PDF هنا أو اضغط</div>
                      <div style={{color:"#475569",fontSize:"0.8rem"}}>PDF · TXT · حتى 10MB</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={e=>pickFile(e.target.files?.[0])}/>
                </div>
              )}

              {/* Errors */}
              {quotaErr && <QuotaBanner onRetry={()=>analyze()}/>}
              {err && !quotaErr && (
                <div style={{padding:"11px 14px",borderRadius:"10px",background:"rgba(239,68,68,.09)",border:"1px solid rgba(239,68,68,.28)",color:"#f87171",fontSize:"0.85rem",marginBottom:"14px",display:"flex",gap:"8px",alignItems:"center"}}>
                  ⚠️ {err}
                </div>
              )}

              {/* CTA */}
              <button onClick={()=>analyze()} disabled={!can}
                style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",background:can?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(99,102,241,.18)",color:can?"#fff":"#475569",fontFamily:"'Cairo',sans-serif",fontSize:"1rem",fontWeight:"800",cursor:can?"pointer":"default",transition:"all .3s",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
                🚀 تحليل بالذكاء الاصطناعي — كشف تلقائي للمهنة
              </button>
              <div style={{marginTop:"8px",textAlign:"center",color:"#334155",fontSize:"0.72rem"}}>🔒 مفتاح API محمي على الخادم · لا يُرسل للمتصفح أبداً</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ DASHBOARD ════════════════════════ */}
      {view === "dashboard" && result && (
        <div style={{padding:"28px 5%",maxWidth:"1200px",margin:"0 auto",animation:"fadeUp .4s ease forwards"}}>

          {/* Header row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px",flexWrap:"wrap",gap:"14px"}}>
            <div>
              <div style={{color:"#334155",fontSize:"0.72rem",marginBottom:"6px"}}>الرئيسية ← لوحة التحليل</div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <span style={{fontSize:"2rem"}}>{result.icon}</span>
                <div>
                  <div style={{color:"#64748b",fontSize:"0.78rem"}}>تحليل مهنة</div>
                  <h1 style={{fontSize:"clamp(1.3rem,2.8vw,1.9rem)",fontWeight:"900",color:"#e2e8f0"}}>{result.label}</h1>
                </div>
                <span style={{padding:"3px 12px",borderRadius:"20px",background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",fontSize:"0.7rem",fontWeight:"700"}}>
                  ✨ {result._model}
                </span>
              </div>
            </div>
            <button onClick={go} style={{padding:"9px 20px",borderRadius:"10px",border:"1px solid rgba(99,102,241,.28)",background:"transparent",color:"#818cf8",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:"600",fontSize:"0.85rem",whiteSpace:"nowrap"}}>
              ← تحليل جديد
            </button>
          </div>

          {/* Stats bar */}
          <div style={{display:"flex",gap:"10px",marginBottom:"20px",flexWrap:"wrap"}}>
            {[
              {v:`${result.riskScore}%`,l:"نسبة الخطر",c:result.riskScore>=70?"#ef4444":result.riskScore>=45?"#f59e0b":"#22c55e"},
              {v:`${(result.currentSkills||[]).length}`,l:"مهارات حالية",c:"#6366f1"},
              {v:`${(result.futureSkills||[]).length}`,l:"مهارات مستقبل",c:"#8b5cf6"},
              {v:`${(result.courses||[]).length}`,l:"دورات مقترحة",c:"#22c55e"},
            ].map(b=>(
              <div key={b.l} style={{padding:"10px 16px",borderRadius:"10px",background:b.c+"12",border:`1px solid ${b.c}28`,display:"flex",gap:"8px",alignItems:"center"}}>
                <span style={{color:b.c,fontWeight:"900",fontSize:"1rem"}}>{b.v}</span>
                <span style={{color:"#64748b",fontSize:"0.76rem"}}>{b.l}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:"8px",marginBottom:"18px",flexWrap:"wrap"}}>
            {[["gauge","🎯 مقياس الخطر"],["skills","⚡ فجوة المهارات"],["roadmap","🗺️ خارطة التعلم"],["chat","🤖 المدرب الذكي"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} className={`tbtn ${tab===id?"on":"off"}`}>{lbl}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{...S.card,padding:"28px 32px"}}>

            {/* GAUGE */}
            {tab==="gauge" && (
              <div style={{textAlign:"center"}}>
                <h2 style={{color:"#e2e8f0",fontWeight:"700",fontSize:"1.2rem",marginBottom:"6px"}}>مقياس خطر الذكاء الاصطناعي</h2>
                <p style={{color:"#64748b",marginBottom:"28px"}}>احتمالية تأثر مهنة <strong style={{color:"#818cf8"}}>{result.label}</strong> بالأتمتة بحلول 2030</p>
                <AnimatedGauge score={result.riskScore}/>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginTop:"28px"}}>
                  {[["مهام مهددة",`${Math.round(result.riskScore*.8)}%`,"#ef4444"],["مهام آمنة",`${Math.round((100-result.riskScore)*.7)}%`,"#22c55e"],["تحتاج تطوير",`${Math.round(result.riskScore*.5)}%`,"#f59e0b"]].map(([l,v,c])=>(
                    <div key={l} style={{padding:"14px",borderRadius:"12px",background:c+"10",border:`1px solid ${c}20`,textAlign:"center"}}>
                      <div style={{color:c,fontSize:"1.7rem",fontWeight:"900"}}>{v}</div>
                      <div style={{color:"#64748b",fontSize:"0.8rem",marginTop:"4px"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SKILLS */}
            {tab==="skills" && (
              <div>
                <h2 style={{color:"#e2e8f0",fontWeight:"700",fontSize:"1.2rem",marginBottom:"6px"}}>تحليل فجوة المهارات</h2>
                <p style={{color:"#64748b",marginBottom:"20px"}}>ما يملكه <strong style={{color:"#818cf8"}}>{result.label}</strong> اليوم مقابل ما يحتاجه سوق 2030</p>
                <SkillGrid currentSkills={result.currentSkills} futureSkills={result.futureSkills}/>
                <div style={{marginTop:"20px",padding:"14px",borderRadius:"12px",background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)"}}>
                  <div style={{color:"#818cf8",fontWeight:"700",marginBottom:"6px"}}>💡 توصية Gemini</div>
                  <p style={{color:"#94a3b8",fontSize:"0.86rem",lineHeight:"1.85"}}>
                    يُنصح لمتخصصي <strong style={{color:"#e2e8f0"}}>{result.label}</strong> بالتركيز على مهارات الذكاء الاصطناعي خلال الـ 18 شهراً القادمة. المهنيون الذين يدمجون خبراتهم مع أدوات الذكاء الاصطناعي يحققون زيادة تصل إلى 40% في قيمتهم السوقية وفق رؤية 2030.
                  </p>
                </div>
              </div>
            )}

            {/* ROADMAP */}
            {tab==="roadmap" && (
              <div>
                <h2 style={{color:"#e2e8f0",fontWeight:"700",fontSize:"1.2rem",marginBottom:"6px"}}>خارطة التعلم المقترحة</h2>
                <p style={{color:"#64748b",marginBottom:"20px"}}>دورات اختارها Gemini لمهنة <strong style={{color:"#818cf8"}}>{result.label}</strong></p>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {(result.courses||[]).map((c,i)=><CourseCard key={i} course={c} idx={i}/>)}
                </div>
                <div style={{marginTop:"20px",padding:"14px 18px",borderRadius:"12px",background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",display:"flex",alignItems:"center",gap:"12px"}}>
                  <span style={{fontSize:"1.4rem"}}>🏆</span>
                  <div>
                    <div style={{color:"#22c55e",fontWeight:"700",marginBottom:"2px"}}>إتمام المسار = شهادة جسر المهارات</div>
                    <div style={{color:"#64748b",fontSize:"0.8rem"}}>معترف بها من أبرز شركات التوظيف في المنطقة</div>
                  </div>
                </div>
              </div>
            )}

            {/* CHAT */}
            {tab==="chat" && (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                  <div style={{width:"42px",height:"42px",borderRadius:"12px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",position:"relative"}}>
                    🤖
                    <div style={{position:"absolute",top:"-2px",right:"-2px",width:"10px",height:"10px",borderRadius:"50%",background:"#22c55e",border:"2px solid #070d1a"}}/>
                  </div>
                  <div>
                    <div style={{color:"#e2e8f0",fontWeight:"700"}}>المدرب المهني الذكي</div>
                    <div style={{color:"#22c55e",fontSize:"0.76rem"}}>● متاح الآن · متخصص في {result.label}</div>
                  </div>
                </div>
                <div style={{background:"rgba(7,13,26,.8)",borderRadius:"12px",border:"1px solid rgba(99,102,241,.13)",overflow:"hidden"}}>
                  <ChatBot roleData={result}/>
                </div>
                <div style={{display:"flex",gap:"7px",marginTop:"10px",flexWrap:"wrap"}}>
                  {["كيف أبدأ التحول للذكاء الاصطناعي؟","ما أفضل شهادة لي؟","هل وظيفتي آمنة؟"].map(q=>(
                    <span key={q} style={{padding:"4px 12px",borderRadius:"20px",background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",color:"#6366f1",fontSize:"0.74rem"}}>{q}</span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <footer style={{borderTop:"1px solid rgba(99,102,241,.07)",padding:"20px 5%",textAlign:"center",color:"#1e293b",fontSize:"0.75rem",marginTop:"48px"}}>
        جسر المهارات · Gemini AI · رؤية السعودية 2030 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}