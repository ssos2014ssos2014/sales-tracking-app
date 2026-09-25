import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  LayoutDashboard, Users, Target, Wallet, BarChart3, Search,
  LogOut, Plus, Trash2, ClipboardList, PieChart as PieIcon, CalendarRange,
  Lock, KeyRound, Eye, EyeOff, Banknote, Repeat, CreditCard, Pencil, FileText, User,
  Store, MapPin, Camera, Phone, Gauge, UserCog, Download, Upload,
  Warehouse, Package, PackagePlus, PackageCheck, ArrowRightLeft, Truck
} from "lucide-react";
 
const ADMIN_PASSWORD_KEY = "admin-password";
const DEFAULT_ADMIN_PASSWORD = "admin123";

// ---------- إعدادات Supabase ----------
const SUPABASE_URL = "https://gvnxvmfvlrsurxambvmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_58HMImyiyMwcCzVfAeWvGQ_ZcXkuBxR";
 
const COLORS = {
  bg: "#F4F6F5",
  surface: "#FFFFFF",
  primary: "#12403F",
  primaryDeep: "#0B2E2D",
  accent: "#C6923D",
  success: "#2E8F63",
  danger: "#B7453F",
  ink: "#1E2624",
  muted: "#63716D",
  border: "#E1E6E3",
  border2: "#CBD3CE",
};
 
const EXPENSE_TYPES = ["وقود", "صيانة", "سكن", "معيشة", "أخرى"];
const COMMITMENT_TYPES = ["راتب المندوب", "إيجار المركبة", "أخرى"];
const SECTORS = ["قطاع الجنوبية", "قطاع الغربية", "قطاع الوسطى", "قطاع الشرقية", "قطاع الشمالية"];
const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "الأحساء", "الهفوف",
  "الجبيل", "القطيف", "حفر الباطن", "الخفجي", "رأس تنورة", "النعيرية", "بقيق", "الطائف", "ينبع", "رابغ",
  "الليث", "القنفذة", "الوجه", "ضباء", "تبوك", "حائل", "عرعر", "سكاكا", "القريات", "طريف", "رفحاء",
  "أبها", "خميس مشيط", "نجران", "جازان", "صبيا", "أبو عريش", "الدرب", "بيشة", "النماص", "محايل عسير",
  "سراة عبيدة", "الباحة", "بلجرشي", "المجاردة", "بريدة", "عنيزة", "الرس", "البكيرية", "البدائع", "المذنب",
  "رياض الخبراء", "الزلفي", "المجمعة", "القويعية", "الدوادمي", "وادي الدواسر", "الخرج", "الأفلاج",
  "حوطة بني تميم", "عفيف", "شقراء", "ضرما", "العلا", "خيبر", "بدر", "مهد الذهب",
];
 
// ثابت الألوان الدلالية: المبيعات أزرق دائمًا، التحصيل أخضر دائمًا، المصروفات/الالتزامات أحمر دائمًا
const SALES_COLOR = "#1D4ED8";
const COLLECTION_COLOR = "#2E8F63";
const EXPENSE_COLOR = "#B7453F";
const PERCENT_COLOR = "#C6923D";
const PROFIT_COLOR = "#6D4C9F";
 
const monthKey = (d) => (d || "").slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => todayStr().slice(0, 7);
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const reportCollection = (r) => (Number(r.cash) || 0) + (Number(r.transfer) || 0) + (Number(r.network) || 0);
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("ar-SA");
const pct = (n) => `${Math.round(Number(n) || 0)}%`;
const monthLabel = (mk) => {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);
 
function monthsBetween(start, end) {
  const res = [];
  let [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (sy < ey || (sy === ey && sm <= em)) {
    res.push(`${sy}-${String(sm).padStart(2, "0")}`);
    sm++;
    if (sm > 12) { sm = 1; sy++; }
  }
  return res;
}
 
// طبقة التخزين: تعتمد على Supabase (قاعدة بيانات سحابية حقيقية) بدل التخزين
// المحلي، بحيث تُخزَّن كل بيانات المناديب والمبيعات على خادم واحد مشترك
// تتزامن معه كل الأجهزة (كمبيوتر أو جوال) فور فتح نفس رابط التطبيق.
async function storageGet(key, shared) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0].value : null;
  } catch (e) {
    console.error("storage get failed", e);
    return null;
  }
}
async function storageSet(key, value, shared) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/kv_store`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) console.error("storage set failed", await res.text());
  } catch (e) {
    console.error("storage set failed", e);
  }
}
 
const emptyRepData = () => ({
  reports: [], goals: [], commitments: [], expenses: [], customers: [],
  personalInfo: { personalPhone: "", workPhone: "", email: "", other: "" },
  warehouseStock: {}, soldLog: [], shipments: [],
});
 
function Card({ children, style, accent }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRight: accent ? `4px solid ${accent}` : `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "16px 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
 
function StatBox({ label, value, sub, color }) {
  return (
    <Card style={{ flex: "1 1 160px", minWidth: 150 }} accent={color}>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}
 
function Btn({ children, onClick, kind = "primary", style, type = "button", disabled }) {
  const base = {
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    opacity: disabled ? 0.5 : 1,
  };
  const kinds = {
    primary: { background: COLORS.primary, color: "#fff" },
    accent: { background: COLORS.accent, color: "#3A2A0C" },
    ghost: { background: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.border2}` },
    danger: { background: "transparent", color: COLORS.danger, border: `1px solid ${COLORS.danger}` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}
 
const inputStyle = {
  border: `1px solid ${COLORS.border2}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  color: COLORS.ink,
};
const labelStyle = { fontSize: 13, color: COLORS.muted, marginBottom: 4, display: "block" };
 
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
 
function WhatsAppShareBox({ text, groupLink, allowGroup = true, label }) {
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [number, setNumber] = useState("");
  const [copied, setCopied] = useState(false);
 
  const sendToGroup = () => {
    // نفتح واتساب أولًا وبشكل متزامن (نفس نقرة المستخدم) حتى لا يحجبها
    // المتصفح كنافذة منبثقة غير موثوقة، ثم ننسخ النص بعد ذلك.
    if (groupLink) window.open(groupLink, "_blank", "noopener");
    copyText(text).then(setCopied);
  };
  const sendToNumber = () => {
    if (!number.trim()) return;
    window.open(waLink(number, text), "_blank", "noopener");
  };
 
  return (
    <div>
      {label && <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {allowGroup && (
          <Btn kind="ghost" onClick={sendToGroup} disabled={!groupLink} style={{ color: "#25D366", borderColor: "#25D366" }}>
            إرسال إلى قروب التقارير
          </Btn>
        )}
        <Btn kind="ghost" onClick={() => setShowNumberInput((s) => !s)} style={{ color: "#25D366", borderColor: "#25D366" }}>
          إرسال إلى رقم آخر
        </Btn>
      </div>
      {showNumberInput && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <input style={inputStyle} placeholder="رقم الجوال (مع رمز الدولة)" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <Btn kind="accent" onClick={sendToNumber} disabled={!number.trim()}>إرسال</Btn>
        </div>
      )}
      {allowGroup && !groupLink && (
        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>لم تحدد الإدارة رابط قروب واتساب التقارير بعد.</div>
      )}
      {copied && (
        <div style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>
          تم نسخ نص التقرير — الصقه داخل القروب في واتساب (وأرفق ملف الـ PDF يدويًا بعد تنزيله إن رغبت).
        </div>
      )}
    </div>
  );
}
 
// ---------- computation helpers ----------
function sumReports(reports, month) {
  const list = month ? reports.filter((r) => monthKey(r.date) === month) : reports;
  return list.reduce(
    (acc, r) => {
      acc.sales += Number(r.sales) || 0;
      acc.collection += reportCollection(r);
      return acc;
    },
    { sales: 0, collection: 0 }
  );
}
 
function monthlySeries(reports, months) {
  return months.map((mk) => {
    const t = sumReports(reports, mk);
    return { month: mk, label: monthLabel(mk), مبيعات: Math.round(t.sales), تحصيل: Math.round(t.collection) };
  });
}
 
function goalForMonth(goals, month) {
  const found = [...goals].reverse().find((g) => g.month === month);
  return found || null;
}
 
function financeTotals(commitments, expenses, month) {
  const fixed = commitments.reduce((s, c) => s + (Number(c.value) || 0), 0);
  const variable = expenses
    .filter((e) => monthKey(e.date) === month)
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  return { fixed, variable };
}
 
function filterReportsRange(reports, from, to) {
  return reports.filter((r) => r.date >= from && r.date <= to);
}
 
function countWorkDays(reports, month) {
  const byDate = {};
  reports.filter((r) => monthKey(r.date) === month).forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = { sales: 0, collection: 0 };
    byDate[r.date].sales += Number(r.sales) || 0;
    byDate[r.date].collection += reportCollection(r);
  });
  const days = Object.values(byDate);
  const working = days.filter((d) => d.sales > 0 && d.collection > 0).length;
  const noWork = days.length - working;
  return { working, noWork, totalDays: days.length };
}

// ---------- مساعدات المخازن والأصناف ----------
function defaultFactoryWarehouses() {
  return [
    { id: "riyadh", name: "مخزن مصنع الرياض" },
    { id: "muhayil", name: "مخزن مصنع محايل" },
  ];
}

function itemById(items, id) {
  return (items || []).find((i) => i.id === id) || null;
}

function stockRows(stockObj, items) {
  return Object.entries(stockObj || {})
    .filter(([, qty]) => (Number(qty) || 0) > 0)
    .map(([itemId, qty]) => {
      const item = itemById(items, itemId);
      const q = Number(qty) || 0;
      return {
        itemId,
        item,
        qty: q,
        costValue: q * (Number(item?.costPrice) || 0),
        saleValue: q * (Number(item?.expectedSalePrice) || 0),
      };
    })
    .sort((a, b) => (a.item?.name || "").localeCompare(b.item?.name || "", "ar"));
}

function stockTotals(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.qty += r.qty;
      acc.costValue += r.costValue;
      acc.saleValue += r.saleValue;
      return acc;
    },
    { qty: 0, costValue: 0, saleValue: 0 }
  );
}

function allItemsStockRows(stockObj, items) {
  return (items || [])
    .map((item) => {
      const qty = Number((stockObj || {})[item.id]) || 0;
      return {
        itemId: item.id,
        item,
        qty,
        costValue: qty * (Number(item.costPrice) || 0),
        saleValue: qty * (Number(item.expectedSalePrice) || 0),
      };
    })
    .sort((a, b) => (a.item?.name || "").localeCompare(b.item?.name || "", "ar"));
}

function addQty(stockObj, itemId, qty) {
  const next = { ...(stockObj || {}) };
  next[itemId] = (Number(next[itemId]) || 0) + (Number(qty) || 0);
  return next;
}

function subQty(stockObj, itemId, qty) {
  const next = { ...(stockObj || {}) };
  const current = Number(next[itemId]) || 0;
  next[itemId] = Math.max(0, current - (Number(qty) || 0));
  return next;
}

function applyDelta(stockObj, itemId, delta) {
  const next = { ...(stockObj || {}) };
  const current = Number(next[itemId]) || 0;
  next[itemId] = Math.max(0, current + (Number(delta) || 0));
  return next;
}

function soldMonthlySeries(soldLog, months) {
  return months.map((mk) => {
    const total = (soldLog || [])
      .filter((s) => monthKey(s.date) === mk)
      .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    return { month: mk, label: monthLabel(mk), الكمية: total };
  });
}

function soldTotalsByItem(soldLog, items, from, to) {
  const filtered = (soldLog || []).filter((s) => (!from || s.date >= from) && (!to || s.date <= to));
  const byItem = {};
  filtered.forEach((s) => {
    byItem[s.itemId] = (byItem[s.itemId] || 0) + (Number(s.quantity) || 0);
  });
  return Object.entries(byItem)
    .map(([itemId, qty]) => ({ itemId, item: itemById(items, itemId), qty }))
    .sort((a, b) => b.qty - a.qty);
}
 
function waLink(phone, text) {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
 
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
 
const REPORT_DOC_STYLE = `
  body { font-family: 'Tajawal','Segoe UI',sans-serif; color: #1E2624; padding: 0; direction: rtl; background: #F4F6F5; }
  .doc-header { background: ${COLORS.primaryDeep}; color: #fff; padding: 22px 28px; }
  .doc-header h1 { font-size: 21px; margin: 0 0 6px; }
  .doc-header .meta { font-size: 13px; color: #CFE0DD; margin: 0; }
  .doc-body { padding: 22px 28px; }
  .chart-card { background: #fff; border: 1px solid #E1E6E3; border-radius: 10px; padding: 16px; margin-bottom: 22px; }
  .chart-card .chart-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #1E2624; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #fff; border-radius: 8px; overflow: hidden; }
  td, th { border: 1px solid #E1E6E3; padding: 9px 12px; font-size: 14px; text-align: right; }
  th { background: #F4F6F5; font-weight: 700; }
  tr.row-sales td:first-child { border-right: 4px solid ${SALES_COLOR}; }
  tr.row-collection td:first-child { border-right: 4px solid ${COLLECTION_COLOR}; }
  tr.row-expense td:first-child { border-right: 4px solid ${EXPENSE_COLOR}; }
  tr.row-net td:first-child { border-right: 4px solid ${PERCENT_COLOR}; }
  tr.row-profit td:first-child { border-right: 4px solid ${PROFIT_COLOR}; }
  .sales { color: ${SALES_COLOR}; font-weight: 700; }
  .collection { color: ${COLLECTION_COLOR}; font-weight: 700; }
  .expense { color: ${EXPENSE_COLOR}; font-weight: 700; }
  .net { font-size: 17px; font-weight: 700; }
  .profit { color: ${PROFIT_COLOR}; font-weight: 700; }
  .hint { margin-top: 10px; font-size: 12px; color: #63716D; border-top: 1px dashed #CBD3CE; padding-top: 12px; }
`;
 
// رسم بياني بسيط بصيغة SVG يُضمَّن مباشرة داخل ملف التقرير (يعمل بدون أي
// مكتبة خارجية، ويظهر بشكل صحيح عند الفتح أو الطباعة أو التحويل إلى PDF).
function svgBarChart(bars, { width = 480, height = 240 } = {}) {
  const ordered = [...bars].reverse(); // لعرض الأعمدة من اليمين لليسار مثل باقي الواجهة
  const chartTop = 34;
  const chartBottom = height - 42;
  const chartHeight = chartBottom - chartTop;
  const max = Math.max(...ordered.map((b) => Math.abs(Number(b.value) || 0)), 1);
  const n = ordered.length;
  const barWidth = Math.min(80, (width - 40) / n - 16);
  const gap = (width - barWidth * n) / (n + 1);
 
  const bars_ = ordered.map((b, i) => {
    const val = Number(b.value) || 0;
    const barH = Math.max(3, (Math.abs(val) / max) * chartHeight);
    const x = gap + i * (barWidth + gap);
    const y = chartBottom - barH;
    const labelText = b.display !== undefined ? b.display : fmt(val);
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${b.color}" />
      <text x="${x + barWidth / 2}" y="${y - 8}" font-size="13" font-weight="700" fill="${b.color}" text-anchor="middle" font-family="Tajawal, Segoe UI, sans-serif">${labelText}</text>
      <text x="${x + barWidth / 2}" y="${chartBottom + 20}" font-size="12" fill="#1E2624" text-anchor="middle" font-family="Tajawal, Segoe UI, sans-serif">${b.label}</text>
    `;
  }).join("");
 
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="${chartBottom}" x2="${width}" y2="${chartBottom}" stroke="#E1E6E3" stroke-width="1" />
    ${bars_}
  </svg>`;
}
 
function chartCard(title, svg) {
  return `<div class="chart-card"><div class="chart-title">${title}</div>${svg}</div>`;
}
 
// تنزيل التقرير كملف قابل للفتح والطباعة مباشرة — هذا الأسلوب يعتمد على
// تنزيل ملف فعليًا (وليس فتح نافذة أو استدعاء نافذة طباعة)، لذلك يعمل بشكل
// موثوق داخل أي متصفح أو بيئة تمنع النوافذ المنبثقة. بعد فتح الملف، الضغط
// على Ctrl+P واختيار "Save as PDF" يحفظه بصيغة PDF مباشرة.
function downloadReportFile(filename, title, headerMeta, bodyHtml) {
  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8" /><title>${title}</title><style>${REPORT_DOC_STYLE}</style></head>
<body>
<div class="doc-header"><h1>${title}</h1><p class="meta">${headerMeta || ""}</p></div>
<div class="doc-body">
${bodyHtml}
<div class="hint">لحفظ هذا التقرير بصيغة PDF: اضغط Ctrl+P (أو Cmd+P) ثم اختر "Save as PDF" / "حفظ كـ PDF".</div>
</div>
</body>
</html>`;
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
 
// تنزيل أي كائن بيانات كملف JSON — يُستخدم للنسخ الاحتياطي والاستيراد لاحقًا.
function downloadJsonFile(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
 
function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error("invalid json"));
      }
    };
    reader.readAsText(file);
  });
}
 
// ---------- Login ----------
function Login({ reps, onLogin, loading, adminPassword, verifyRepLogin, adminMembers, verifyAdminMemberLogin }) {
  const [mode, setMode] = useState(null);
  const [adminSubMode, setAdminSubMode] = useState(null);
  const [repId, setRepId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [memberPass, setMemberPass] = useState("");
  const [repPass, setRepPass] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
 
  const tryAdminLogin = () => {
    if (adminPass === adminPassword) {
      setError("");
      onLogin({ role: "admin", isMaster: true });
    } else {
      setError("كلمة المرور غير صحيحة.");
    }
  };
 
  const tryMemberLogin = () => {
    if (!memberId) { setError("اختر اسمك أولًا."); return; }
    if (verifyAdminMemberLogin(memberId, memberPass)) {
      setError("");
      onLogin({ role: "admin", isMaster: false, memberId });
    } else {
      setError("كلمة المرور غير صحيحة.");
    }
  };
 
  const tryRepLogin = () => {
    if (!repId) { setError("اختر اسمك أولًا."); return; }
    if (verifyRepLogin(repId, repPass)) {
      setError("");
      onLogin({ role: "rep", repId });
    } else {
      setError("كلمة المرور غير صحيحة.");
    }
  };
 
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Tajawal','Segoe UI',sans-serif",
        padding: 20,
      }}
    >
      <div style={{ width: 420, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.primaryDeep }}>متابعة المبيعات والتحصيل</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 4 }}>سجّل الدخول لعرض بياناتك</div>
        </div>
        <Card>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: COLORS.muted }}>جارِ التحميل...</div>
          ) : !mode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn kind="primary" onClick={() => { setMode("admin"); setAdminSubMode(null); setError(""); }} style={{ justifyContent: "center", padding: "12px" }}>
                <Lock size={16} /> دخول كإدارة
              </Btn>
              <Btn kind="ghost" onClick={() => { setMode("rep"); setError(""); }} style={{ justifyContent: "center", padding: "12px" }}>
                <Lock size={16} /> دخول كمندوب مبيعات
              </Btn>
            </div>
          ) : mode === "admin" && !adminSubMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn kind="accent" onClick={() => { setAdminSubMode("master"); setError(""); }} style={{ justifyContent: "center", padding: "12px" }}>
                الحساب الرئيسي للإدارة
              </Btn>
              <Btn kind="ghost" onClick={() => { setAdminSubMode("member"); setError(""); }} style={{ justifyContent: "center", padding: "12px" }}>
                عضو من فريق الإدارة
              </Btn>
              <Btn kind="ghost" onClick={() => setMode(null)} style={{ width: "100%", justifyContent: "center" }}>
                رجوع
              </Btn>
            </div>
          ) : mode === "admin" && adminSubMode === "master" ? (
            <div>
              <Field label="كلمة مرور الإدارة">
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    style={inputStyle}
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && tryAdminLogin()}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", left: 8, top: 8, border: "none", background: "transparent", color: COLORS.muted, cursor: "pointer" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {error && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
              <Btn kind="accent" onClick={tryAdminLogin} style={{ width: "100%", justifyContent: "center" }}>
                دخول لوحة الإدارة
              </Btn>
              <div style={{ marginTop: 10 }}>
                <Btn kind="ghost" onClick={() => { setAdminSubMode(null); setError(""); }} style={{ width: "100%", justifyContent: "center" }}>
                  رجوع
                </Btn>
              </div>
            </div>
          ) : mode === "admin" && adminSubMode === "member" ? (
            <div>
              {adminMembers.length === 0 ? (
                <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "10px 0" }}>
                  لا توجد حسابات أعضاء إدارة بعد. يجب على الحساب الرئيسي إنشاء حسابك أولًا من "أعضاء الإدارة".
                </div>
              ) : (
                <>
                  <Field label="اختر اسمك">
                    <select style={inputStyle} value={memberId} onChange={(e) => { setMemberId(e.target.value); setError(""); }}>
                      <option value="">— اختر —</option>
                      {adminMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </Field>
                  {memberId && (
                    <>
                      <Field label="كلمة المرور">
                        <input
                          type="password"
                          style={inputStyle}
                          value={memberPass}
                          onChange={(e) => setMemberPass(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && tryMemberLogin()}
                          autoFocus
                        />
                      </Field>
                      {error && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
                      <Btn kind="accent" onClick={tryMemberLogin} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
                        دخول
                      </Btn>
                    </>
                  )}
                </>
              )}
              <Btn kind="ghost" onClick={() => { setAdminSubMode(null); setError(""); }} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
                رجوع
              </Btn>
            </div>
          ) : (
            <div>
              {reps.length === 0 ? (
                <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "10px 0" }}>
                  لا توجد حسابات مناديب بعد. يجب على الإدارة إنشاء حسابك أولًا من "إدارة المناديب".
                </div>
              ) : (
                <>
                  <Field label="اختر اسمك">
                    <select style={inputStyle} value={repId} onChange={(e) => { setRepId(e.target.value); setError(""); }}>
                      <option value="">— اختر —</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </Field>
                  {repId && (
                    <>
                      <Field label="كلمة المرور">
                        <input
                          type="password"
                          style={inputStyle}
                          value={repPass}
                          onChange={(e) => setRepPass(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && tryRepLogin()}
                          autoFocus
                        />
                      </Field>
                      {error && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
                      <Btn kind="accent" onClick={tryRepLogin} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
                        دخول
                      </Btn>
                    </>
                  )}
                </>
              )}
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: "center" }}>
                إنشاء حسابات المناديب وكلمات المرور من صلاحية الإدارة فقط.
              </div>
              <Btn kind="ghost" onClick={() => { setMode(null); setError(""); }} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
                رجوع
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
 
// ---------- Shell ----------
const RESPONSIVE_CSS = `
  @media (max-width: 760px) {
    .app-shell { flex-direction: column !important; }
    .app-sidebar {
      width: 100% !important;
      flex-direction: row !important;
      align-items: center !important;
      padding: 10px 12px !important;
      gap: 10px !important;
      box-sizing: border-box !important;
    }
    .app-sidebar .sidebar-titles { display: none !important; }
    .app-sidebar .nav-list {
      flex-direction: row !important;
      flex: 1 1 auto !important;
      gap: 6px !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }
    .app-sidebar .nav-list button {
      white-space: nowrap !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      flex-shrink: 0 !important;
    }
    .app-sidebar .logout-btn {
      flex-shrink: 0 !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      white-space: nowrap !important;
    }
    .app-sidebar .sidebar-backup {
      flex-shrink: 0 !important;
      margin-bottom: 0 !important;
    }
    .app-sidebar .sidebar-backup .backup-buttons-row {
      flex-direction: row !important;
      gap: 6px !important;
    }
    .app-sidebar .sidebar-backup .backup-btn {
      width: auto !important;
      padding: 8px !important;
    }
    .app-sidebar .sidebar-backup .backup-btn-label { display: none !important; }
    .app-main { padding: 14px !important; }
    .app-main h2 { font-size: 16px !important; margin-bottom: 12px !important; }
  }
  @media (max-width: 480px) {
    .stack-mobile { flex-direction: column !important; }
    .stack-mobile > * { width: 100% !important; min-width: 0 !important; }
  }
`;
 
function GlobalStyles() {
  return <style>{RESPONSIVE_CSS}</style>;
}
 
function BackupControls({ onExport, onImport }) {
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
 
  const handleChoose = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    setPendingFile(file);
  };
 
  const confirmImport = async () => {
    if (!pendingFile) return;
    setBusy(true);
    try {
      await onImport(pendingFile);
      setMsg("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch {
      setMsg("تعذّر استيراد الملف — تأكد أنه ملف نسخة احتياطية صحيح صادر من هذا البرنامج.");
    }
    setBusy(false);
    setPendingFile(null);
  };
 
  const btnStyle = {
    display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)",
    color: "#E7ECEA", border: `1px solid rgba(255,255,255,0.18)`, borderRadius: 8,
    padding: "9px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", width: "100%",
  };
 
  return (
    <div className="sidebar-backup" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      <div className="backup-buttons-row" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {onExport && (
          <button className="backup-btn" onClick={onExport} title="تنزيل نسخة احتياطية" style={btnStyle}>
            <Download size={15} /> <span className="backup-btn-label">تنزيل نسخة احتياطية</span>
          </button>
        )}
        {onImport && (
          <button className="backup-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()} title="استيراد نسخة احتياطية" style={btnStyle}>
            <Upload size={15} /> <span className="backup-btn-label">استيراد نسخة احتياطية</span>
          </button>
        )}
      </div>
      {onImport && (
        <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleChoose} />
      )}
      {pendingFile && (
        <div style={{ background: "rgba(183,69,63,0.2)", border: "1px solid rgba(183,69,63,0.5)", borderRadius: 8, padding: 8, fontSize: 11, color: "#fff" }}>
          سيتم استبدال البيانات الحالية بمحتوى الملف "{pendingFile.name}". هذا الإجراء لا يمكن التراجع عنه.
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={confirmImport} disabled={busy} style={{ flex: 1, background: COLORS.accent, color: "#3A2A0C", border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 11, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
              {busy ? "جارِ الاستيراد..." : "تأكيد الاستيراد"}
            </button>
            <button onClick={() => setPendingFile(null)} disabled={busy} style={{ flex: 1, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "6px 8px", fontSize: 11, cursor: "pointer" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}
      {msg && <div style={{ fontSize: 11, color: msg.includes("بنجاح") ? "#8FE3B8" : "#F3B3AF" }}>{msg}</div>}
    </div>
  );
}
 
function Shell({ title, navItems, active, onNav, onLogout, children, onBackupExport, onBackupImport }) {
  return (
    <div dir="rtl" className="app-shell" style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Tajawal','Segoe UI',sans-serif", display: "flex" }}>
      <GlobalStyles />
      <aside className="app-sidebar" style={{ width: 220, background: COLORS.primaryDeep, color: "#fff", display: "flex", flexDirection: "column", padding: "20px 14px", boxSizing: "border-box", flexShrink: 0 }}>
        <div className="sidebar-titles">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 24 }}>متابعة المبيعات والتحصيل</div>
        </div>
        <div className="nav-list" style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => onNav(n.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: active === n.key ? "rgba(198,146,61,0.18)" : "transparent",
                color: active === n.key ? COLORS.accent : "#E7ECEA",
                border: "none", borderRadius: 8, padding: "10px 12px",
                fontSize: 14, cursor: "pointer", textAlign: "right", fontFamily: "inherit",
              }}
            >
              <n.icon size={17} /> {n.label}
            </button>
          ))}
        </div>
        {(onBackupExport || onBackupImport) && (
          <BackupControls onExport={onBackupExport} onImport={onBackupImport} />
        )}
        <button
          className="logout-btn"
          onClick={onLogout}
          title="تسجيل الخروج"
          style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", color: "#E7ECEA", border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 8, padding: "10px 12px", fontSize: 14, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </aside>
      <main className="app-main" style={{ flex: 1, padding: "26px 30px", boxSizing: "border-box", minWidth: 0 }}>{children}</main>
    </div>
  );
}
 
// ================= ADMIN =================
function AdminApp({ reps, repDataMap, setReps, updateRepData, onLogout, adminPassword, setAdminPassword, adminWhatsApp, setAdminWhatsApp, adminWhatsAppGroup, setAdminWhatsAppGroup, isMaster, adminMembers, setAdminMembers, memberName, onBackupExport, onBackupImport, items, setItems, factoryWarehouses, setFactoryWarehouses, factoryStock, setFactoryStock }) {
  const [tab, setTab] = useState("dashboard");
  const nav = [
    { key: "dashboard", label: "لوحة المعلومات", icon: Gauge },
    { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { key: "reps", label: "إدارة المناديب", icon: Users },
    { key: "customers", label: "إدارة العملاء", icon: Store },
    { key: "reports", label: "تقارير المناديب", icon: FileText },
    { key: "goals", label: "الأهداف", icon: Target },
    { key: "finance", label: "الالتزامات والمصروفات", icon: Wallet },
    { key: "inventory", label: "المخازن", icon: Warehouse },
    { key: "charts", label: "الرسوم البيانية", icon: BarChart3 },
    { key: "reportsHub", label: "التقارير", icon: FileText },
    { key: "settings", label: "الإعدادات وواتساب", icon: KeyRound },
    ...(isMaster ? [{ key: "members", label: "أعضاء الإدارة", icon: UserCog }] : []),
  ];
 
  return (
    <Shell title={isMaster ? "لوحة الإدارة" : `لوحة الإدارة — ${memberName || "عضو"}`} navItems={nav} active={tab} onNav={setTab} onLogout={onLogout} onBackupExport={onBackupExport} onBackupImport={onBackupImport}>
      {tab === "dashboard" && <AdminDashboard reps={reps} repDataMap={repDataMap} />}
      {tab === "overview" && <AdminOverview reps={reps} repDataMap={repDataMap} />}
      {tab === "reps" && <AdminReps reps={reps} setReps={setReps} />}
      {tab === "customers" && <AdminCustomers reps={reps} repDataMap={repDataMap} updateRepData={updateRepData} />}
      {tab === "reports" && <AdminReports reps={reps} repDataMap={repDataMap} updateRepData={updateRepData} />}
      {tab === "goals" && <AdminGoals reps={reps} repDataMap={repDataMap} updateRepData={updateRepData} />}
      {tab === "finance" && <AdminFinance reps={reps} repDataMap={repDataMap} updateRepData={updateRepData} />}
      {tab === "inventory" && (
        <AdminInventory
          items={items}
          setItems={setItems}
          factoryWarehouses={factoryWarehouses}
          setFactoryWarehouses={setFactoryWarehouses}
          factoryStock={factoryStock}
          setFactoryStock={setFactoryStock}
          reps={reps}
          repDataMap={repDataMap}
          updateRepData={updateRepData}
          adminWhatsAppGroup={adminWhatsAppGroup}
        />
      )}
      {tab === "charts" && <AdminCharts reps={reps} repDataMap={repDataMap} />}
      {tab === "reportsHub" && <AdminReportsHub reps={reps} repDataMap={repDataMap} adminWhatsAppGroup={adminWhatsAppGroup} />}
      {tab === "settings" && (
        <AdminSettings
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
          adminWhatsApp={adminWhatsApp}
          setAdminWhatsApp={setAdminWhatsApp}
          adminWhatsAppGroup={adminWhatsAppGroup}
          setAdminWhatsAppGroup={setAdminWhatsAppGroup}
        />
      )}
      {tab === "members" && isMaster && <AdminMembers members={adminMembers} setMembers={setAdminMembers} />}
    </Shell>
  );
}
 
function AdminSettings({ adminPassword, setAdminPassword, adminWhatsApp, setAdminWhatsApp, adminWhatsAppGroup, setAdminWhatsAppGroup }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [msg, setMsg] = useState("");
  const [waNumber, setWaNumber] = useState(adminWhatsApp || "");
  const [waGroup, setWaGroup] = useState(adminWhatsAppGroup || "");
  const [waMsg, setWaMsg] = useState("");
 
  const save = () => {
    if (current !== adminPassword) { setMsg("كلمة المرور الحالية غير صحيحة."); return; }
    if (next.length < 4) { setMsg("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل."); return; }
    if (next !== next2) { setMsg("كلمتا المرور الجديدتان غير متطابقتين."); return; }
    setAdminPassword(next);
    setCurrent(""); setNext(""); setNext2("");
    setMsg("تم تغيير كلمة المرور بنجاح.");
  };
 
  const saveWhatsapp = () => { setAdminWhatsApp(waNumber.trim()); setAdminWhatsAppGroup(waGroup.trim()); };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>الإعدادات وواتساب</h2>
 
      <Card style={{ maxWidth: 420, marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>كلمة مرور الإدارة</div>
        <Field label="كلمة المرور الحالية"><input type="password" style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="كلمة المرور الجديدة"><input type="password" style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="تأكيد كلمة المرور الجديدة"><input type="password" style={inputStyle} value={next2} onChange={(e) => setNext2(e.target.value)} /></Field>
        {msg && <div style={{ fontSize: 13, color: msg.includes("بنجاح") ? COLORS.success : COLORS.danger, marginBottom: 10 }}>{msg}</div>}
        <Btn kind="accent" onClick={save}>حفظ كلمة المرور</Btn>
      </Card>
 
      <Card style={{ maxWidth: 420, marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>واتساب التقارير</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>
          رابط قروب واتساب التقارير هو ما يستخدمه المندوب لإرسال تقريره اليومي مباشرة. رقم الجوال احتياطي يُستخدم إذا لم يتوفر رابط القروب.
        </div>
        <Field label="رابط قروب واتساب التقارير">
          <input style={inputStyle} value={waGroup} onChange={(e) => setWaGroup(e.target.value)} placeholder="https://chat.whatsapp.com/xxxxxxxx" />
        </Field>
        <Field label="رقم واتساب احتياطي (بدون + أو أصفار)">
          <input style={inputStyle} value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="مثال: 9665xxxxxxxx" />
        </Field>
        <Btn kind="accent" onClick={saveWhatsapp}>حفظ إعدادات واتساب</Btn>
      </Card>
 
      <Card style={{ maxWidth: 480 }}>
        <Field label="نص رسالة حرة لإرسالها">
          <textarea style={{ ...inputStyle, minHeight: 90 }} value={waMsg} onChange={(e) => setWaMsg(e.target.value)} placeholder="اكتب أي رسالة تريد إرسالها للقروب أو لجهة اتصال أخرى" />
        </Field>
        <WhatsAppShareBox
          label="إرسال أي شيء عبر واتساب"
          text={waMsg}
          groupLink={adminWhatsAppGroup}
        />
      </Card>
    </div>
  );
}
 
function AdminDashboard({ reps, repDataMap }) {
  const cm = currentMonth();
 
  const perRep = useMemo(() => reps.map((r) => {
    const data = repDataMap[r.id] || emptyRepData();
    const month = sumReports(data.reports, cm);
    const whole = sumReports(data.reports, null);
    return { name: r.name, مبيعات: Math.round(month.sales), تحصيل: Math.round(month.collection), wholeSales: whole.sales, wholeCollection: whole.collection };
  }), [reps, repDataMap, cm]);
 
  const totals = useMemo(() => {
    let monthSales = 0, monthCollection = 0, wholeSales = 0, wholeCollection = 0, fixed = 0, variable = 0, customers = 0;
    reps.forEach((r) => {
      const data = repDataMap[r.id] || emptyRepData();
      const month = sumReports(data.reports, cm);
      const whole = sumReports(data.reports, null);
      const f = financeTotals(data.commitments, data.expenses, cm);
      monthSales += month.sales; monthCollection += month.collection;
      wholeSales += whole.sales; wholeCollection += whole.collection;
      fixed += f.fixed; variable += f.variable;
      customers += (data.customers || []).length;
    });
    return { monthSales, monthCollection, wholeSales, wholeCollection, fixed, variable, customers };
  }, [reps, repDataMap, cm]);
 
  const monthPct = totals.monthSales ? (totals.monthCollection / totals.monthSales) * 100 : 0;
  const netCash = totals.monthCollection - (totals.fixed + totals.variable);
 
  const sectorCounts = useMemo(() => {
    const counts = {};
    reps.forEach((r) => {
      const data = repDataMap[r.id] || emptyRepData();
      (data.customers || []).forEach((c) => { counts[c.sector] = (counts[c.sector] || 0) + 1; });
    });
    return SECTORS.map((s) => ({ sector: s.replace("قطاع ", ""), count: counts[s] || 0 }));
  }, [reps, repDataMap]);
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>لوحة المعلومات — {monthLabel(cm)}</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatBox label="عدد المناديب" value={reps.length} />
        <StatBox label="إجمالي العملاء المسجّلين" value={totals.customers} />
        <StatBox label="مبيعات الشهر (كل المناديب)" value={fmt(totals.monthSales)} color={SALES_COLOR} />
        <StatBox label="تحصيل الشهر (كل المناديب)" value={fmt(totals.monthCollection)} color={COLLECTION_COLOR} />
        <StatBox label="نسبة التحصيل من المبيعات" value={pct(monthPct)} color={PERCENT_COLOR} />
        <StatBox label="صافي النقد بعد المصروفات (الشهر)" value={fmt(netCash)} color={netCash >= 0 ? COLLECTION_COLOR : EXPENSE_COLOR} />
      </div>
 
      {reps.length === 0 ? (
        <Card>لا يوجد مناديب بعد. أضِف مندوبًا من "إدارة المناديب" لتظهر الإحصائيات هنا.</Card>
      ) : (
        <>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>مبيعات وتحصيل الشهر لكل مندوب</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perRep} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="مبيعات" fill={SALES_COLOR} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="مبيعات" position="top" formatter={(v) => fmt(v)} style={{ fill: SALES_COLOR, fontWeight: 700, fontSize: 11 }} />
                </Bar>
                <Bar dataKey="تحصيل" fill={COLLECTION_COLOR} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="تحصيل" position="top" formatter={(v) => fmt(v)} style={{ fill: COLLECTION_COLOR, fontWeight: 700, fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
 
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>عدد العملاء حسب القطاع (كل المناديب)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorCounts} margin={{ top: 20, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="sector" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="عدد العملاء" fill={COLORS.primary} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fill: COLORS.primary, fontWeight: 700, fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
 
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>ملخص كامل الفترة (كل المناديب)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 4px" }}>إجمالي المبيعات (كل الفترة)</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: SALES_COLOR }}>{fmt(totals.wholeSales)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 4px" }}>إجمالي التحصيل (كل الفترة)</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: COLLECTION_COLOR }}>{fmt(totals.wholeCollection)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
 
function AdminMembers({ members, setMembers }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [resetId, setResetId] = useState(null);
  const [resetPass, setResetPass] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [err, setErr] = useState("");
 
  const add = () => {
    if (!name.trim()) { setErr("أدخل الاسم."); return; }
    if (pass.length < 4) { setErr("كلمة المرور يجب أن تكون 4 أحرف على الأقل."); return; }
    setErr("");
    setMembers([...members, { id: uid(), name: name.trim(), password: pass }]);
    setName(""); setPass("");
  };
  const remove = (id) => setMembers(members.filter((m) => m.id !== id));
  const saveReset = (id) => {
    if (resetPass.length < 4) { setErr("كلمة المرور يجب أن تكون 4 أحرف على الأقل."); return; }
    setErr("");
    setMembers(members.map((m) => (m.id === id ? { ...m, password: resetPass } : m)));
    setResetId(null); setResetPass("");
  };
  const startEditName = (m) => { setEditId(m.id); setEditName(m.name); };
  const saveEditName = (id) => {
    if (!editName.trim()) { setErr("الاسم لا يمكن أن يكون فارغًا."); return; }
    setErr("");
    setMembers(members.map((m) => (m.id === id ? { ...m, name: editName.trim() } : m)));
    setEditId(null);
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>أعضاء الإدارة</h2>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>
        الأعضاء الذين تضيفهم هنا يحصلون على كامل صلاحيات الإدارة، بحساب مستقل وكلمة مرور خاصة لكل عضو — باستثناء إدارة الأعضاء نفسها، فهي حصرية للحساب الرئيسي فقط.
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Field label="اسم العضو">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="كلمة المرور">
              <input type="password" style={inputStyle} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="4 أحرف على الأقل" />
            </Field>
          </div>
          <Btn kind="accent" onClick={add} style={{ marginBottom: 12 }}><Plus size={16} /> إضافة</Btn>
        </div>
        {err && <div style={{ color: COLORS.danger, fontSize: 13 }}>{err}</div>}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {members.map((m) => (
          <Card key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              {editId === m.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input style={{ ...inputStyle, width: 160 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Btn kind="accent" onClick={() => saveEditName(m.id)} style={{ padding: "6px 10px" }}>حفظ</Btn>
                  <Btn kind="ghost" onClick={() => setEditId(null)} style={{ padding: "6px 10px" }}>إلغاء</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <button onClick={() => startEditName(m)} style={{ border: "none", background: "transparent", color: COLORS.primary, cursor: "pointer" }}><Pencil size={13} /></button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn kind="ghost" onClick={() => { setResetId(resetId === m.id ? null : m.id); setResetPass(""); setErr(""); }}>
                  <KeyRound size={15} /> إعادة تعيين كلمة المرور
                </Btn>
                <Btn kind="danger" onClick={() => remove(m.id)}><Trash2 size={15} /> حذف</Btn>
              </div>
            </div>
            {resetId === m.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <input type="password" style={inputStyle} placeholder="كلمة المرور الجديدة" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
                </div>
                <Btn kind="accent" onClick={() => saveReset(m.id)}>حفظ</Btn>
              </div>
            )}
          </Card>
        ))}
        {members.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا يوجد أعضاء إدارة بعد.</div>}
      </div>
    </div>
  );
}
 
function AdminOverview({ reps, repDataMap }) {
  const cm = currentMonth();
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>نظرة عامة — {monthLabel(cm)}</h2>
      {reps.length === 0 && <Card>لا يوجد مناديب بعد. أضِف مندوبًا من "إدارة المناديب".</Card>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {reps.map((r) => {
          const data = repDataMap[r.id] || emptyRepData();
          const monthTotals = sumReports(data.reports, cm);
          const goal = goalForMonth(data.goals, cm);
          const salesPct = goal && goal.salesTarget ? (monthTotals.sales / goal.salesTarget) * 100 : null;
          const collTargetAmount = goal ? (monthTotals.sales * (goal.collectionPercentTarget || 0)) / 100 : null;
          const collPct = collTargetAmount ? (monthTotals.collection / collTargetAmount) * 100 : null;
          return (
            <Card key={r.id} accent={COLORS.primary}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>يعمل منذ {r.startDate}</div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatBox label="مبيعات الشهر" value={fmt(monthTotals.sales)} sub={goal ? `الهدف: ${fmt(goal.salesTarget)}` : "لا يوجد هدف"} color={SALES_COLOR} />
                <StatBox label="تحصيل الشهر" value={fmt(monthTotals.collection)} sub={goal ? `نسبة الهدف: ${pct(goal.collectionPercentTarget)}` : "—"} color={COLLECTION_COLOR} />
                <StatBox label="تحقيق هدف المبيعات" value={salesPct !== null ? pct(salesPct) : "—"} color={salesPct >= 100 ? COLORS.success : COLORS.accent} />
                <StatBox label="تحقيق هدف التحصيل" value={collPct !== null ? pct(collPct) : "—"} color={collPct >= 100 ? COLORS.success : COLORS.danger} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
 
function fileToResizedDataUrl(file, maxSize = 200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image load failed"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
 
function Avatar({ src, name, size = 44 }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${COLORS.border2}` }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: COLORS.primary, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4,
    }}>
      {(name || "؟").trim().charAt(0)}
    </div>
  );
}
 
function AdminReps({ reps, setReps }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [pass, setPass] = useState("");
  const [resetId, setResetId] = useState(null);
  const [resetPass, setResetPass] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [err, setErr] = useState("");
 
  const add = () => {
    if (!name.trim()) { setErr("أدخل الاسم."); return; }
    if (pass.length < 4) { setErr("كلمة المرور يجب أن تكون 4 أحرف على الأقل."); return; }
    setErr("");
    setReps([...reps, { id: uid(), name: name.trim(), startDate: date, password: pass, photo: null }]);
    setName(""); setPass("");
  };
  const remove = (id) => setReps(reps.filter((r) => r.id !== id));
 
  const saveReset = (id) => {
    if (resetPass.length < 4) { setErr("كلمة المرور يجب أن تكون 4 أحرف على الأقل."); return; }
    setErr("");
    setReps(reps.map((r) => (r.id === id ? { ...r, password: resetPass } : r)));
    setResetId(null); setResetPass("");
  };
 
  const startEditName = (r) => { setEditId(r.id); setEditName(r.name); };
  const saveEditName = (id) => {
    if (!editName.trim()) { setErr("الاسم لا يمكن أن يكون فارغًا."); return; }
    setErr("");
    setReps(reps.map((r) => (r.id === id ? { ...r, name: editName.trim() } : r)));
    setEditId(null);
  };
 
  const uploadPhoto = async (id, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setReps(reps.map((r) => (r.id === id ? { ...r, photo: dataUrl } : r)));
    } catch {
      setErr("تعذّر تحميل الصورة، جرّب صورة أخرى.");
    }
  };
  const removePhoto = (id) => setReps(reps.map((r) => (r.id === id ? { ...r, photo: null } : r)));
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>إدارة المناديب</h2>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Field label="اسم المندوب">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Field label="تاريخ بدء العمل">
              <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="كلمة المرور">
              <input type="password" style={inputStyle} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="4 أحرف على الأقل" />
            </Field>
          </div>
          <Btn kind="accent" onClick={add} style={{ marginBottom: 12 }}><Plus size={16} /> إضافة</Btn>
        </div>
        {err && <div style={{ color: COLORS.danger, fontSize: 13 }}>{err}</div>}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reps.map((r) => (
          <Card key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <Avatar src={r.photo} name={r.name} size={48} />
                  <label style={{
                    position: "absolute", bottom: -4, left: -4, background: COLORS.primary, color: "#fff",
                    borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 11,
                  }} title="تغيير الصورة">
                    <Pencil size={11} />
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => uploadPhoto(r.id, e.target.files[0])} />
                  </label>
                </div>
                <div>
                  {editId === r.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input style={{ ...inputStyle, width: 160 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <Btn kind="accent" onClick={() => saveEditName(r.id)} style={{ padding: "6px 10px" }}>حفظ</Btn>
                      <Btn kind="ghost" onClick={() => setEditId(null)} style={{ padding: "6px 10px" }}>إلغاء</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <button onClick={() => startEditName(r)} style={{ border: "none", background: "transparent", color: COLORS.primary, cursor: "pointer" }}><Pencil size={13} /></button>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: COLORS.muted }}>بدأ العمل: {r.startDate}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.photo && <Btn kind="ghost" onClick={() => removePhoto(r.id)}>حذف الصورة</Btn>}
                <Btn kind="ghost" onClick={() => { setResetId(resetId === r.id ? null : r.id); setResetPass(""); setErr(""); }}>
                  <KeyRound size={15} /> إعادة تعيين كلمة المرور
                </Btn>
                <Btn kind="danger" onClick={() => remove(r.id)}><Trash2 size={15} /> حذف</Btn>
              </div>
            </div>
            {resetId === r.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <input type="password" style={inputStyle} placeholder="كلمة المرور الجديدة" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
                </div>
                <Btn kind="accent" onClick={() => saveReset(r.id)}>حفظ</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
 
function AdminReports({ reps, repDataMap, updateRepData }) {
  const [repId, setRepId] = useState(reps[0]?.id || "");
  useEffect(() => { if (!repId && reps[0]) setRepId(reps[0].id); }, [reps]);
  const data = repDataMap[repId] || emptyRepData();
 
  const [date, setDate] = useState(todayStr());
  const [sales, setSales] = useState("");
  const [cash, setCash] = useState("");
  const [transfer, setTransfer] = useState("");
  const [network, setNetwork] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editRow, setEditRow] = useState(null);
 
  const sortedReports = useMemo(
    () => data.reports.map((r, i) => ({ ...r, _i: i })).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.reports]
  );
 
  const add = () => {
    if (!repId || !date) return;
    const reports = [...data.reports, {
      date,
      sales: Number(sales) || 0,
      cash: Number(cash) || 0,
      transfer: Number(transfer) || 0,
      network: Number(network) || 0,
    }];
    updateRepData(repId, { ...data, reports });
    setSales(""); setCash(""); setTransfer(""); setNetwork("");
  };
 
  const startEdit = (row) => { setEditIndex(row._i); setEditRow({ ...row }); };
  const saveEdit = () => {
    const reports = data.reports.map((r, i) => (i === editIndex ? {
      date: editRow.date, sales: Number(editRow.sales) || 0,
      cash: Number(editRow.cash) || 0, transfer: Number(editRow.transfer) || 0, network: Number(editRow.network) || 0,
    } : r));
    updateRepData(repId, { ...data, reports });
    setEditIndex(null); setEditRow(null);
  };
  const removeReport = (i) => {
    const reports = data.reports.filter((_, idx) => idx !== i);
    updateRepData(repId, { ...data, reports });
    if (editIndex === i) { setEditIndex(null); setEditRow(null); }
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>تقارير المناديب</h2>
      <Card style={{ marginBottom: 18, maxWidth: 300 }}>
        <Field label="المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </Card>
 
      {repId && (
        <>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>إضافة تقرير (يمكن اختيار أي تاريخ)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ minWidth: 140 }}><Field label="التاريخ"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
              <div style={{ minWidth: 100 }}><Field label="المبيعات"><input type="number" style={inputStyle} value={sales} onChange={(e) => setSales(e.target.value)} /></Field></div>
              <div style={{ minWidth: 100 }}><Field label="نقدي"><input type="number" style={inputStyle} value={cash} onChange={(e) => setCash(e.target.value)} /></Field></div>
              <div style={{ minWidth: 100 }}><Field label="حوالة"><input type="number" style={inputStyle} value={transfer} onChange={(e) => setTransfer(e.target.value)} /></Field></div>
              <div style={{ minWidth: 100 }}><Field label="شبكة"><input type="number" style={inputStyle} value={network} onChange={(e) => setNetwork(e.target.value)} /></Field></div>
              <Btn kind="accent" onClick={add} style={{ marginBottom: 12 }}><Plus size={16} /> إضافة</Btn>
            </div>
          </Card>
 
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>كل التقارير</div>
            <div style={{ maxHeight: 420, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                    <th style={{ padding: "6px 4px" }}>التاريخ</th>
                    <th style={{ padding: "6px 4px" }}>المبيعات</th>
                    <th style={{ padding: "6px 4px" }}>نقدي</th>
                    <th style={{ padding: "6px 4px" }}>حوالة</th>
                    <th style={{ padding: "6px 4px" }}>شبكة</th>
                    <th style={{ padding: "6px 4px" }}>الإجمالي</th>
                    <th style={{ padding: "6px 4px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReports.map((r) => (
                    <tr key={r._i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      {editIndex === r._i ? (
                        <>
                          <td style={{ padding: 4 }}><input type="date" style={{ ...inputStyle, padding: "4px 6px" }} value={editRow.date} onChange={(e) => setEditRow({ ...editRow, date: e.target.value })} /></td>
                          <td style={{ padding: 4 }}><input type="number" style={{ ...inputStyle, padding: "4px 6px", width: 80 }} value={editRow.sales} onChange={(e) => setEditRow({ ...editRow, sales: e.target.value })} /></td>
                          <td style={{ padding: 4 }}><input type="number" style={{ ...inputStyle, padding: "4px 6px", width: 80 }} value={editRow.cash} onChange={(e) => setEditRow({ ...editRow, cash: e.target.value })} /></td>
                          <td style={{ padding: 4 }}><input type="number" style={{ ...inputStyle, padding: "4px 6px", width: 80 }} value={editRow.transfer} onChange={(e) => setEditRow({ ...editRow, transfer: e.target.value })} /></td>
                          <td style={{ padding: 4 }}><input type="number" style={{ ...inputStyle, padding: "4px 6px", width: 80 }} value={editRow.network} onChange={(e) => setEditRow({ ...editRow, network: e.target.value })} /></td>
                          <td style={{ padding: 4 }}>{fmt(reportCollection(editRow))}</td>
                          <td style={{ padding: 4, display: "flex", gap: 4 }}>
                            <Btn kind="accent" onClick={saveEdit} style={{ padding: "4px 10px" }}>حفظ</Btn>
                            <Btn kind="ghost" onClick={() => { setEditIndex(null); setEditRow(null); }} style={{ padding: "4px 10px" }}>إلغاء</Btn>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "6px 4px" }}>{r.date}</td>
                          <td style={{ padding: "6px 4px" }}>{fmt(r.sales)}</td>
                          <td style={{ padding: "6px 4px" }}>{fmt(r.cash)}</td>
                          <td style={{ padding: "6px 4px" }}>{fmt(r.transfer)}</td>
                          <td style={{ padding: "6px 4px" }}>{fmt(r.network)}</td>
                          <td style={{ padding: "6px 4px", fontWeight: 600 }}>{fmt(reportCollection(r))}</td>
                          <td style={{ padding: "6px 4px", display: "flex", gap: 4 }}>
                            <button onClick={() => startEdit(r)} style={{ border: "none", background: "transparent", color: COLORS.primary, cursor: "pointer" }}><Pencil size={14} /></button>
                            <button onClick={() => removeReport(r._i)} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer" }}><Trash2 size={14} /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {sortedReports.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 12, color: COLORS.muted, textAlign: "center" }}>لا توجد تقارير بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
 
function AdminFinance({ reps, repDataMap, updateRepData }) {
  const [repId, setRepId] = useState(reps[0]?.id || "");
  useEffect(() => { if (!repId && reps[0]) setRepId(reps[0].id); }, [reps]);
  const data = repDataMap[repId] || emptyRepData();
 
  const [cType, setCType] = useState(COMMITMENT_TYPES[0]);
  const [cOther, setCOther] = useState("");
  const [cValue, setCValue] = useState("");
  const [eType, setEType] = useState(EXPENSE_TYPES[0]);
  const [eOther, setEOther] = useState("");
  const [eValue, setEValue] = useState("");
  const [eDate, setEDate] = useState(todayStr());
  const cm = currentMonth();
 
  const addCommitment = () => {
    if (!repId || cValue === "") return;
    const label = cType === "أخرى" ? (cOther.trim() || "أخرى") : cType;
    updateRepData(repId, { ...data, commitments: [...data.commitments, { id: uid(), type: cType, otherLabel: label, value: Number(cValue) || 0 }] });
    setCValue(""); setCOther("");
  };
  const removeCommitment = (id) => updateRepData(repId, { ...data, commitments: data.commitments.filter((c) => c.id !== id) });
 
  const addExpense = () => {
    if (!repId || eValue === "") return;
    const label = eType === "أخرى" ? (eOther.trim() || "أخرى") : eType;
    updateRepData(repId, { ...data, expenses: [...data.expenses, { id: uid(), type: eType, otherLabel: label, value: Number(eValue) || 0, date: eDate }] });
    setEValue(""); setEOther("");
  };
  const removeExpense = (id) => updateRepData(repId, { ...data, expenses: data.expenses.filter((e) => e.id !== id) });
 
  const monthExpenses = data.expenses.filter((e) => monthKey(e.date) === cm).sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalFixed = data.commitments.reduce((s, c) => s + (Number(c.value) || 0), 0);
  const totalVariable = monthExpenses.reduce((s, e) => s + (Number(e.value) || 0), 0);
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>الالتزامات والمصروفات</h2>
      <Card style={{ marginBottom: 18, maxWidth: 300 }}>
        <Field label="المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </Card>
 
      {repId && (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Card style={{ flex: 1, minWidth: 320 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>الالتزامات الشهرية الثابتة</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <select style={inputStyle} value={cType} onChange={(e) => setCType(e.target.value)}>
                  {COMMITMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {cType === "أخرى" && (
                <div style={{ flex: 1, minWidth: 120 }}><input style={inputStyle} placeholder="حدد النوع" value={cOther} onChange={(e) => setCOther(e.target.value)} /></div>
              )}
              <div style={{ flex: 1, minWidth: 100 }}><input type="number" style={inputStyle} placeholder="القيمة" value={cValue} onChange={(e) => setCValue(e.target.value)} /></div>
              <Btn kind="accent" onClick={addCommitment}><Plus size={15} /></Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.commitments.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0" }}>
                  <span>{c.type === "أخرى" ? c.otherLabel : c.type}</span>
                  <span>{fmt(c.value)}</span>
                  <button onClick={() => removeCommitment(c.id)} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer" }}><Trash2 size={14} /></button>
                </div>
              ))}
              {data.commitments.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد التزامات مسجّلة.</div>}
            </div>
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 13 }}>الإجمالي: {fmt(totalFixed)}</div>
          </Card>
 
          <Card style={{ flex: 1, minWidth: 320 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>المصروفات المتغيرة — {monthLabel(cm)}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 110 }}>
                <select style={inputStyle} value={eType} onChange={(e) => setEType(e.target.value)}>
                  {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {eType === "أخرى" && (
                <div style={{ flex: 1, minWidth: 110 }}><input style={inputStyle} placeholder="حدد النوع" value={eOther} onChange={(e) => setEOther(e.target.value)} /></div>
              )}
              <div style={{ flex: 1, minWidth: 90 }}><input type="number" style={inputStyle} placeholder="القيمة" value={eValue} onChange={(e) => setEValue(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 130 }}><input type="date" style={inputStyle} value={eDate} onChange={(e) => setEDate(e.target.value)} /></div>
              <Btn kind="accent" onClick={addExpense}><Plus size={15} /></Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {monthExpenses.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0" }}>
                  <span>{e.type === "أخرى" ? e.otherLabel : e.type}</span>
                  <span>{e.date}</span>
                  <span>{fmt(e.value)}</span>
                  <button onClick={() => removeExpense(e.id)} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer" }}><Trash2 size={14} /></button>
                </div>
              ))}
              {monthExpenses.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد مصروفات هذا الشهر.</div>}
            </div>
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 13 }}>الإجمالي: {fmt(totalVariable)}</div>
          </Card>
        </div>
      )}
    </div>
  );
}
 
function AdminGoals({ reps, repDataMap, updateRepData }) {
  const [repId, setRepId] = useState(reps[0]?.id || "");
  const [month, setMonth] = useState(currentMonth());
  const [salesTarget, setSalesTarget] = useState("");
  const [collPercent, setCollPercent] = useState("");
 
  useEffect(() => {
    if (!repId && reps[0]) setRepId(reps[0].id);
  }, [reps]);
 
  const data = repDataMap[repId] || emptyRepData();
  const existing = goalForMonth(data.goals, month);
 
  useEffect(() => {
    setSalesTarget(existing ? existing.salesTarget : "");
    setCollPercent(existing ? existing.collectionPercentTarget : "");
  }, [repId, month]);
 
  const save = () => {
    if (!repId) return;
    const goals = data.goals.filter((g) => g.month !== month);
    goals.push({ month, salesTarget: Number(salesTarget) || 0, collectionPercentTarget: Number(collPercent) || 0 });
    updateRepData(repId, { ...data, goals });
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>تحديد الأهداف الشهرية</h2>
      <Card style={{ maxWidth: 480 }}>
        <Field label="المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="الشهر">
          <input type="month" style={inputStyle} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="هدف المبيعات (مبلغ)">
          <input type="number" style={inputStyle} value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)} placeholder="مثال: 50000" />
        </Field>
        <Field label="هدف التحصيل (نسبة % من مبيعات نفس الشهر)">
          <input type="number" style={inputStyle} value={collPercent} onChange={(e) => setCollPercent(e.target.value)} placeholder="مثال: 80" />
        </Field>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          يمكن تعديل هذه الأهداف في أي وقت حسب الموسم أو الظروف — كل تعديل يخص شهرًا محددًا فقط.
        </div>
        <Btn kind="accent" onClick={save} disabled={!repId}>حفظ الهدف</Btn>
      </Card>
 
      <h3 style={{ margin: "22px 0 10px", color: COLORS.ink, fontSize: 15 }}>الأهداف المسجّلة لهذا المندوب</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[...data.goals].reverse().map((g, i) => (
          <Card key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{monthLabel(g.month)}</span>
            <span>هدف مبيعات: {fmt(g.salesTarget)}</span>
            <span>هدف تحصيل: {pct(g.collectionPercentTarget)}</span>
          </Card>
        ))}
        {data.goals.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد أهداف مسجّلة بعد.</div>}
      </div>
    </div>
  );
}
 
function MonthlyBarSummary({ sales, collection, heightPx = 300 }) {
  const percent = sales ? (collection / sales) * 100 : 0;
  const data = [{ name: "", مبيعات: Math.round(sales), تحصيل: Math.round(collection), "نسبة التحصيل": Math.round(percent) }];
  return (
    <ResponsiveContainer width="100%" height={heightPx}>
      <BarChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }} barGap={20}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
        <XAxis dataKey="name" tick={false} axisLine={{ stroke: COLORS.border }} />
        <YAxis yAxisId="amount" hide />
        <YAxis yAxisId="percent" hide domain={[0, 100]} />
        <Tooltip formatter={(v, name) => (name === "نسبة التحصيل" ? pct(v) : fmt(v))} />
        <Legend />
        <Bar yAxisId="amount" dataKey="مبيعات" fill={SALES_COLOR} radius={[6, 6, 0, 0]} barSize={70}>
          <LabelList dataKey="مبيعات" position="top" formatter={(v) => fmt(v)} style={{ fill: SALES_COLOR, fontWeight: 700, fontSize: 13 }} />
        </Bar>
        <Bar yAxisId="amount" dataKey="تحصيل" fill={COLLECTION_COLOR} radius={[6, 6, 0, 0]} barSize={70}>
          <LabelList dataKey="تحصيل" position="top" formatter={(v) => fmt(v)} style={{ fill: COLLECTION_COLOR, fontWeight: 700, fontSize: 13 }} />
        </Bar>
        <Bar yAxisId="percent" dataKey="نسبة التحصيل" fill={PERCENT_COLOR} radius={[6, 6, 0, 0]} barSize={70}>
          <LabelList dataKey="نسبة التحصيل" position="top" formatter={(v) => pct(v)} style={{ fill: PERCENT_COLOR, fontWeight: 700, fontSize: 13 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
 
function MonthlyChart({ reports, month }) {
  const totals = sumReports(reports, month);
  if (totals.sales === 0 && totals.collection === 0) {
    return <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد تقارير مُدخلة لهذا الشهر بعد.</div>;
  }
  return <MonthlyBarSummary sales={totals.sales} collection={totals.collection} />;
}
 
function FullPeriodChart({ reports, startDate }) {
  const totals = sumReports(reports, null);
  return (
    <div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>تاريخ الالتحاق بالعمل: <strong style={{ color: COLORS.ink }}>{startDate}</strong></div>
      {totals.sales === 0 && totals.collection === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد تقارير مُدخلة بعد.</div>
      ) : (
        <MonthlyBarSummary sales={totals.sales} collection={totals.collection} />
      )}
    </div>
  );
}
 
function WorkDaysChart({ reports, month }) {
  const { working, noWork, totalDays } = countWorkDays(reports, month);
  if (totalDays === 0) return <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد تقارير مُدخلة لهذا الشهر بعد.</div>;
  const data = [{ name: "", "أيام عمل": working, "أيام بلا عمل": noWork }];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
        <XAxis dataKey="name" tick={false} axisLine={{ stroke: COLORS.border }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="أيام عمل" fill={COLLECTION_COLOR} radius={[6, 6, 0, 0]} barSize={80}>
          <LabelList dataKey="أيام عمل" position="top" style={{ fill: COLLECTION_COLOR, fontWeight: 700, fontSize: 13 }} />
        </Bar>
        <Bar dataKey="أيام بلا عمل" fill={COLORS.muted} radius={[6, 6, 0, 0]} barSize={80}>
          <LabelList dataKey="أيام بلا عمل" position="top" style={{ fill: COLORS.muted, fontWeight: 700, fontSize: 13 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
 
function ExpensePercentChart({ fixed, variable, total }) {
  if (total <= 0 && fixed === 0 && variable === 0) {
    return <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد بيانات مصروفات لهذا الشهر بعد.</div>;
  }
  const fixedPct = total ? (fixed / total) * 100 : 0;
  const variablePct = total ? (variable / total) * 100 : 0;
  const totalPct = fixedPct + variablePct;
  const data = [{ name: "", "التزامات ثابتة": Math.round(fixedPct), "مصروفات متغيرة": Math.round(variablePct), "الإجمالي": Math.round(totalPct) }];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
        <XAxis dataKey="name" tick={false} axisLine={{ stroke: COLORS.border }} />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(v) => pct(v)} />
        <Legend />
        <Bar dataKey="التزامات ثابتة" fill="#B7453F" radius={[6, 6, 0, 0]} barSize={60}>
          <LabelList dataKey="التزامات ثابتة" position="top" formatter={(v) => pct(v)} style={{ fill: "#B7453F", fontWeight: 700, fontSize: 13 }} />
        </Bar>
        <Bar dataKey="مصروفات متغيرة" fill="#D9736D" radius={[6, 6, 0, 0]} barSize={60}>
          <LabelList dataKey="مصروفات متغيرة" position="top" formatter={(v) => pct(v)} style={{ fill: "#D9736D", fontWeight: 700, fontSize: 13 }} />
        </Bar>
        <Bar dataKey="الإجمالي" fill="#7A2620" radius={[6, 6, 0, 0]} barSize={60}>
          <LabelList dataKey="الإجمالي" position="top" formatter={(v) => pct(v)} style={{ fill: "#7A2620", fontWeight: 700, fontSize: 13 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
 
function CollectionTypeChart({ reports, month }) {
  const list = reports.filter((r) => monthKey(r.date) === month);
  const totals = list.reduce(
    (acc, r) => {
      acc.cash += Number(r.cash) || 0;
      acc.transfer += Number(r.transfer) || 0;
      acc.network += Number(r.network) || 0;
      return acc;
    },
    { cash: 0, transfer: 0, network: 0 }
  );
  const total = totals.cash + totals.transfer + totals.network;
 
  return (
    <div>
      <div
        style={{
          background: "#E9F6EF",
          border: `1px solid ${COLLECTION_COLOR}`,
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#1F6E4C", fontWeight: 600 }}>إجمالي التحصيل</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1F6E4C" }}>{fmt(total)}</span>
      </div>
      {total === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد بيانات تحصيل لهذا الشهر بعد.</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={[{ name: "", نقدي: totals.cash, حوالة: totals.transfer, شبكة: totals.network }]} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="name" tick={false} axisLine={{ stroke: COLORS.border }} />
            <YAxis />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Bar dataKey="نقدي" fill="#2E8F63" radius={[6, 6, 0, 0]} barSize={60}>
              <LabelList dataKey="نقدي" position="top" formatter={(v) => fmt(v)} style={{ fill: "#2E8F63", fontWeight: 700, fontSize: 13 }} />
            </Bar>
            <Bar dataKey="حوالة" fill="#59B389" radius={[6, 6, 0, 0]} barSize={60}>
              <LabelList dataKey="حوالة" position="top" formatter={(v) => fmt(v)} style={{ fill: "#59B389", fontWeight: 700, fontSize: 13 }} />
            </Bar>
            <Bar dataKey="شبكة" fill="#1F6E4C" radius={[6, 6, 0, 0]} barSize={60}>
              <LabelList dataKey="شبكة" position="top" formatter={(v) => fmt(v)} style={{ fill: "#1F6E4C", fontWeight: 700, fontSize: 13 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
 
function AdminCharts({ reps, repDataMap }) {
  const [repId, setRepId] = useState(reps[0]?.id || "");
  useEffect(() => { if (!repId && reps[0]) setRepId(reps[0].id); }, [reps]);
  const rep = reps.find((r) => r.id === repId);
  const data = repDataMap[repId] || emptyRepData();
  const cm = currentMonth();
  const monthTotals = sumReports(data.reports, cm);
  const { fixed, variable } = financeTotals(data.commitments, data.expenses, cm);
  const wholeTotals = sumReports(data.reports, null);
  const wholePct = wholeTotals.sales ? (wholeTotals.collection / wholeTotals.sales) * 100 : 0;
  const monthPctVal = monthTotals.sales ? (monthTotals.collection / monthTotals.sales) * 100 : 0;
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>الرسوم البيانية</h2>
      <Card style={{ marginBottom: 18, maxWidth: 320 }}>
        <Field label="اختر المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </Card>
      {!rep ? <Card>أضِف مندوبًا أولاً.</Card> : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <StatBox label="نسبة التحصيل من المبيعات — الشهر الحالي" value={pct(monthPctVal)} />
            <StatBox label="نسبة التحصيل من المبيعات — كامل الفترة" value={pct(wholePct)} />
          </div>
 
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>المبيعات والتحصيل — {monthLabel(cm)}</div>
            <MonthlyChart reports={data.reports} month={cm} />
          </Card>
 
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>المبيعات والتحصيل — كامل فترة عمل {rep.name} (تراكمي)</div>
            <FullPeriodChart reports={data.reports} startDate={rep.startDate} />
          </Card>
 
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>أيام العمل مقابل أيام بلا عمل — {monthLabel(cm)}</div>
            <WorkDaysChart reports={data.reports} month={cm} />
          </Card>
 
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>أنواع التحصيل — {monthLabel(cm)}</div>
            <CollectionTypeChart reports={data.reports} month={cm} />
          </Card>
 
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>نسبة المصروفات والالتزامات من التحصيل الشهري — {monthLabel(cm)}</div>
            <ExpensePercentChart fixed={fixed} variable={variable} total={monthTotals.collection} />
          </Card>
        </>
      )}
    </div>
  );
}
 
function AdminMonthlyReport({ reps, repDataMap, adminWhatsAppGroup }) {
  const cm = currentMonth();
  const [repId, setRepId] = useState(reps[0]?.id || "");
  useEffect(() => { if (!repId && reps[0]) setRepId(reps[0].id); }, [reps]);
  const [from, setFrom] = useState(cm + "-01");
  const [to, setTo] = useState(todayStr());
 
  const rep = reps.find((r) => r.id === repId);
  const data = repDataMap[repId] || emptyRepData();
 
  const rangeReports = filterReportsRange(data.reports, from, to);
  const rangeTotals = sumReports(rangeReports, null);
  const { fixed, variable } = financeTotals(data.commitments, data.expenses, cm);
  const netCash = rangeTotals.collection - (fixed + variable);
  const profitMargin = rangeTotals.sales * 0.45;
  const daysCount = rangeReports.length ? new Set(rangeReports.map((r) => r.date)).size : 0;
  const now = new Date();
  const generatedDate = todayStr();
  const generatedTime = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
 
  const reportHtml = rep ? `
      ${chartCard("ملخص المبيعات والتحصيل والمصروفات", svgBarChart([
        { label: "المبيعات", value: rangeTotals.sales, color: SALES_COLOR },
        { label: "التحصيل", value: rangeTotals.collection, color: COLLECTION_COLOR },
        { label: "التزامات ثابتة", value: fixed, color: EXPENSE_COLOR },
        { label: "مصروفات متغيرة", value: variable, color: "#D9736D" },
        { label: "صافي النقد", value: Math.abs(netCash), display: fmt(netCash), color: netCash >= 0 ? COLLECTION_COLOR : EXPENSE_COLOR },
      ], { width: 520, height: 240 }))}
      <table>
        <tr><th>البند</th><th>القيمة</th></tr>
        <tr class="row-sales"><td>إجمالي المبيعات (الفترة المحددة)</td><td class="sales">${fmt(rangeTotals.sales)}</td></tr>
        <tr class="row-collection"><td>إجمالي التحصيل (الفترة المحددة)</td><td class="collection">${fmt(rangeTotals.collection)}</td></tr>
        <tr class="row-expense"><td>إجمالي الالتزامات الثابتة (${monthLabel(cm)})</td><td class="expense">${fmt(fixed)}</td></tr>
        <tr class="row-expense"><td>إجمالي المصروفات المتغيرة (${monthLabel(cm)})</td><td class="expense">${fmt(variable)}</td></tr>
      </table>
      <table>
        <tr><th>البند</th><th>القيمة</th></tr>
        <tr class="row-net"><td class="net">صافي النقد بعد خصم المصروفات والالتزامات</td><td class="net" style="color:${netCash >= 0 ? COLLECTION_COLOR : EXPENSE_COLOR}">${fmt(netCash)}</td></tr>
      </table>
      <table>
        <tr><th>البند</th><th>القيمة</th></tr>
        <tr class="row-profit"><td class="profit">هامش الربح التقريبي للمبيعات (45% من قيمة المبيعات)</td><td class="profit">${fmt(profitMargin)}</td></tr>
      </table>
    ` : "";
 
  const reportText = rep ? `التقرير الشهري التفصيلي — ${rep.name}
الفترة: من ${from} إلى ${to} (الالتزامات/المصروفات لشهر ${monthLabel(cm)})
إجمالي المبيعات: ${fmt(rangeTotals.sales)}
إجمالي التحصيل: ${fmt(rangeTotals.collection)}
إجمالي الالتزامات الثابتة: ${fmt(fixed)}
إجمالي المصروفات المتغيرة: ${fmt(variable)}
صافي النقد بعد الخصم: ${fmt(netCash)}
هامش الربح التقريبي (45% من المبيعات): ${fmt(profitMargin)}` : "";
 
  const exportPdf = () => {
    if (!rep) return;
    downloadReportFile(
      `تقرير-${rep.name}-${from}-الى-${to}`,
      `التقرير الشهري التفصيلي — ${rep.name}`,
      `الفترة: من ${from} إلى ${to} — الشهر المرجعي للالتزامات والمصروفات: ${monthLabel(cm)}<br/>تاريخ إصدار التقرير: ${generatedDate} — وقت الاطلاع: ${generatedTime} — عدد الأيام التي بها تقارير: ${daysCount}`,
      reportHtml
    );
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>تقرير شهري تفصيلي</h2>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 180 }}>
            <Field label="المندوب">
              <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ minWidth: 160 }}><Field label="من تاريخ"><input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
          <div style={{ minWidth: 160 }}><Field label="إلى تاريخ"><input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
        </div>
      </Card>
 
      {rep && (
        <>
          <Card style={{ marginBottom: 4, fontSize: 13, color: COLORS.muted }}>
            الشهر: {monthLabel(cm)} — تاريخ إصدار التقرير: {generatedDate} — وقت الاطلاع: {generatedTime} — عدد الأيام التي بها تقارير: {daysCount}
          </Card>
          <Card style={{ marginTop: 14, marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 4px" }}>إجمالي المبيعات (الفترة المحددة)</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: SALES_COLOR }}>{fmt(rangeTotals.sales)}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 4px" }}>إجمالي التحصيل (الفترة المحددة)</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: COLLECTION_COLOR }}>{fmt(rangeTotals.collection)}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 4px" }}>إجمالي الالتزامات الثابتة ({monthLabel(cm)})</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: EXPENSE_COLOR }}>{fmt(fixed)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 4px" }}>إجمالي المصروفات المتغيرة ({monthLabel(cm)})</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: EXPENSE_COLOR }}>{fmt(variable)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card style={{ marginBottom: 18 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 4px", fontWeight: 700 }}>صافي النقد بعد خصم المصروفات والالتزامات</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, fontSize: 20, color: netCash >= 0 ? COLLECTION_COLOR : EXPENSE_COLOR }}>{fmt(netCash)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
 
          <Card style={{ marginBottom: 18, borderRight: `4px solid ${PROFIT_COLOR}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 4px", fontWeight: 700, color: PROFIT_COLOR }}>هامش الربح التقريبي للمبيعات (45% من قيمة المبيعات)</td>
                  <td style={{ padding: "8px 4px", fontWeight: 700, fontSize: 20, color: PROFIT_COLOR }}>{fmt(profitMargin)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
 
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>تنزيل أو مشاركة هذا التقرير</div>
            <Btn kind="accent" onClick={exportPdf} style={{ marginBottom: 12 }}><FileText size={16} /> تنزيل PDF</Btn>
            <WhatsAppShareBox text={reportText} groupLink={adminWhatsAppGroup} />
          </Card>
        </>
      )}
    </div>
  );
}
 
function AdminQuery({ reps, repDataMap, adminWhatsAppGroup }) {
  const [repId, setRepId] = useState("all");
  const [from, setFrom] = useState(todayStr().slice(0, 8) + "01");
  const [to, setTo] = useState(todayStr());
 
  const rowsInRange = useMemo(() => {
    const ids = repId === "all" ? reps.map((r) => r.id) : [repId];
    const out = [];
    ids.forEach((id) => {
      const rep = reps.find((r) => r.id === id);
      const data = repDataMap[id] || emptyRepData();
      data.reports.forEach((r) => {
        if (r.date >= from && r.date <= to) out.push({ ...r, repName: rep?.name || "", collection: reportCollection(r) });
      });
    });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [repId, from, to, reps, repDataMap]);
 
  const totals = rowsInRange.reduce((acc, r) => {
    acc.sales += Number(r.sales) || 0;
    acc.collection += Number(r.collection) || 0;
    return acc;
  }, { sales: 0, collection: 0 });
  const rangePct = totals.sales ? (totals.collection / totals.sales) * 100 : 0;
  const repLabel = repId === "all" ? "كل المناديب" : (reps.find((r) => r.id === repId)?.name || "");
 
  const perRepTotals = useMemo(() => {
    if (repId !== "all") return [];
    return reps.map((r) => {
      const t = sumReports(filterReportsRange(repDataMap[r.id]?.reports || [], from, to), null);
      return { label: r.name, value: t.collection };
    }).filter((x) => x.value > 0);
  }, [repId, from, to, reps, repDataMap]);
 
  const queryHtml = `
    ${chartCard("ملخص الفترة", svgBarChart([
      { label: "المبيعات", value: totals.sales, color: SALES_COLOR },
      { label: "التحصيل", value: totals.collection, color: COLLECTION_COLOR },
      { label: "نسبة التحصيل", value: (rangePct / 100) * Math.max(totals.sales, totals.collection, 1), display: pct(rangePct), color: PERCENT_COLOR },
    ], { width: 460, height: 220 }))}
    ${perRepTotals.length > 1 ? chartCard("التحصيل حسب المندوب", svgBarChart(
      perRepTotals.map((r) => ({ label: r.label, value: r.value, color: COLLECTION_COLOR })),
      { width: Math.max(460, perRepTotals.length * 90), height: 220 }
    )) : ""}
    <table>
      <tr><th>البند</th><th>القيمة</th></tr>
      <tr class="row-sales"><td>إجمالي المبيعات</td><td class="sales">${fmt(totals.sales)}</td></tr>
      <tr class="row-collection"><td>إجمالي التحصيل</td><td class="collection">${fmt(totals.collection)}</td></tr>
      <tr class="row-net"><td>نسبة التحصيل من المبيعات</td><td>${pct(rangePct)}</td></tr>
    </table>
    <table>
      <tr><th>التاريخ</th><th>المندوب</th><th>المبيعات</th><th>التحصيل</th></tr>
      ${rowsInRange.map((r) => `<tr><td>${r.date}</td><td>${r.repName}</td><td class="sales">${fmt(r.sales)}</td><td class="collection">${fmt(r.collection)}</td></tr>`).join("")}
    </table>
  `;
  const queryText = `استعلام فترة: ${repLabel}\nمن ${from} إلى ${to}\nإجمالي المبيعات: ${fmt(totals.sales)}\nإجمالي التحصيل: ${fmt(totals.collection)}\nنسبة التحصيل من المبيعات: ${pct(rangePct)}`;
 
  const exportPdf = () => downloadReportFile(
    `استعلام-${repLabel}-${from}-الى-${to}`,
    `استعلام عن فترة محددة`,
    `المندوب: ${repLabel} — الفترة: من ${from} إلى ${to}`,
    queryHtml
  );
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>استعلام عن فترة محددة</h2>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 180 }}>
            <Field label="المندوب">
              <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
                <option value="all">كل المناديب</option>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ minWidth: 160 }}>
            <Field label="من تاريخ"><input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          </div>
          <div style={{ minWidth: 160 }}>
            <Field label="إلى تاريخ"><input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        </div>
      </Card>
 
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatBox label="إجمالي المبيعات" value={fmt(totals.sales)} color={SALES_COLOR} />
        <StatBox label="إجمالي التحصيل" value={fmt(totals.collection)} color={COLLECTION_COLOR} />
        <StatBox label="نسبة التحصيل من المبيعات" value={pct(rangePct)} color={COLORS.accent} />
      </div>
 
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>تفاصيل ({rowsInRange.length} تقرير)</div>
        <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                <th style={{ padding: "6px 4px" }}>التاريخ</th>
                <th style={{ padding: "6px 4px" }}>المندوب</th>
                <th style={{ padding: "6px 4px" }}>المبيعات</th>
                <th style={{ padding: "6px 4px" }}>التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {rowsInRange.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "6px 4px" }}>{r.date}</td>
                  <td style={{ padding: "6px 4px" }}>{r.repName}</td>
                  <td style={{ padding: "6px 4px", color: SALES_COLOR, fontWeight: 600 }}>{fmt(r.sales)}</td>
                  <td style={{ padding: "6px 4px", color: COLLECTION_COLOR, fontWeight: 600 }}>{fmt(r.collection)}</td>
                </tr>
              ))}
              {rowsInRange.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12, color: COLORS.muted, textAlign: "center" }}>لا توجد بيانات في هذه الفترة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
 
      <Card>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>تنزيل أو مشاركة نتيجة الاستعلام</div>
        <Btn kind="accent" onClick={exportPdf} style={{ marginBottom: 12 }}><FileText size={16} /> تنزيل PDF</Btn>
        <WhatsAppShareBox text={queryText} groupLink={adminWhatsAppGroup} />
      </Card>
    </div>
  );
}
 
function AdminItems({ items, setItems }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");

  const resetForm = () => {
    setName(""); setCode(""); setCostPrice(""); setSalePrice(""); setPhoto(null); setEditId(null); setErr("");
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 300, 0.8);
      setPhoto(dataUrl);
    } catch {
      setErr("تعذّر تحميل الصورة، جرّب صورة أخرى.");
    }
  };

  const save = () => {
    if (!name.trim()) { setErr("أدخل اسم الصنف."); return; }
    if (!code.trim()) { setErr("أدخل رمز الصنف."); return; }
    setErr("");
    if (editId) {
      setItems(items.map((it) => (it.id === editId ? {
        ...it, name: name.trim(), code: code.trim(),
        costPrice: Number(costPrice) || 0, expectedSalePrice: Number(salePrice) || 0, photo,
      } : it)));
    } else {
      setItems([...items, {
        id: uid(), name: name.trim(), code: code.trim(),
        costPrice: Number(costPrice) || 0, expectedSalePrice: Number(salePrice) || 0, photo,
      }]);
    }
    resetForm();
  };

  const startEdit = (it) => {
    setEditId(it.id); setName(it.name); setCode(it.code);
    setCostPrice(it.costPrice); setSalePrice(it.expectedSalePrice); setPhoto(it.photo || null); setErr("");
  };

  const remove = (id) => {
    setItems(items.filter((it) => it.id !== id));
    if (editId === id) resetForm();
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>الأصناف</h2>
      <Card style={{ marginBottom: 18, maxWidth: 480 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>{editId ? "تعديل صنف" : "إضافة صنف جديد"}</div>
        <Field label="اسم الصنف">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="رمز الصنف">
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="سعر التكلفة">
              <input type="number" style={inputStyle} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="سعر البيع المتوقع">
              <input type="number" style={inputStyle} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="صورة الصنف">
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => uploadPhoto(e.target.files[0])} />
          {photo && (
            <div style={{ position: "relative", display: "inline-block", marginTop: 6 }}>
              <img src={photo} alt="" style={{ width: 90, height: 90, borderRadius: 8, objectFit: "cover", display: "block" }} />
              <button onClick={() => setPhoto(null)} style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, padding: "2px 6px", cursor: "pointer" }}>إزالة</button>
            </div>
          )}
        </Field>
        {err && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="accent" onClick={save}><Plus size={16} /> {editId ? "حفظ التعديلات" : "إضافة الصنف"}</Btn>
          {editId && <Btn kind="ghost" onClick={resetForm}>إلغاء</Btn>}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <Card key={it.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {it.photo ? (
                <img src={it.photo} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Package size={20} color={COLORS.muted} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>الرمز: {it.code}</div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>تكلفة: <strong style={{ color: COLORS.ink }}>{fmt(it.costPrice)}</strong></div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>بيع متوقع: <strong style={{ color: COLORS.ink }}>{fmt(it.expectedSalePrice)}</strong></div>
              <button onClick={() => startEdit(it)} style={{ border: "none", background: "transparent", color: COLORS.primary, cursor: "pointer" }}><Pencil size={15} /></button>
              <button onClick={() => remove(it.id)} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card>لا توجد أصناف مضافة بعد.</Card>}
      </div>
    </div>
  );
}

function WarehouseStatsBlock({ stock, items, showZero }) {
  const rows = showZero ? allItemsStockRows(stock, items) : stockRows(stock, items);
  const totals = stockTotals(rows);
  const profit = totals.saleValue - totals.costValue;
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <StatBox label="تكلفة البضاعة المتوفرة" value={fmt(totals.costValue)} color={EXPENSE_COLOR} />
        <StatBox label="سعر البيع المتوقع" value={fmt(totals.saleValue)} color={SALES_COLOR} />
        <StatBox label="الربح المتوقع" value={fmt(profit)} color={profit >= 0 ? COLLECTION_COLOR : EXPENSE_COLOR} />
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: COLORS.muted, textAlign: "right" }}>
              <th style={{ padding: "6px 4px" }}>الصنف</th>
              <th style={{ padding: "6px 4px" }}>الرمز</th>
              <th style={{ padding: "6px 4px" }}>الكمية</th>
              <th style={{ padding: "6px 4px" }}>قيمة التكلفة</th>
              <th style={{ padding: "6px 4px" }}>قيمة البيع</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "6px 4px" }}>{r.item?.name || "—"}</td>
                <td style={{ padding: "6px 4px" }}>{r.item?.code || "—"}</td>
                <td style={{ padding: "6px 4px", fontWeight: 600 }}>{fmt(r.qty)}</td>
                <td style={{ padding: "6px 4px" }}>{fmt(r.costValue)}</td>
                <td style={{ padding: "6px 4px" }}>{fmt(r.saleValue)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, color: COLORS.muted, textAlign: "center" }}>لا توجد كميات متوفرة.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminFactoryWarehouses({ items, factoryWarehouses, setFactoryWarehouses, factoryStock, setFactoryStock }) {
  const [selectedId, setSelectedId] = useState(factoryWarehouses[0]?.id || "");
  useEffect(() => { if (!selectedId && factoryWarehouses[0]) setSelectedId(factoryWarehouses[0].id); }, [factoryWarehouses]);

  const [newWhName, setNewWhName] = useState("");
  const addWarehouse = () => {
    if (!newWhName.trim()) return;
    setFactoryWarehouses([...factoryWarehouses, { id: uid(), name: newWhName.trim() }]);
    setNewWhName("");
  };
  const removeWarehouse = (id) => {
    setFactoryWarehouses(factoryWarehouses.filter((w) => w.id !== id));
    const next = { ...factoryStock };
    delete next[id];
    setFactoryStock(next);
    if (selectedId === id) setSelectedId("");
  };

  const [addItemId, setAddItemId] = useState("");
  const [addQtyVal, setAddQtyVal] = useState("");
  useEffect(() => { if (!addItemId && items[0]) setAddItemId(items[0].id); }, [items]);

  const doAddStock = () => {
    if (!selectedId || !addItemId || !addQtyVal) return;
    const current = factoryStock[selectedId] || {};
    setFactoryStock({ ...factoryStock, [selectedId]: addQty(current, addItemId, Number(addQtyVal)) });
    setAddQtyVal("");
  };

  const [transferItemId, setTransferItemId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const doTransfer = () => {
    if (!selectedId || !transferItemId || !transferQty || !transferTarget) return;
    const sourceStock = factoryStock[selectedId] || {};
    const available = Number(sourceStock[transferItemId]) || 0;
    const qty = Number(transferQty) || 0;
    if (qty <= 0 || qty > available) return;
    const nextSource = subQty(sourceStock, transferItemId, qty);
    const targetStock = factoryStock[transferTarget] || {};
    const nextTarget = addQty(targetStock, transferItemId, qty);
    setFactoryStock({ ...factoryStock, [selectedId]: nextSource, [transferTarget]: nextTarget });
    setTransferItemId(""); setTransferQty(""); setTransferTarget("");
  };

  const selectedWarehouse = factoryWarehouses.find((w) => w.id === selectedId);
  const currentStock = factoryStock[selectedId] || {};

  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>مخازن التصنيع</h2>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>إضافة مخزن تصنيع جديد</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input style={inputStyle} placeholder="اسم المخزن" value={newWhName} onChange={(e) => setNewWhName(e.target.value)} />
          </div>
          <Btn kind="accent" onClick={addWarehouse}><Plus size={15} /> إضافة</Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 18, maxWidth: 340 }}>
        <Field label="اختر مخزن التصنيع">
          <select style={inputStyle} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">— اختر —</option>
            {factoryWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        {selectedWarehouse && (
          <Btn kind="danger" onClick={() => removeWarehouse(selectedId)}><Trash2 size={14} /> حذف هذا المخزن</Btn>
        )}
      </Card>

      {selectedId && (
        <>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>إضافة كمية مُصنَّعة جاهزة</div>
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.muted }}>أضِف أصنافًا أولاً من تبويب "الأصناف".</div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Field label="الصنف">
                    <select style={inputStyle} value={addItemId} onChange={(e) => setAddItemId(e.target.value)}>
                      {items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ minWidth: 120 }}>
                  <Field label="الكمية">
                    <input type="number" style={inputStyle} value={addQtyVal} onChange={(e) => setAddQtyVal(e.target.value)} />
                  </Field>
                </div>
                <Btn kind="accent" onClick={doAddStock} style={{ marginBottom: 12 }}><PackagePlus size={16} /> إضافة للمخزن</Btn>
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>نقل كمية إلى مخزن تصنيع آخر</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Field label="الصنف">
                  <select style={inputStyle} value={transferItemId} onChange={(e) => setTransferItemId(e.target.value)}>
                    <option value="">— اختر —</option>
                    {stockRows(currentStock, items).map((r) => (
                      <option key={r.itemId} value={r.itemId}>{r.item?.name} (متوفر: {fmt(r.qty)})</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div style={{ minWidth: 110 }}>
                <Field label="الكمية">
                  <input type="number" style={inputStyle} value={transferQty} onChange={(e) => setTransferQty(e.target.value)} />
                </Field>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Field label="إلى مخزن">
                  <select style={inputStyle} value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
                    <option value="">— اختر —</option>
                    {factoryWarehouses.filter((w) => w.id !== selectedId).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Btn kind="accent" onClick={doTransfer} style={{ marginBottom: 12 }}><ArrowRightLeft size={16} /> نقل</Btn>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>إحصائية مخزن: {selectedWarehouse?.name}</div>
            <WarehouseStatsBlock stock={currentStock} items={items} showZero />
          </Card>
        </>
      )}
    </div>
  );
}

function AdminRepWarehouses({ reps, repDataMap, updateRepData, items, factoryWarehouses, factoryStock, setFactoryStock, adminWhatsAppGroup }) {
  const [repId, setRepId] = useState(reps[0]?.id || "");
  useEffect(() => { if (!repId && reps[0]) setRepId(reps[0].id); }, [reps]);
  const data = repDataMap[repId] || emptyRepData();
  const repStock = data.warehouseStock || {};
  const shipments = data.shipments || [];
  const rep = reps.find((r) => r.id === repId);

  const [sourceWhId, setSourceWhId] = useState(factoryWarehouses[0]?.id || "");
  useEffect(() => { if (!sourceWhId && factoryWarehouses[0]) setSourceWhId(factoryWarehouses[0].id); }, [factoryWarehouses]);
  const [supplyQtys, setSupplyQtys] = useState({});
  const [supplyErr, setSupplyErr] = useState("");
  const [lastShipment, setLastShipment] = useState(null);

  const sourceStock = factoryStock[sourceWhId] || {};

  const doSupply = () => {
    setSupplyErr("");
    if (!repId || !sourceWhId) return;
    const entries = Object.entries(supplyQtys)
      .map(([itemId, v]) => ({ itemId, qty: Number(v) || 0 }))
      .filter((e) => e.qty > 0);
    if (entries.length === 0) { setSupplyErr("أدخل كمية لصنف واحد على الأقل."); return; }
    for (const e of entries) {
      const available = Number(sourceStock[e.itemId]) || 0;
      if (e.qty > available) {
        const itemName = itemById(items, e.itemId)?.name || e.itemId;
        setSupplyErr(`الكمية أكبر من المتوفر — الصنف "${itemName}" (المتوفر: ${fmt(available)})`);
        return;
      }
    }
    let nextSource = { ...sourceStock };
    let nextRepStock = { ...repStock };
    entries.forEach((e) => {
      nextSource = subQty(nextSource, e.itemId, e.qty);
      nextRepStock = addQty(nextRepStock, e.itemId, e.qty);
    });
    const sourceWarehouseName = factoryWarehouses.find((w) => w.id === sourceWhId)?.name || "";
    const shipment = {
      id: uid(),
      date: todayStr(),
      sourceWarehouseId: sourceWhId,
      sourceWarehouseName,
      items: entries,
      status: "pending",
      correction: null,
    };
    setFactoryStock({ ...factoryStock, [sourceWhId]: nextSource });
    updateRepData(repId, { ...data, warehouseStock: nextRepStock, shipments: [...shipments, shipment] });
    setSupplyQtys({});
    setLastShipment(shipment);
  };

  const shipmentReportText = (sh) => {
    if (!sh) return "";
    const lines = sh.items.map((e) => `- ${itemById(items, e.itemId)?.name || e.itemId}: ${fmt(e.qty)}`).join("\n");
    return `تقرير توريد بضاعة\nالمندوب: ${rep?.name || ""}\nالتاريخ: ${sh.date}\nمن: ${sh.sourceWarehouseName}\n\nالأصناف:\n${lines}`;
  };

  const correctionShipment = shipments.find((s) => s.status === "correction_requested");
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQtys, setReviewQtys] = useState({});

  const startReview = (sh) => {
    const init = {};
    sh.items.forEach((e) => { init[e.itemId] = String(e.qty); });
    setReviewQtys(init);
    setReviewMode(true);
  };

  const approveCorrection = (sh) => {
    let nextRepStock = { ...repStock };
    (sh.correction || []).forEach((c) => { nextRepStock = applyDelta(nextRepStock, c.itemId, c.delta); });
    const nextShipments = shipments.map((s) => (s.id === sh.id ? { ...s, status: "resolved" } : s));
    updateRepData(repId, { ...data, warehouseStock: nextRepStock, shipments: nextShipments });
  };

  const submitReview = (sh) => {
    let nextRepStock = { ...repStock };
    sh.items.forEach((e) => {
      const newQty = Number(reviewQtys[e.itemId]) || 0;
      const diff = newQty - e.qty;
      if (diff !== 0) nextRepStock = applyDelta(nextRepStock, e.itemId, diff);
    });
    const nextShipments = shipments.map((s) => (s.id === sh.id ? { ...s, status: "resolved" } : s));
    updateRepData(repId, { ...data, warehouseStock: nextRepStock, shipments: nextShipments });
    setReviewMode(false);
  };

  const cm = currentMonth();
  const months = useMemo(() => {
    const dates = (data.soldLog || []).map((s) => s.date);
    if (dates.length === 0) return [cm];
    const min = dates.reduce((a, b) => (a < b ? a : b));
    return monthsBetween(monthKey(min), cm);
  }, [data.soldLog, cm]);
  const monthlyData = soldMonthlySeries(data.soldLog, months);
  const totalSoldQty = (data.soldLog || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const itemTotals = soldTotalsByItem(data.soldLog, items);

  const statusLabel = (st) => (
    st === "pending" ? "بانتظار مراجعة المندوب" :
    st === "correction_requested" ? "طلب تصحيح من المندوب" :
    st === "approved" ? "معتمدة من المندوب" : "تمت التسوية"
  );
  const statusColors = (st) => (
    st === "pending" ? { bg: "#FBF3E3", fg: "#8A6416" } :
    st === "correction_requested" ? { bg: "#FDE8E7", fg: COLORS.danger } :
    { bg: "#E9F6EF", fg: COLORS.success }
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>مخزون المناديب</h2>
      <Card style={{ marginBottom: 18, maxWidth: 300 }}>
        <Field label="المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => { setRepId(e.target.value); setLastShipment(null); setReviewMode(false); }}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </Card>

      {repId && (
        <>
          {correctionShipment && !reviewMode && (
            <Card style={{ marginBottom: 18, borderRight: `4px solid ${COLORS.accent}`, background: "#FBF3E3" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                المندوب {rep?.name} طلب تعديل كمية توريد بتاريخ {correctionShipment.date} ({correctionShipment.sourceWarehouseName})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 10 }}>
                <thead>
                  <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                    <th style={{ padding: "4px" }}>الصنف</th>
                    <th style={{ padding: "4px" }}>الكمية الأصلية</th>
                    <th style={{ padding: "4px" }}>التعديل المطلوب</th>
                    <th style={{ padding: "4px" }}>الكمية بعد التعديل</th>
                  </tr>
                </thead>
                <tbody>
                  {correctionShipment.items.map((e) => {
                    const c = (correctionShipment.correction || []).find((x) => x.itemId === e.itemId);
                    const delta = c ? Number(c.delta) || 0 : 0;
                    return (
                      <tr key={e.itemId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: "4px" }}>{itemById(items, e.itemId)?.name || "—"}</td>
                        <td style={{ padding: "4px" }}>{fmt(e.qty)}</td>
                        <td style={{ padding: "4px", fontWeight: 700, color: delta < 0 ? COLORS.danger : delta > 0 ? COLORS.success : COLORS.muted }}>
                          {delta > 0 ? `+${fmt(delta)}` : fmt(delta)}
                        </td>
                        <td style={{ padding: "4px", fontWeight: 700 }}>{fmt(e.qty + delta)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn kind="accent" onClick={() => approveCorrection(correctionShipment)}>اعتماد التعديل</Btn>
                <Btn kind="ghost" onClick={() => startReview(correctionShipment)}>مراجعة الكميات كاملة</Btn>
              </div>
            </Card>
          )}

          {reviewMode && correctionShipment && (
            <Card style={{ marginBottom: 18, borderRight: `4px solid ${COLORS.primary}` }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>مراجعة كامل كميات التوريد بتاريخ {correctionShipment.date}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {correctionShipment.items.map((e) => (
                  <div key={e.itemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                    <span style={{ flex: 1 }}>{itemById(items, e.itemId)?.name || "—"}</span>
                    <span style={{ fontSize: 12, color: COLORS.muted }}>الأصلية: {fmt(e.qty)}</span>
                    <input
                      type="number"
                      style={{ ...inputStyle, width: 100 }}
                      value={reviewQtys[e.itemId] ?? ""}
                      onChange={(ev) => setReviewQtys({ ...reviewQtys, [e.itemId]: ev.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn kind="accent" onClick={() => submitReview(correctionShipment)}>اعتماد الكمية</Btn>
                <Btn kind="ghost" onClick={() => setReviewMode(false)}>إلغاء</Btn>
              </div>
            </Card>
          )}

          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>توريد بضاعة لمخزن المندوب</div>
            {factoryWarehouses.length === 0 || items.length === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.muted }}>أضِف مخازن تصنيع وأصنافًا أولاً.</div>
            ) : (
              <>
                <div style={{ maxWidth: 260, marginBottom: 12 }}>
                  <Field label="من مخزن التصنيع">
                    <select style={inputStyle} value={sourceWhId} onChange={(e) => setSourceWhId(e.target.value)}>
                      {factoryWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ maxHeight: 340, overflowY: "auto", overflowX: "auto", marginBottom: 12 }}>
                  <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                        <th style={{ padding: "6px 4px" }}>الصنف</th>
                        <th style={{ padding: "6px 4px" }}>المتوفر بالمخزن</th>
                        <th style={{ padding: "6px 4px" }}>الكمية المراد توريدها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const available = Number(sourceStock[it.id]) || 0;
                        return (
                          <tr key={it.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                            <td style={{ padding: "6px 4px" }}>{it.name} <span style={{ color: COLORS.muted, fontSize: 11 }}>({it.code})</span></td>
                            <td style={{ padding: "6px 4px" }}>{fmt(available)}</td>
                            <td style={{ padding: "6px 4px" }}>
                              <input
                                type="number"
                                style={{ ...inputStyle, width: 90 }}
                                value={supplyQtys[it.id] || ""}
                                onChange={(e) => setSupplyQtys({ ...supplyQtys, [it.id]: e.target.value })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {supplyErr && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{supplyErr}</div>}
                <Btn kind="accent" onClick={doSupply}><Truck size={16} /> توريد</Btn>
              </>
            )}
          </Card>

          {lastShipment && (
            <Card style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>تم التوريد بنجاح بتاريخ {lastShipment.date}</div>
              <WhatsAppShareBox label="إرسال تقرير التوريد" text={shipmentReportText(lastShipment)} groupLink={adminWhatsAppGroup} />
            </Card>
          )}

          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>إحصائية مخزون المندوب الحالي</div>
            <WarehouseStatsBlock stock={repStock} items={items} />
          </Card>

          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>سجل التوريدات</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...shipments].reverse().map((sh) => {
                const sc = statusColors(sh.status);
                return (
                  <div key={sh.id} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <span>{sh.date} — {sh.sourceWarehouseName}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.fg }}>
                        {statusLabel(sh.status)}
                      </span>
                    </div>
                    <div style={{ color: COLORS.muted, marginTop: 4 }}>
                      {sh.items.map((e) => `${itemById(items, e.itemId)?.name || e.itemId}: ${fmt(e.qty)}`).join("، ")}
                    </div>
                  </div>
                );
              })}
              {shipments.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد توريدات مسجّلة بعد.</div>}
            </div>
          </Card>

          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>الكميات المباعة شهريًا</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="الكمية" fill={COLLECTION_COLOR} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="الكمية" position="top" style={{ fill: COLLECTION_COLOR, fontWeight: 700, fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>إجمالي الكميات المباعة (كامل المدة): {fmt(totalSoldQty)}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                  <th style={{ padding: "6px 4px" }}>الصنف</th>
                  <th style={{ padding: "6px 4px" }}>الكمية المباعة</th>
                </tr>
              </thead>
              <tbody>
                {itemTotals.map((r) => (
                  <tr key={r.itemId} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "6px 4px" }}>{r.item?.name || "—"}</td>
                    <td style={{ padding: "6px 4px", fontWeight: 600 }}>{fmt(r.qty)}</td>
                  </tr>
                ))}
                {itemTotals.length === 0 && (
                  <tr><td colSpan={2} style={{ padding: 12, color: COLORS.muted, textAlign: "center" }}>لا توجد مبيعات مسجّلة بعد.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function SubTabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            border: `1px solid ${active === t.key ? COLORS.primary : COLORS.border2}`,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: active === t.key ? COLORS.primary : COLORS.surface,
            color: active === t.key ? "#fff" : COLORS.ink,
            fontFamily: "inherit",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function AdminInventory({ items, setItems, factoryWarehouses, setFactoryWarehouses, factoryStock, setFactoryStock, reps, repDataMap, updateRepData, adminWhatsAppGroup }) {
  const [subTab, setSubTab] = useState("items");
  return (
    <div>
      <SubTabBar
        tabs={[
          { key: "items", label: "الأصناف" },
          { key: "factories", label: "مخازن التصنيع" },
          { key: "repWarehouses", label: "مخزون المناديب" },
        ]}
        active={subTab}
        onChange={setSubTab}
      />
      {subTab === "items" && <AdminItems items={items} setItems={setItems} />}
      {subTab === "factories" && (
        <AdminFactoryWarehouses
          items={items}
          factoryWarehouses={factoryWarehouses}
          setFactoryWarehouses={setFactoryWarehouses}
          factoryStock={factoryStock}
          setFactoryStock={setFactoryStock}
        />
      )}
      {subTab === "repWarehouses" && (
        <AdminRepWarehouses
          reps={reps}
          repDataMap={repDataMap}
          updateRepData={updateRepData}
          items={items}
          factoryWarehouses={factoryWarehouses}
          factoryStock={factoryStock}
          setFactoryStock={setFactoryStock}
          adminWhatsAppGroup={adminWhatsAppGroup}
        />
      )}
    </div>
  );
}

function AdminReportsHub({ reps, repDataMap, adminWhatsAppGroup }) {
  const [subTab, setSubTab] = useState("monthly");
  return (
    <div>
      <SubTabBar
        tabs={[
          { key: "monthly", label: "تقرير شهري تفصيلي" },
          { key: "query", label: "استعلام فترة" },
        ]}
        active={subTab}
        onChange={setSubTab}
      />
      {subTab === "monthly" && <AdminMonthlyReport reps={reps} repDataMap={repDataMap} adminWhatsAppGroup={adminWhatsAppGroup} />}
      {subTab === "query" && <AdminQuery reps={reps} repDataMap={repDataMap} adminWhatsAppGroup={adminWhatsAppGroup} />}
    </div>
  );
}

// ================= REP =================
// ================= CUSTOMERS (shared: admin + rep) =================
function CustomerFieldsEditor({ initial, onSubmit, onCancel, submitLabel }) {
  const [name, setName] = useState(initial?.name || "");
  const [sector, setSector] = useState(initial?.sector || SECTORS[0]);
  const [city, setCity] = useState(initial?.city || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [photoOutside, setPhotoOutside] = useState(initial?.photoOutside || null);
  const [photoInside, setPhotoInside] = useState(initial?.photoInside || null);
  const [location, setLocation] = useState(initial?.location || null);
  const [locError, setLocError] = useState("");
  const [err, setErr] = useState("");
  const listId = useMemo(() => `saudi-cities-${uid()}`, []);
 
  const uploadPhoto = async (file, setter) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 480, 0.75);
      setter(dataUrl);
    } catch {
      setErr("تعذّر تحميل الصورة، جرّب صورة أخرى.");
    }
  };
 
  const pickLocation = () => {
    setLocError("");
    // نفتح تبويبًا فارغًا أولًا (بنفس نقرة المستخدم) حتى لا يُحجب كنافذة
    // منبثقة، ثم نوجّهه لخرائط قوقل بعد الحصول على الإحداثيات (عملية غير متزامنة).
    const win = window.open("", "_blank");
    if (!navigator.geolocation) {
      if (win) win.close();
      setLocError("المتصفح لا يدعم تحديد الموقع تلقائيًا.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
        if (win) win.location.href = link; else window.open(link, "_blank", "noopener");
        setLocation({ lat: latitude, lng: longitude, link });
      },
      () => {
        if (win) win.close();
        setLocError("تعذّر تحديد الموقع. تأكد من السماح للمتصفح بالوصول لخدمة الموقع.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
 
  const submit = () => {
    if (!name.trim()) { setErr("أدخل اسم العميل."); return; }
    if (!city.trim()) { setErr("أدخل المدينة."); return; }
    setErr("");
    onSubmit({
      name: name.trim(), sector, city: city.trim(), phone: phone.trim(),
      photoOutside, photoInside, location,
    });
  };
 
  return (
    <div>
      <Field label="اسم العميل">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="القطاع">
        <select style={inputStyle} value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="المدينة (اكتب للبحث ضمن القائمة، أو أدخل اسم مدينة أخرى غير موجودة)">
        <input style={inputStyle} list={listId} value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: الرياض" />
        <datalist id={listId}>
          {SAUDI_CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>
      <Field label="رقم التواصل">
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
      </Field>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}><Camera size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /> صورة من الخارج للمحل</label>
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => uploadPhoto(e.target.files[0], setPhotoOutside)} />
          {photoOutside && (
            <div style={{ position: "relative", display: "inline-block", marginTop: 6 }}>
              <img src={photoOutside} alt="خارج المحل" style={{ width: 140, borderRadius: 8, maxHeight: 120, objectFit: "cover", display: "block" }} />
              <button onClick={() => setPhotoOutside(null)} style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, padding: "2px 6px", cursor: "pointer" }}>إزالة</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}><Camera size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /> صورة من الداخل للمحل</label>
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => uploadPhoto(e.target.files[0], setPhotoInside)} />
          {photoInside && (
            <div style={{ position: "relative", display: "inline-block", marginTop: 6 }}>
              <img src={photoInside} alt="داخل المحل" style={{ width: 140, borderRadius: 8, maxHeight: 120, objectFit: "cover", display: "block" }} />
              <button onClick={() => setPhotoInside(null)} style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, padding: "2px 6px", cursor: "pointer" }}>إزالة</button>
            </div>
          )}
        </div>
      </div>
      <Field label="موقع المحل">
        <Btn kind="ghost" onClick={pickLocation} style={{ width: "100%", justifyContent: "center" }}>
          <MapPin size={16} /> {location ? "تحديث الموقع (فتح خرائط قوقل)" : "تحديد الموقع (فتح خرائط قوقل)"}
        </Btn>
        {location && (
          <div style={{ fontSize: 12, color: COLORS.success, marginTop: 6 }}>
            تم تحديد الموقع ✓ <a href={location.link} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary }}>عرض على خرائط قوقل</a>
          </div>
        )}
        {locError && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 6 }}>{locError}</div>}
      </Field>
      {err && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="accent" onClick={submit} style={{ flex: 1, justifyContent: "center" }}><Plus size={16} /> {submitLabel}</Btn>
        {onCancel && <Btn kind="ghost" onClick={onCancel}>إلغاء</Btn>}
      </div>
    </div>
  );
}
 
function CustomerForm({ onAdd }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <Card style={{ marginBottom: 18, maxWidth: 560 }}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>إضافة عميل جديد</div>
      <CustomerFieldsEditor
        key={formKey}
        submitLabel="إضافة العميل"
        onSubmit={(vals) => {
          onAdd({ id: uid(), ...vals, createdAt: todayStr() });
          setFormKey((k) => k + 1);
        }}
      />
    </Card>
  );
}
 
function CustomerList({ customers, onRemove, onSaveEdit, showRep }) {
  const [editingId, setEditingId] = useState(null);
  const ordered = [...customers].reverse();
  return (
    <Card>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{showRep ? `كل العملاء (${customers.length})` : `عملائي (${customers.length})`}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ordered.map((c) => (
          <div key={c.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}>
            {editingId === c.id ? (
              <CustomerFieldsEditor
                initial={c}
                submitLabel="حفظ التعديلات"
                onCancel={() => setEditingId(null)}
                onSubmit={(vals) => {
                  onSaveEdit(c.id, vals);
                  setEditingId(null);
                }}
              />
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {c.photoOutside && <img src={c.photoOutside} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />}
                  {c.photoInside && <img src={c.photoInside} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}{showRep && c.repName ? ` — ${c.repName}` : ""}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{c.sector} — {c.city}</div>
                  {c.phone && <div style={{ fontSize: 12, color: COLORS.muted }}>{c.phone}</div>}
                </div>
                {c.location?.link && (
                  <a href={c.location.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: COLORS.primary, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} /> الموقع
                  </a>
                )}
                {onSaveEdit && (
                  <button onClick={() => setEditingId(c.id)} style={{ border: "none", background: "transparent", color: COLORS.primary, cursor: "pointer" }}>
                    <Pencil size={15} />
                  </button>
                )}
                {onRemove && (
                  <button onClick={() => onRemove(c.id)} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {customers.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا يوجد عملاء مسجّلون بعد.</div>}
      </div>
    </Card>
  );
}
 
function CustomersChart({ customers }) {
  const [sector, setSector] = useState(SECTORS[0]);
  const rows = useMemo(() => {
    const counts = {};
    customers.filter((c) => c.sector === sector).forEach((c) => {
      counts[c.city] = (counts[c.city] || 0) + 1;
    });
    return Object.entries(counts).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  }, [customers, sector]);
 
  return (
    <Card>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>عدد العملاء لكل مدينة حسب القطاع</div>
      <Field label="القطاع">
        <select style={inputStyle} value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {rows.length === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: 13 }}>لا يوجد عملاء مسجّلون في هذا القطاع بعد.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 30, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="city" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="عدد العملاء" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={40}>
              <LabelList dataKey="count" position="top" style={{ fontWeight: 700, fontSize: 12, fill: COLORS.primary }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
 
function RepCustomers({ data, updateRepData }) {
  const customers = data.customers || [];
  const addCustomer = (c) => updateRepData({ ...data, customers: [...customers, c] });
  const removeCustomer = (id) => updateRepData({ ...data, customers: customers.filter((c) => c.id !== id) });
  const saveEditCustomer = (id, vals) => updateRepData({ ...data, customers: customers.map((c) => (c.id === id ? { ...c, ...vals } : c)) });
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>إدارة العملاء</h2>
      <CustomerForm onAdd={addCustomer} />
      <div style={{ marginBottom: 18 }}>
        <CustomersChart customers={customers} />
      </div>
      <CustomerList customers={customers} onRemove={removeCustomer} onSaveEdit={saveEditCustomer} />
    </div>
  );
}
 
function AdminCustomers({ reps, repDataMap, updateRepData }) {
  const [repId, setRepId] = useState("all");
  const allCustomers = useMemo(() => {
    const ids = repId === "all" ? reps.map((r) => r.id) : [repId];
    const out = [];
    ids.forEach((id) => {
      const rep = reps.find((r) => r.id === id);
      const data = repDataMap[id] || emptyRepData();
      (data.customers || []).forEach((c) => out.push({ ...c, repName: rep?.name || "", _repId: id }));
    });
    return out;
  }, [repId, reps, repDataMap]);
 
  const addCustomer = (c) => {
    if (repId === "all") return;
    const data = repDataMap[repId] || emptyRepData();
    updateRepData(repId, { ...data, customers: [...(data.customers || []), c] });
  };
  const removeCustomer = (id) => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target) return;
    const data = repDataMap[target._repId] || emptyRepData();
    updateRepData(target._repId, { ...data, customers: (data.customers || []).filter((c) => c.id !== id) });
  };
  const saveEditCustomer = (id, vals) => {
    const target = allCustomers.find((c) => c.id === id);
    if (!target) return;
    const data = repDataMap[target._repId] || emptyRepData();
    updateRepData(target._repId, { ...data, customers: (data.customers || []).map((c) => (c.id === id ? { ...c, ...vals } : c)) });
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>إدارة العملاء</h2>
      <Card style={{ marginBottom: 18, maxWidth: 300 }}>
        <Field label="المندوب">
          <select style={inputStyle} value={repId} onChange={(e) => setRepId(e.target.value)}>
            <option value="all">كل المناديب</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        {repId === "all" && (
          <div style={{ fontSize: 12, color: COLORS.muted }}>اختر مندوبًا محددًا لإضافة عميل جديد باسمه.</div>
        )}
      </Card>
      {repId !== "all" && <CustomerForm onAdd={addCustomer} />}
      <div style={{ marginBottom: 18 }}>
        <CustomersChart customers={allCustomers} />
      </div>
      <CustomerList customers={allCustomers} showRep onRemove={removeCustomer} onSaveEdit={saveEditCustomer} />
    </div>
  );
}
 
function RepPersonalPanel({ rep, data, updateRepData }) {
  const info = data.personalInfo || { personalPhone: "", workPhone: "", email: "", other: "" };
  const [personalPhone, setPersonalPhone] = useState(info.personalPhone || "");
  const [workPhone, setWorkPhone] = useState(info.workPhone || "");
  const [email, setEmail] = useState(info.email || "");
  const [other, setOther] = useState(info.other || "");
  const [saved, setSaved] = useState(false);
 
  const save = () => {
    updateRepData({ ...data, personalInfo: { personalPhone, workPhone, email, other } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>معلوماتي الشخصية</h2>
      <Card style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
          <Avatar src={rep.photo} name={rep.name} size={72} />
          <div style={{ fontWeight: 700, marginTop: 10 }}>{rep.name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>يعمل منذ {rep.startDate}</div>
        </div>
        <Field label="رقم الجوال الشخصي">
          <input style={inputStyle} value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} />
        </Field>
        <Field label="رقم جوال العمل">
          <input style={inputStyle} value={workPhone} onChange={(e) => setWorkPhone(e.target.value)} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="معلومات أخرى">
          <textarea style={{ ...inputStyle, minHeight: 70 }} value={other} onChange={(e) => setOther(e.target.value)} />
        </Field>
        <Btn kind="accent" onClick={save} style={{ width: "100%", justifyContent: "center" }}>حفظ بياناتي</Btn>
        {saved && <div style={{ fontSize: 12, color: COLORS.success, marginTop: 8, textAlign: "center" }}>تم الحفظ.</div>}
      </Card>
    </div>
  );
}
 
function RepApp({ rep, data, updateRepData, onLogout, adminWhatsApp, adminWhatsAppGroup, items }) {
  const [tab, setTab] = useState("daily");
  const nav = [
    { key: "daily", label: "تقريري اليومي", icon: ClipboardList },
    { key: "warehouse", label: "مخزوني", icon: Warehouse },
    { key: "customers", label: "إدارة العملاء", icon: Store },
    { key: "goals", label: "أهدافي", icon: Target },
    { key: "charts", label: "الرسم البياني", icon: BarChart3 },
    { key: "profile", label: "معلوماتي الشخصية", icon: User },
  ];
 
  const exportBackup = useCallback(() => {
    downloadJsonFile(`نسخة-احتياطية-${rep.name}-${todayStr()}`, {
      type: "sales-tracker-backup-rep",
      version: 1,
      exportedAt: new Date().toISOString(),
      repName: rep.name,
      data,
    });
  }, [rep.name, data]);
 
  const importBackup = useCallback(async (file) => {
    const parsed = await readJsonFile(file);
    const incoming = parsed && typeof parsed === "object" && parsed.data ? parsed.data : parsed;
    if (!incoming || typeof incoming !== "object") throw new Error("invalid backup file");
    updateRepData({
      ...emptyRepData(),
      ...incoming,
      personalInfo: { ...emptyRepData().personalInfo, ...(incoming.personalInfo || {}) },
    });
  }, [updateRepData]);
 
  return (
    <Shell title={rep.name} navItems={nav} active={tab} onNav={setTab} onLogout={onLogout} onBackupExport={exportBackup} onBackupImport={importBackup}>
      {tab === "daily" && <RepDaily data={data} updateRepData={updateRepData} rep={rep} adminWhatsApp={adminWhatsApp} adminWhatsAppGroup={adminWhatsAppGroup} />}
      {tab === "warehouse" && <RepWarehouse data={data} updateRepData={updateRepData} items={items} />}
      {tab === "customers" && <RepCustomers data={data} updateRepData={updateRepData} />}
      {tab === "goals" && <RepGoals data={data} />}
      {tab === "charts" && <RepCharts data={data} />}
      {tab === "profile" && <RepPersonalPanel rep={rep} data={data} updateRepData={updateRepData} />}
    </Shell>
  );
}
 
function reportPrintHtml({ repName, date, sales, cash, transfer, network, collection }) {
  const chart = svgBarChart([
    { label: "المبيعات", value: sales, color: SALES_COLOR },
    { label: "نقدي", value: cash, color: COLLECTION_COLOR },
    { label: "حوالة", value: transfer, color: "#59B389" },
    { label: "شبكة", value: network, color: "#1F6E4C" },
    { label: "إجمالي التحصيل", value: collection, color: PERCENT_COLOR },
  ], { width: 460, height: 220 });
  return `
    ${chartCard("المبيعات والتحصيل — " + date, chart)}
    <table>
      <tr><th>البند</th><th>القيمة</th></tr>
      <tr class="row-sales"><td>المبيعات</td><td class="sales">${fmt(sales)}</td></tr>
      <tr class="row-collection"><td>تحصيل نقدي</td><td class="collection">${fmt(cash)}</td></tr>
      <tr class="row-collection"><td>تحصيل حوالة</td><td class="collection">${fmt(transfer)}</td></tr>
      <tr class="row-collection"><td>تحصيل شبكة</td><td class="collection">${fmt(network)}</td></tr>
      <tr class="row-collection"><td><strong>إجمالي التحصيل</strong></td><td class="collection"><strong>${fmt(collection)}</strong></td></tr>
    </table>
  `;
}
 
function RepDaily({ data, updateRepData, rep, adminWhatsApp, adminWhatsAppGroup }) {
  const today = todayStr();
  const minDate = addDays(today, -2);
  const [date, setDate] = useState(today);
  const [sales, setSales] = useState("");
  const [cash, setCash] = useState("");
  const [transfer, setTransfer] = useState("");
  const [network, setNetwork] = useState("");
  const [error, setError] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState(null);
  const [wasMerged, setWasMerged] = useState(false);
  const cm = currentMonth();
  const thisMonthReports = data.reports.filter((r) => monthKey(r.date) === cm).sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalToday = (Number(cash) || 0) + (Number(transfer) || 0) + (Number(network) || 0);
 
  const add = () => {
    if (!date) { setError("اختر التاريخ."); return; }
    if (date > today) { setError("لا يمكن اختيار تاريخ مستقبلي لم يحن بعد."); return; }
    if (date < minDate) { setError("لا يمكن إرسال تقرير لتاريخ أقدم من يومين."); return; }
    if (sales === "" && totalToday === 0) { setError("أدخل المبيعات أو التحصيل."); return; }
    setError("");
    const addedSales = Number(sales) || 0;
    const addedCash = Number(cash) || 0;
    const addedTransfer = Number(transfer) || 0;
    const addedNetwork = Number(network) || 0;
    const existingIndex = data.reports.findIndex((r) => r.date === date);
    let reports, finalReport, merged;
    if (existingIndex >= 0) {
      const existing = data.reports[existingIndex];
      finalReport = {
        date,
        sales: (Number(existing.sales) || 0) + addedSales,
        cash: (Number(existing.cash) || 0) + addedCash,
        transfer: (Number(existing.transfer) || 0) + addedTransfer,
        network: (Number(existing.network) || 0) + addedNetwork,
      };
      reports = data.reports.map((r, i) => (i === existingIndex ? finalReport : r));
      merged = true;
    } else {
      finalReport = { date, sales: addedSales, cash: addedCash, transfer: addedTransfer, network: addedNetwork };
      reports = [...data.reports, finalReport];
      merged = false;
    }
    updateRepData({ ...data, reports });
    setLastSubmitted(finalReport);
    setWasMerged(merged);
    setSales(""); setCash(""); setTransfer(""); setNetwork("");
  };
 
  const printLast = () => {
    if (!lastSubmitted) return;
    downloadReportFile(
      `تقرير-${rep.name}-${lastSubmitted.date}`,
      `تقرير المندوب اليومي`,
      `المندوب: ${rep.name} — التاريخ: ${lastSubmitted.date}`,
      reportPrintHtml({ repName: rep.name, date: lastSubmitted.date, sales: lastSubmitted.sales, cash: lastSubmitted.cash, transfer: lastSubmitted.transfer, network: lastSubmitted.network, collection: reportCollection(lastSubmitted) })
    );
  };
 
  const lastSubmittedText = lastSubmitted &&
    `تقرير المندوب: ${rep.name}\nالتاريخ: ${lastSubmitted.date}\nالمبيعات: ${fmt(lastSubmitted.sales)}\nتحصيل نقدي: ${fmt(lastSubmitted.cash)}\nتحصيل حوالة: ${fmt(lastSubmitted.transfer)}\nتحصيل شبكة: ${fmt(lastSubmitted.network)}\nإجمالي التحصيل: ${fmt(reportCollection(lastSubmitted))}`;
 
  const totals = sumReports(data.reports, cm);
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>تقريري اليومي — {monthLabel(cm)}</h2>
      <Card style={{ marginBottom: 18, maxWidth: 520 }}>
        <Field label="التاريخ">
          <input type="date" style={inputStyle} value={date} min={minDate} max={today} onChange={(e) => { setDate(e.target.value); setError(""); }} />
        </Field>
        <Field label="المبيعات">
          <input type="number" style={inputStyle} value={sales} onChange={(e) => setSales(e.target.value)} />
        </Field>
        <div style={{ fontSize: 13, color: COLORS.muted, margin: "6px 0" }}>التحصيل — أدخل كل نوع على حدة</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}><Banknote size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /> نقدي</label>
            <input type="number" style={inputStyle} value={cash} onChange={(e) => setCash(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}><Repeat size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /> حوالة</label>
            <input type="number" style={inputStyle} value={transfer} onChange={(e) => setTransfer(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}><CreditCard size={14} style={{ verticalAlign: "-2px", marginLeft: 4 }} /> شبكة</label>
            <input type="number" style={inputStyle} value={network} onChange={(e) => setNetwork(e.target.value)} />
          </div>
        </div>
        <div
          style={{
            background: "#E9F6EF", border: `1px solid ${COLLECTION_COLOR}`, borderRadius: 8,
            padding: "10px 14px", margin: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#1F6E4C", fontWeight: 600 }}>إجمالي التحصيل</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1F6E4C" }}>{fmt(totalToday)}</span>
        </div>
        {error && <div style={{ color: COLORS.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <Btn kind="accent" onClick={add}><Plus size={16} /> إرسال التقرير</Btn>
      </Card>
 
      {lastSubmitted && (
        <Card style={{ marginBottom: 18, maxWidth: 520 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {wasMerged
              ? `تم دمج المبلغ مع تقرير ${lastSubmitted.date} الموجود مسبقًا — الإجمالي محدَّث الآن`
              : `تم إرسال تقرير ${lastSubmitted.date} بنجاح`}
          </div>
          <Btn kind="ghost" onClick={printLast} style={{ marginBottom: 12 }}><FileText size={15} /> تنزيل التقرير</Btn>
          <WhatsAppShareBox text={lastSubmittedText} groupLink={adminWhatsAppGroup} />
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>
            ملاحظة: "تنزيل التقرير" يحفظ ملفًا يمكنك فتحه ثم طباعته (Ctrl+P) واختيار "Save as PDF" لحفظه بصيغة PDF. رسالة واتساب تُنسخ تلقائيًا — الصقها في القروب وأرفق الملف يدويًا إذا رغبت.
          </div>
        </Card>
      )}
 
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatBox label="إجمالي مبيعات الشهر" value={fmt(totals.sales)} color={SALES_COLOR} />
        <StatBox label="إجمالي تحصيل الشهر" value={fmt(totals.collection)} color={COLLECTION_COLOR} />
      </div>
 
      <Card>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>تقارير هذا الشهر</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>
          بعد إرسال التقرير لا يمكنك تعديله — التعديل من صلاحية الإدارة فقط. تقرير واحد فقط لكل يوم؛ أي إضافة جديدة لنفس التاريخ تُدمج تلقائيًا مع تقرير ذلك اليوم.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {thisMonthReports.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0" }}>
              <span>{r.date}</span>
              <span style={{ color: SALES_COLOR }}>مبيعات: {fmt(r.sales)}</span>
              <span style={{ color: COLLECTION_COLOR }}>تحصيل: {fmt(reportCollection(r))}</span>
            </div>
          ))}
          {thisMonthReports.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لم تُدخل تقارير هذا الشهر بعد.</div>}
        </div>
      </Card>
    </div>
  );
}
 
function RepGoals({ data }) {
  const cm = currentMonth();
  const goal = goalForMonth(data.goals, cm);
  const totals = sumReports(data.reports, cm);
  const wholeTotals = sumReports(data.reports, null);
  const salesPct = goal && goal.salesTarget ? (totals.sales / goal.salesTarget) * 100 : null;
  const collTargetAmount = goal ? (totals.sales * (goal.collectionPercentTarget || 0)) / 100 : null;
  const collPct = collTargetAmount ? (totals.collection / collTargetAmount) * 100 : null;
  const monthRatio = totals.sales ? (totals.collection / totals.sales) * 100 : 0;
  const wholeRatio = wholeTotals.sales ? (wholeTotals.collection / wholeTotals.sales) * 100 : 0;
 
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>أهدافي — {monthLabel(cm)}</h2>
      {!goal ? (
        <Card>لم تحدد الإدارة هدفًا لهذا الشهر بعد.</Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBox label="هدف المبيعات" value={fmt(goal.salesTarget)} color={SALES_COLOR} />
            <StatBox label="مبيعات محققة" value={fmt(totals.sales)} sub={salesPct !== null ? `تحقيق ${pct(salesPct)}` : ""} color={SALES_COLOR} />
            <StatBox label="نسبة هدف التحصيل" value={pct(goal.collectionPercentTarget)} color={COLLECTION_COLOR} />
            <StatBox label="تحصيل محقق" value={fmt(totals.collection)} sub={collPct !== null ? `تحقيق ${pct(collPct)}` : ""} color={COLLECTION_COLOR} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBox label="نسبة التحصيل من المبيعات (الشهر الحالي)" value={pct(monthRatio)} />
            <StatBox label="نسبة التحصيل من المبيعات (كامل فترة العمل)" value={pct(wholeRatio)} />
          </div>
        </div>
      )}
    </div>
  );
}
 
function RepCharts({ data }) {
  const cm = currentMonth();
  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>الرسم البياني — {monthLabel(cm)}</h2>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>
        يعرض هذا القسم شهرك الحالي فقط. بعد نهاية الشهر يبدأ رسم بياني جديد للشهر التالي تلقائيًا.
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>المبيعات والتحصيل — {monthLabel(cm)}</div>
        <MonthlyChart reports={data.reports} month={cm} />
      </Card>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>أيام العمل مقابل أيام بلا عمل — {monthLabel(cm)}</div>
        <WorkDaysChart reports={data.reports} month={cm} />
      </Card>
      <Card>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>أنواع التحصيل — {monthLabel(cm)}</div>
        <CollectionTypeChart reports={data.reports} month={cm} />
      </Card>
    </div>
  );
}
 
function RepWarehouse({ data, updateRepData, items }) {
  const stock = data.warehouseStock || {};
  const rows = stockRows(stock, items);
  const shipments = data.shipments || [];
  const [sellItemId, setSellItemId] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const pendingShipment = shipments.find((s) => s.status === "pending");
  const [correcting, setCorrecting] = useState(false);
  const [correctItemId, setCorrectItemId] = useState("");
  const [correctDelta, setCorrectDelta] = useState("");
  const [draftCorrections, setDraftCorrections] = useState({});

  const approveShipment = () => {
    if (!pendingShipment) return;
    const next = shipments.map((s) => (s.id === pendingShipment.id ? { ...s, status: "approved" } : s));
    updateRepData({ ...data, shipments: next });
  };

  const startCorrection = () => {
    setDraftCorrections({});
    setCorrectItemId("");
    setCorrectDelta("");
    setCorrecting(true);
  };

  const applyDraftDelta = () => {
    if (!correctItemId) return;
    setDraftCorrections({ ...draftCorrections, [correctItemId]: Number(correctDelta) || 0 });
    setCorrectItemId(""); setCorrectDelta("");
  };

  const submitCorrection = () => {
    if (!pendingShipment) return;
    const correction = pendingShipment.items.map((e) => ({
      itemId: e.itemId,
      delta: Number(draftCorrections[e.itemId]) || 0,
    }));
    const next = shipments.map((s) => (s.id === pendingShipment.id ? { ...s, status: "correction_requested", correction } : s));
    updateRepData({ ...data, shipments: next });
    setCorrecting(false);
  };

  const sellPartial = () => {
    if (!sellItemId || !sellQty) return;
    const available = Number(stock[sellItemId]) || 0;
    const qty = Number(sellQty) || 0;
    if (qty <= 0 || qty > available) { setErr("الكمية غير صحيحة."); return; }
    setErr("");
    const nextStock = subQty(stock, sellItemId, qty);
    const nextLog = [...(data.soldLog || []), { id: uid(), itemId: sellItemId, quantity: qty, date: todayStr() }];
    updateRepData({ ...data, warehouseStock: nextStock, soldLog: nextLog });
    setSellItemId(""); setSellQty("");
    setMsg("تم تسجيل البيع.");
    setTimeout(() => setMsg(""), 2000);
  };

  const sellAll = () => {
    if (rows.length === 0) return;
    const today = todayStr();
    const newEntries = rows.map((r) => ({ id: uid(), itemId: r.itemId, quantity: r.qty, date: today }));
    updateRepData({ ...data, warehouseStock: {}, soldLog: [...(data.soldLog || []), ...newEntries] });
    setMsg("تم تسجيل بيع كامل البضاعة المتاحة.");
    setTimeout(() => setMsg(""), 2000);
  };

  const cm = currentMonth();
  const months = useMemo(() => {
    const dates = (data.soldLog || []).map((s) => s.date);
    if (dates.length === 0) return [cm];
    const min = dates.reduce((a, b) => (a < b ? a : b));
    return monthsBetween(monthKey(min), cm);
  }, [data.soldLog, cm]);
  const monthlyData = soldMonthlySeries(data.soldLog, months);
  const totalSoldQty = (data.soldLog || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const statusLabel = (st) => (
    st === "pending" ? "بانتظار مراجعتك" :
    st === "correction_requested" ? "بانتظار الإدارة" :
    st === "approved" ? "تم الاعتماد" : "تمت التسوية"
  );
  const statusColors = (st) => (
    st === "pending" ? { bg: "#FBF3E3", fg: "#8A6416" } :
    st === "correction_requested" ? { bg: "#FDE8E7", fg: COLORS.danger } :
    { bg: "#E9F6EF", fg: COLORS.success }
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 18px", color: COLORS.ink }}>مخزوني</h2>

      {pendingShipment && !correcting && (
        <Card style={{ marginBottom: 18, borderRight: `4px solid ${COLORS.accent}`, background: "#FBF3E3" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            تم توريد بضاعة جديدة لمخزنك بتاريخ {pendingShipment.date} من {pendingShipment.sourceWarehouseName} — يرجى مراجعة الكميات
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, fontSize: 13 }}>
            {pendingShipment.items.map((e) => (
              <div key={e.itemId} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{itemById(items, e.itemId)?.name || "—"}</span>
                <span style={{ fontWeight: 700 }}>{fmt(e.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="accent" onClick={approveShipment}>اعتماد الكمية</Btn>
            <Btn kind="ghost" onClick={startCorrection}>طلب تصحيح الكمية</Btn>
          </div>
        </Card>
      )}

      {pendingShipment && correcting && (
        <Card style={{ marginBottom: 18, borderRight: `4px solid ${COLORS.primary}` }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>طلب تصحيح كمية التوريد</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Field label="اختر الصنف المراد تعديله">
                <select style={inputStyle} value={correctItemId} onChange={(e) => setCorrectItemId(e.target.value)}>
                  <option value="">— اختر —</option>
                  {pendingShipment.items.map((e) => (
                    <option key={e.itemId} value={e.itemId}>{itemById(items, e.itemId)?.name} (المدخلة: {fmt(e.qty)})</option>
                  ))}
                </select>
              </Field>
            </div>
            {correctItemId && (
              <>
                <div style={{ minWidth: 120 }}>
                  <Field label="التعديل (+/-)">
                    <input type="number" style={inputStyle} value={correctDelta} onChange={(e) => setCorrectDelta(e.target.value)} placeholder="مثال: -2 أو 3" />
                  </Field>
                </div>
                <Btn kind="accent" onClick={applyDraftDelta} style={{ marginBottom: 12 }}>تحديد</Btn>
              </>
            )}
          </div>

          {Object.keys(draftCorrections).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>التعديلات المدخلة:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                {Object.entries(draftCorrections).map(([itemId, delta]) => (
                  <div key={itemId} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{itemById(items, itemId)?.name || "—"}</span>
                    <span style={{ fontWeight: 700, color: Number(delta) < 0 ? COLORS.danger : COLORS.success }}>
                      {Number(delta) > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="accent" onClick={submitCorrection}>إرسال للإدارة</Btn>
            <Btn kind="ghost" onClick={() => setCorrecting(false)}>إلغاء</Btn>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 600 }}>الكميات المتوفرة حاليًا</div>
          {rows.length > 0 && (
            <Btn kind="danger" onClick={sellAll}><PackageCheck size={16} /> تم بيع كامل البضاعة المتاحة</Btn>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.itemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0" }}>
              <span>{r.item?.name || "—"}</span>
              <span style={{ color: COLORS.muted }}>الرمز: {r.item?.code}</span>
              <span style={{ fontWeight: 700 }}>المتبقي: {fmt(r.qty)}</span>
            </div>
          ))}
          {rows.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد بضاعة في مخزنك حاليًا.</div>}
        </div>
        {msg && <div style={{ fontSize: 12, color: COLORS.success, marginTop: 8 }}>{msg}</div>}
      </Card>

      {rows.length > 0 && (
        <Card style={{ marginBottom: 18, maxWidth: 480 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>تسجيل بيع كمية من صنف</div>
          <Field label="الصنف">
            <select style={inputStyle} value={sellItemId} onChange={(e) => { setSellItemId(e.target.value); setErr(""); }}>
              <option value="">— اختر —</option>
              {rows.map((r) => <option key={r.itemId} value={r.itemId}>{r.item?.name} (المتبقي: {fmt(r.qty)})</option>)}
            </select>
          </Field>
          <Field label="الكمية المباعة">
            <input type="number" style={inputStyle} value={sellQty} onChange={(e) => { setSellQty(e.target.value); setErr(""); }} />
          </Field>
          {err && <div style={{ fontSize: 13, color: COLORS.danger, marginBottom: 8 }}>{err}</div>}
          <Btn kind="accent" onClick={sellPartial}><Plus size={16} /> تسجيل البيع</Btn>
        </Card>
      )}

      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>سجل التوريدات</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...shipments].reverse().map((sh) => {
            const sc = statusColors(sh.status);
            return (
              <div key={sh.id} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span>{sh.date} — {sh.sourceWarehouseName}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.fg }}>
                    {statusLabel(sh.status)}
                  </span>
                </div>
              </div>
            );
          })}
          {shipments.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>لا توجد توريدات مسجّلة بعد.</div>}
        </div>
      </Card>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>الكميات المباعة شهريًا</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="الكمية" fill={COLLECTION_COLOR} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="الكمية" position="top" style={{ fill: COLLECTION_COLOR, fontWeight: 700, fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div style={{ fontWeight: 600 }}>إجمالي الكميات المباعة (كامل المدة): {fmt(totalSoldQty)}</div>
      </Card>
    </div>
  );
}

// ================= ROOT =================
export default function App() {
  const [loading, setLoading] = useState(true);
  const [reps, setRepsState] = useState([]);
  const [repDataMap, setRepDataMap] = useState({});
  const [session, setSession] = useState(null); // { role, repId }
  const [adminPassword, setAdminPasswordState] = useState(DEFAULT_ADMIN_PASSWORD);
  const [adminWhatsApp, setAdminWhatsAppState] = useState("");
  const [adminWhatsAppGroup, setAdminWhatsAppGroupState] = useState("");
  const [adminMembers, setAdminMembersState] = useState([]);
  const [items, setItemsState] = useState([]);
  const [factoryWarehouses, setFactoryWarehousesState] = useState([]);
  const [factoryStock, setFactoryStockState] = useState({});
 
  useEffect(() => {
    (async () => {
      const list = (await storageGet("reps-list", true)) || [];
      setRepsState(list);
      const map = {};
      for (const r of list) {
        const loaded = (await storageGet(`rep-data:${r.id}`, true)) || emptyRepData();
        map[r.id] = { ...emptyRepData(), ...loaded, personalInfo: { ...emptyRepData().personalInfo, ...(loaded.personalInfo || {}) } };
      }
      setRepDataMap(map);
      const storedPass = await storageGet(ADMIN_PASSWORD_KEY, true);
      if (storedPass) {
        setAdminPasswordState(storedPass);
      } else {
        await storageSet(ADMIN_PASSWORD_KEY, DEFAULT_ADMIN_PASSWORD, true);
      }
      const storedWa = await storageGet("admin-whatsapp", true);
      if (storedWa) setAdminWhatsAppState(storedWa);
      const storedWaGroup = await storageGet("admin-whatsapp-group", true);
      if (storedWaGroup) setAdminWhatsAppGroupState(storedWaGroup);
      const storedMembers = await storageGet("admin-members", true);
      if (storedMembers) setAdminMembersState(storedMembers);
      const storedItems = await storageGet("items-catalog", true);
      if (storedItems) setItemsState(storedItems);
      const storedFactoryWarehouses = await storageGet("factory-warehouses", true);
      if (storedFactoryWarehouses) {
        setFactoryWarehousesState(storedFactoryWarehouses);
      } else {
        const defaults = defaultFactoryWarehouses();
        setFactoryWarehousesState(defaults);
        await storageSet("factory-warehouses", defaults, true);
      }
      const storedFactoryStock = await storageGet("factory-stock", true);
      if (storedFactoryStock) setFactoryStockState(storedFactoryStock);
      setLoading(false);
    })();
  }, []);
 
  const setAdminPassword = useCallback((next) => {
    setAdminPasswordState(next);
    storageSet(ADMIN_PASSWORD_KEY, next, true);
  }, []);
 
  const setAdminWhatsApp = useCallback((next) => {
    setAdminWhatsAppState(next);
    storageSet("admin-whatsapp", next, true);
  }, []);
 
  const setAdminWhatsAppGroup = useCallback((next) => {
    setAdminWhatsAppGroupState(next);
    storageSet("admin-whatsapp-group", next, true);
  }, []);
 
  const setAdminMembers = useCallback((next) => {
    setAdminMembersState(next);
    storageSet("admin-members", next, true);
  }, []);

  const setItems = useCallback((next) => {
    setItemsState(next);
    storageSet("items-catalog", next, true);
  }, []);

  const setFactoryWarehouses = useCallback((next) => {
    setFactoryWarehousesState(next);
    storageSet("factory-warehouses", next, true);
  }, []);

  const setFactoryStock = useCallback((next) => {
    setFactoryStockState(next);
    storageSet("factory-stock", next, true);
  }, []);
 
  const verifyAdminMemberLogin = useCallback((memberId, password) => {
    const member = adminMembers.find((m) => m.id === memberId);
    return member && member.password === password;
  }, [adminMembers]);
 
  const verifyRepLogin = useCallback((repId, password) => {
    const rep = reps.find((r) => r.id === repId);
    return rep && rep.password === password;
  }, [reps]);
 
  const setReps = useCallback((next) => {
    setRepsState(next);
    storageSet("reps-list", next, true);
    setRepDataMap((prev) => {
      const map = { ...prev };
      next.forEach((r) => { if (!map[r.id]) map[r.id] = emptyRepData(); });
      return map;
    });
  }, []);
 
  const updateRepData = useCallback((repId, newData) => {
    setRepDataMap((prev) => ({ ...prev, [repId]: newData }));
    storageSet(`rep-data:${repId}`, newData, true);
  }, []);
 
  const exportAdminBackup = useCallback(() => {
    downloadJsonFile(`نسخة-احتياطية-الادارة-${todayStr()}`, {
      type: "sales-tracker-backup-admin",
      version: 1,
      exportedAt: new Date().toISOString(),
      reps,
      repDataMap,
      adminPassword,
      adminWhatsApp,
      adminWhatsAppGroup,
      adminMembers,
    });
  }, [reps, repDataMap, adminPassword, adminWhatsApp, adminWhatsAppGroup, adminMembers]);
 
  const importAdminBackup = useCallback(async (file) => {
    const parsed = await readJsonFile(file);
    if (!parsed || typeof parsed !== "object") throw new Error("invalid backup file");
    const nextReps = Array.isArray(parsed.reps) ? parsed.reps : [];
    const dataMap = parsed.repDataMap && typeof parsed.repDataMap === "object" ? parsed.repDataMap : {};
    setReps(nextReps);
    nextReps.forEach((r) => {
      const incoming = dataMap[r.id] || emptyRepData();
      updateRepData(r.id, {
        ...emptyRepData(),
        ...incoming,
        personalInfo: { ...emptyRepData().personalInfo, ...(incoming.personalInfo || {}) },
      });
    });
    if (typeof parsed.adminPassword === "string" && parsed.adminPassword) setAdminPassword(parsed.adminPassword);
    setAdminWhatsApp(typeof parsed.adminWhatsApp === "string" ? parsed.adminWhatsApp : "");
    setAdminWhatsAppGroup(typeof parsed.adminWhatsAppGroup === "string" ? parsed.adminWhatsAppGroup : "");
    setAdminMembers(Array.isArray(parsed.adminMembers) ? parsed.adminMembers : []);
  }, [setReps, updateRepData, setAdminPassword, setAdminWhatsApp, setAdminWhatsAppGroup, setAdminMembers]);
 
  if (!session) {
    return (
      <Login
        reps={reps}
        onLogin={setSession}
        loading={loading}
        adminPassword={adminPassword}
        verifyRepLogin={verifyRepLogin}
        adminMembers={adminMembers}
        verifyAdminMemberLogin={verifyAdminMemberLogin}
      />
    );
  }
 
  if (session.role === "admin") {
    const memberInfo = !session.isMaster ? adminMembers.find((m) => m.id === session.memberId) : null;
    return (
      <AdminApp
        reps={reps}
        repDataMap={repDataMap}
        setReps={setReps}
        updateRepData={updateRepData}
        onLogout={() => setSession(null)}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        adminWhatsApp={adminWhatsApp}
        setAdminWhatsApp={setAdminWhatsApp}
        adminWhatsAppGroup={adminWhatsAppGroup}
        setAdminWhatsAppGroup={setAdminWhatsAppGroup}
        isMaster={!!session.isMaster}
        adminMembers={adminMembers}
        setAdminMembers={setAdminMembers}
        memberName={memberInfo?.name}
        onBackupExport={exportAdminBackup}
        onBackupImport={importAdminBackup}
        items={items}
        setItems={setItems}
        factoryWarehouses={factoryWarehouses}
        setFactoryWarehouses={setFactoryWarehouses}
        factoryStock={factoryStock}
        setFactoryStock={setFactoryStock}
      />
    );
  }
 
  const rep = reps.find((r) => r.id === session.repId);
  if (!rep) {
    return (
      <Login
        reps={reps}
        onLogin={setSession}
        loading={loading}
        adminPassword={adminPassword}
        verifyRepLogin={verifyRepLogin}
        adminMembers={adminMembers}
        verifyAdminMemberLogin={verifyAdminMemberLogin}
      />
    );
  }
  const data = repDataMap[rep.id] || emptyRepData();
 
  return (
    <RepApp
      rep={rep}
      data={data}
      updateRepData={(d) => updateRepData(rep.id, d)}
      onLogout={() => setSession(null)}
      adminWhatsApp={adminWhatsApp}
      adminWhatsAppGroup={adminWhatsAppGroup}
      items={items}
    />
  );
}
