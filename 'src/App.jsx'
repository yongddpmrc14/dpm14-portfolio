import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Compass, ShieldCheck, Truck, GraduationCap, Briefcase, Plus, X, Trash2,
  ImagePlus, Loader2, MapPin, BarChart3, LayoutGrid, FileDown, Printer,
} from "lucide-react";
import { supabase, IMAGE_BUCKET } from "./supabaseClient";

const CATEGORIES = [
  { id: "strategy", label: "ส่วนยุทธศาสตร์และการจัดการ", icon: Compass, color: "#1F2937" },
  { id: "prevention", label: "ส่วนป้องกันและปฏิบัติการ", icon: ShieldCheck, color: "#C2410C" },
  { id: "resource", label: "ส่วนสนับสนุนทรัพยากรกู้ภัย", icon: Truck, color: "#0B5394" },
  { id: "training", label: "ส่วนฝึกอบรม", icon: GraduationCap, color: "#15803D" },
  { id: "admin", label: "ฝ่ายบริหารทั่วไป", icon: Briefcase, color: "#6B5B4A" },
];

const MIN_IMAGES = 3;
const MAX_IMAGES = 5;
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function catInfo(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function formatThaiDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.entry_date,
    location: row.location || "",
    staff: row.staff_name || "",
    description: row.description || "",
    images: row.images || [],
    createdAt: row.created_at,
  };
}

// Resize + compress a picked file down to a JPEG Blob before upload.
function compressImage(file, maxWidth = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("gallery");
  const [reportPeriod, setReportPeriod] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    category: "strategy",
    date: new Date().toISOString().slice(0, 10),
    location: "",
    staff: "",
    description: "",
    images: [], // { blob, previewUrl }
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_entries")
          .select("*")
          .order("entry_date", { ascending: false });
        if (error) throw error;
        setEntries((data || []).map(mapRow));
      } catch (err) {
        console.error(err);
        setSaveError("โหลดข้อมูลไม่สำเร็จ ตรวจสอบการเชื่อมต่อกับฐานข้อมูล");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const room = MAX_IMAGES - form.images.length;
    const toAdd = files.slice(0, room);
    if (files.length > room) {
      setSaveError(`ใส่รูปได้สูงสุด ${MAX_IMAGES} ภาพ เพิ่มให้แล้ว ${Math.max(room, 0)} ภาพ`);
    }
    try {
      const blobs = await Promise.all(toAdd.map((f) => compressImage(f)));
      const items = blobs.map((blob) => ({ blob, previewUrl: URL.createObjectURL(blob) }));
      setForm((f) => ({ ...f, images: [...f.images, ...items] }));
    } catch {
      setSaveError("ไม่สามารถอ่านรูปภาพบางไฟล์ได้");
    }
    e.target.value = "";
  }

  function removeFormImage(idx) {
    setForm((f) => {
      const item = f.images[idx];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return { ...f, images: f.images.filter((_, i) => i !== idx) };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    if (form.images.length < MIN_IMAGES) {
      setSaveError(`กรุณาใส่รูปอย่างน้อย ${MIN_IMAGES} ภาพ (ตอนนี้มี ${form.images.length} ภาพ)`);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const entryId = crypto.randomUUID();
      const uploadedUrls = [];
      for (let i = 0; i < form.images.length; i++) {
        const path = `${entryId}/${i}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, form.images[i].blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
      const { data: inserted, error: insErr } = await supabase
        .from("portfolio_entries")
        .insert([{
          id: entryId,
          title: form.title.trim(),
          category: form.category,
          entry_date: form.date,
          location: form.location.trim(),
          staff_name: form.staff.trim(),
          description: form.description.trim(),
          images: uploadedUrls,
        }])
        .select();
      if (insErr) throw insErr;

      setEntries((prev) => [mapRow(inserted[0]), ...prev]);
      form.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setShowForm(false);
      setForm({
        title: "",
        category: "strategy",
        date: new Date().toISOString().slice(0, 10),
        location: "",
        staff: "",
        description: "",
        images: [],
      });
    } catch (err) {
      console.error(err);
      setSaveError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const { data: list } = await supabase.storage.from(IMAGE_BUCKET).list(id);
      if (list && list.length) {
        await supabase.storage.from(IMAGE_BUCKET).remove(list.map((f) => `${id}/${f.name}`));
      }
      const { error } = await supabase.from("portfolio_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries((prev) => prev.filter((en) => en.id !== id));
      setViewing(null);
    } catch (err) {
      console.error(err);
      setSaveError("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  const visible = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  const periods = Array.from(new Set(entries.map((e) => e.date?.slice(0, 7)).filter(Boolean))).sort().reverse();

  function periodLabel(p) {
    const [y, m] = p.split("-");
    return `${THAI_MONTHS[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
  }

  const reportEntries = reportPeriod === "all" ? entries : entries.filter((e) => e.date?.slice(0, 7) === reportPeriod);

  const reportCounts = CATEGORIES.map((c) => ({
    ...c,
    count: reportEntries.filter((e) => e.category === c.id).length,
  }));
  const maxCount = Math.max(1, ...reportCounts.map((c) => c.count));

  function exportExcel() {
    const rows = reportEntries
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => ({
        "วันที่ปฏิบัติงาน": formatThaiDate(e.date),
        "ส่วนงาน": catInfo(e.category).label,
        "ชื่อผลงาน/กิจกรรม": e.title,
        "สถานที่": e.location || "",
        "ผู้บันทึก": e.staff || "",
        "รายละเอียด": e.description || "",
        "จำนวนภาพ": e.images.length,
      }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 40 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "รายงานผลงาน");
    const label = reportPeriod === "all" ? "ทั้งหมด" : reportPeriod;
    XLSX.writeFile(wb, `รายงานผลงาน-ปภ14-${label}.xlsx`);
  }

  function printReport() {
    window.print();
  }

  return (
    <div style={{ fontFamily: "'Sarabun', sans-serif", background: "#F6F3EE", minHeight: "100%", color: "#292420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@600;700&family=Sarabun:wght@400;500;600&display=swap');
        .kanit { font-family: 'Kanit', sans-serif; }
        .card-hover { transition: transform .15s ease, box-shadow .15s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(41,36,32,0.12); }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #D8D0C4; border-radius: 3px; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1F2A24", color: "#F6F3EE" }} className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <div style={{ color: "#E8590C" }} className="text-xs font-semibold tracking-wide mb-1">
              กรมป้องกันและบรรเทาสาธารณภัย
            </div>
            <h1 className="kanit text-2xl sm:text-3xl font-bold leading-tight">ศูนย์ ปภ. เขต 14 อุดรธานี</h1>
            <p className="text-sm mt-1" style={{ color: "#C9C2B4" }}>
              คลังผลงานการปฏิบัติงาน · บันทึกภาพและรายละเอียดการทำงานของเจ้าหน้าที่
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="kanit text-3xl font-bold" style={{ color: "#E8590C" }}>{entries.length}</div>
            <div className="text-xs" style={{ color: "#C9C2B4" }}>ผลงานทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 flex gap-2 no-print">
        <button
          onClick={() => setView("gallery")}
          className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
          style={view === "gallery" ? { background: "#fff", color: "#1F2A24", border: "1px solid #E7E1D5" } : { color: "#8A8175" }}
        >
          <LayoutGrid size={15} /> แกลเลอรีผลงาน
        </button>
        <button
          onClick={() => setView("report")}
          className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
          style={view === "report" ? { background: "#fff", color: "#1F2A24", border: "1px solid #E7E1D5" } : { color: "#8A8175" }}
        >
          <BarChart3 size={15} /> รายงานสรุป
        </button>
      </div>

      {/* Filters + Add */}
      {view === "gallery" && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className="text-sm px-3 py-1.5 rounded-full border"
            style={filter === "all"
              ? { background: "#1F2A24", color: "#F6F3EE", borderColor: "#1F2A24" }
              : { background: "transparent", color: "#5B5347", borderColor: "#D8D0C4" }}
          >
            ทั้งหมด
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className="text-sm px-3 py-1.5 rounded-full border flex items-center gap-1.5"
                style={active
                  ? { background: c.color, color: "#fff", borderColor: c.color }
                  : { background: "transparent", color: "#5B5347", borderColor: "#D8D0C4" }}
              >
                <Icon size={14} />
                {c.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto text-sm px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5"
            style={{ background: "#E8590C", color: "#fff" }}
          >
            <Plus size={16} /> เพิ่มผลงาน
          </button>
        </div>
      )}

      {saveError && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-3 no-print">
          <div className="text-sm px-3 py-2 rounded-md" style={{ background: "#FDECEC", color: "#B91C1C" }}>
            {saveError}
          </div>
        </div>
      )}

      {/* Grid */}
      {view === "gallery" && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-sm" style={{ color: "#8A8175" }}>
              <Loader2 className="animate-spin mr-2" size={18} /> กำลังโหลดข้อมูล...
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20 rounded-xl border-2 border-dashed" style={{ borderColor: "#D8D0C4" }}>
              <p className="kanit text-lg font-semibold" style={{ color: "#5B5347" }}>ยังไม่มีผลงานในหมวดนี้</p>
              <p className="text-sm mt-1" style={{ color: "#8A8175" }}>กดปุ่ม "เพิ่มผลงาน" เพื่อบันทึกภาพและรายละเอียดการทำงานครั้งแรก</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {visible.map((entry) => {
                const cat = catInfo(entry.category);
                const Icon = cat.icon;
                return (
                  <button
                    key={entry.id}
                    onClick={() => { setViewing(entry); setActiveImgIdx(0); }}
                    className="card-hover text-left rounded-xl overflow-hidden bg-white"
                    style={{ border: "1px solid #E7E1D5" }}
                  >
                    <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                      {entry.images.length ? (
                        <img src={entry.images[0]} alt={entry.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus size={28} style={{ color: "#C9C2B4" }} />
                      )}
                      {entry.images.length > 1 && (
                        <span
                          className="absolute bottom-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(31,42,36,0.7)", color: "#fff" }}
                        >
                          {entry.images.length} ภาพ
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: cat.color }}>
                        <Icon size={13} /> {cat.label}
                      </div>
                      <div className="font-semibold text-sm leading-snug" style={{ color: "#292420" }}>{entry.title}</div>
                      <div className="text-xs mt-1.5" style={{ color: "#8A8175" }}>
                        {formatThaiDate(entry.date)}{entry.location ? ` · ${entry.location}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Report */}
      {view === "report" && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 print-area">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 no-print">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: "#5B5347" }}>ช่วงเวลา</label>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5"
                style={{ border: "1px solid #D8D0C4" }}
              >
                <option value="all">ทั้งหมด</option>
                {periods.map((p) => (
                  <option key={p} value={p}>{periodLabel(p)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportExcel}
                disabled={reportEntries.length === 0}
                className="text-sm px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: "#15803D", color: "#fff" }}
              >
                <FileDown size={15} /> ส่งออก Excel
              </button>
              <button
                onClick={printReport}
                disabled={reportEntries.length === 0}
                className="text-sm px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: "#1F2A24", color: "#F6F3EE" }}
              >
                <Printer size={15} /> พิมพ์ / บันทึก PDF
              </button>
            </div>
          </div>

          <div className="kanit text-lg font-bold mb-1">
            รายงานสรุปผลงาน {reportPeriod === "all" ? "ทั้งหมด" : periodLabel(reportPeriod)}
          </div>
          <p className="text-sm mb-5" style={{ color: "#8A8175" }}>
            ศูนย์ ปภ. เขต 14 อุดรธานี · {reportEntries.length} ผลงาน
          </p>

          <div className="bg-white rounded-xl p-4 sm:p-5 mb-5" style={{ border: "1px solid #E7E1D5" }}>
            <div className="text-sm font-semibold mb-3" style={{ color: "#5B5347" }}>จำนวนผลงานแยกตามส่วนงาน</div>
            <div className="space-y-2.5">
              {reportCounts.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs w-48 shrink-0" style={{ color: "#3D372F" }}>
                      <Icon size={13} style={{ color: c.color }} /> {c.label}
                    </div>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#F0ECE3" }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: c.color }} />
                    </div>
                    <div className="text-xs font-medium w-6 text-right" style={{ color: "#3D372F" }}>{c.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #E7E1D5" }}>
            <div className="text-sm font-semibold px-4 sm:px-5 py-3" style={{ borderBottom: "1px solid #E7E1D5", color: "#5B5347" }}>
              รายการผลงาน
            </div>
            {reportEntries.length === 0 ? (
              <div className="text-center py-14 text-sm" style={{ color: "#8A8175" }}>ไม่มีผลงานในช่วงเวลานี้</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#FAF8F4", color: "#8A8175" }}>
                      <th className="text-left font-medium px-4 sm:px-5 py-2">วันที่</th>
                      <th className="text-left font-medium px-4 py-2">ส่วนงาน</th>
                      <th className="text-left font-medium px-4 py-2">ชื่อผลงาน</th>
                      <th className="text-left font-medium px-4 py-2 no-print">สถานที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportEntries
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((e) => {
                        const cat = catInfo(e.category);
                        return (
                          <tr key={e.id} style={{ borderTop: "1px solid #F0ECE3" }}>
                            <td className="px-4 sm:px-5 py-2 whitespace-nowrap" style={{ color: "#5B5347" }}>{formatThaiDate(e.date)}</td>
                            <td className="px-4 py-2" style={{ color: cat.color }}>{cat.label}</td>
                            <td className="px-4 py-2 font-medium">{e.title}</td>
                            <td className="px-4 py-2 no-print" style={{ color: "#8A8175" }}>{e.location || "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(31,42,36,0.55)" }}>
          <form onSubmit={handleSubmit} className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-white" style={{ borderBottom: "1px solid #E7E1D5" }}>
              <h2 className="kanit text-lg font-semibold">เพิ่มผลงานใหม่</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#8A8175" }}>
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: "#5B5347" }}>
                    รูปภาพหน้างาน ({MIN_IMAGES}-{MAX_IMAGES} ภาพ) *
                  </label>
                  <span className="text-xs" style={{ color: form.images.length < MIN_IMAGES ? "#B91C1C" : "#15803D" }}>
                    {form.images.length}/{MAX_IMAGES}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                      <img src={img.previewUrl} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFormImage(idx)}
                        className="absolute top-1 right-1 rounded-full p-1"
                        style={{ background: "rgba(31,42,36,0.7)", color: "#fff" }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.images.length < MAX_IMAGES && (
                    <label
                      className="flex flex-col items-center justify-center rounded-lg cursor-pointer aspect-square"
                      style={{ border: "2px dashed #D8D0C4", background: "#FAF8F4" }}
                    >
                      <ImagePlus size={18} style={{ color: "#8A8175" }} />
                      <span className="text-[11px] mt-1 text-center px-1" style={{ color: "#8A8175" }}>เพิ่มรูป</span>
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#5B5347" }}>ชื่อผลงาน / กิจกรรม *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="เช่น ซ้อมแผนอพยพอุทกภัย อ.เมืองอุดรธานี"
                  className="w-full text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #D8D0C4" }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#5B5347" }}>ส่วนงาน</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = form.category === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setForm((f) => ({ ...f, category: c.id }))}
                        className="text-xs px-3 py-1.5 rounded-full border flex items-center gap-1"
                        style={active
                          ? { background: c.color, color: "#fff", borderColor: c.color }
                          : { background: "transparent", color: "#5B5347", borderColor: "#D8D0C4" }}
                      >
                        <Icon size={12} /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#5B5347" }}>วันที่ปฏิบัติงาน *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #D8D0C4" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "#5B5347" }}>สถานที่</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="อำเภอ/ตำบล"
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #D8D0C4" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#5B5347" }}>ผู้บันทึก</label>
                <input
                  value={form.staff}
                  onChange={(e) => setForm((f) => ({ ...f, staff: e.target.value }))}
                  placeholder="ชื่อเจ้าหน้าที่"
                  className="w-full text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #D8D0C4" }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "#5B5347" }}>รายละเอียดการปฏิบัติงาน</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="สรุปเหตุการณ์ การช่วยเหลือ จำนวนกำลังพล/อุปกรณ์ที่ใช้ ผลการปฏิบัติงาน"
                  className="w-full text-sm rounded-lg px-3 py-2"
                  style={{ border: "1px solid #D8D0C4" }}
                />
              </div>
            </div>

            <div className="px-5 pb-5 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                style={{ background: "#1F2A24", color: "#F6F3EE" }}
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                บันทึกผลงาน
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail view modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(31,42,36,0.55)" }}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="relative">
              {viewing.images.length ? (
                <img src={viewing.images[activeImgIdx] || viewing.images[0]} alt={viewing.title} className="w-full aspect-[16/9] object-cover" />
              ) : (
                <div className="w-full aspect-[16/9] flex items-center justify-center" style={{ background: "#FAF8F4" }}>
                  <ImagePlus size={28} style={{ color: "#C9C2B4" }} />
                </div>
              )}
              <button
                onClick={() => setViewing(null)}
                className="absolute top-3 right-3 rounded-full p-1.5"
                style={{ background: "rgba(31,42,36,0.65)", color: "#fff" }}
              >
                <X size={18} />
              </button>
            </div>
            {viewing.images.length > 1 && (
              <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
                {viewing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIdx(idx)}
                    className="shrink-0 w-14 h-14 rounded-lg overflow-hidden"
                    style={{ border: idx === activeImgIdx ? "2px solid #E8590C" : "2px solid transparent", opacity: idx === activeImgIdx ? 1 : 0.7 }}
                  >
                    <img src={img} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-5">
              {(() => {
                const cat = catInfo(viewing.category);
                const Icon = cat.icon;
                return (
                  <div className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: cat.color }}>
                    <Icon size={13} /> {cat.label}
                  </div>
                );
              })()}
              <h3 className="kanit text-lg font-bold mb-1.5">{viewing.title}</h3>
              <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "#8A8175" }}>
                <span>{formatThaiDate(viewing.date)}</span>
                {viewing.location && <span className="flex items-center gap-1"><MapPin size={12} /> {viewing.location}</span>}
              </div>
              {viewing.description && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#3D372F" }}>{viewing.description}</p>
              )}
              {viewing.staff && <p className="text-xs mb-4" style={{ color: "#8A8175" }}>บันทึกโดย {viewing.staff}</p>}
              <button
                onClick={() => handleDelete(viewing.id)}
                className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ color: "#B91C1C", background: "#FDECEC" }}
              >
                <Trash2 size={14} /> ลบผลงานนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
