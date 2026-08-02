// ==========================
// AdminDashboard: moderation & import console for products
// ==========================
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import { importProducts } from "../utils/productSource";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  where,
  limit as qLimit,
  getDocs,
  writeBatch, // added for bulk operations
} from "firebase/firestore";

// ---- Small UI primitives (Button, Chip) used inside the dashboard ----
function Button({ children, onClick, type = "button", variant = "solid", disabled }) {
  const bg =
    variant === "outline" ? "transparent" :
    variant === "danger" ? "#d33" :
    variant === "ghost" ? "var(--sand)" :
    "var(--primary)";
  const color =
    variant === "outline" ? "var(--primary)" :
    variant === "ghost" ? "var(--ink)" :
    "#fff";
  const border =
    variant === "outline" ? "1px solid var(--primary)" : "1px solid transparent";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#b9c0c7" : bg,
        color,
        padding: "8px 14px",
        borderRadius: 10,
        border,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
function Chip({ children, tone = "info" }) {
  const map = {
    info: { bg: "#eef4ff", color: "var(--primary)" },
    ok: { bg: "#eaf7f0", color: "#1b7d3a" },
    warn: { bg: "#fff7e6", color: "#8a5a00" },
    bad: { bg: "#fdecea", color: "#b42318" },
  };
  const { bg, color } = map[tone] || map.info;
  return (
    <span
      style={{
        background: bg,
        color,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

// ---- Helpers for table rendering (formatting & image selection) ----
function textify(v) {
  if (v == null) return "—";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(textify).join(", ");
  if (t === "object") {
    const prefs = ["name", "title", "label", "value", "id"];
    for (const k of prefs) if (v[k] != null) return textify(v[k]);
    try { return JSON.stringify(v); } catch { return "—"; }
  }
  return String(v);
}

function firstImage(p) {
  const arr = Array.isArray(p.images) ? p.images : null;
  if (arr && arr.length) {
    const url = arr.find((u) => typeof u === "string" && u.startsWith("http"));
    if (url) return url;
  }
  if (typeof p.imageUrl === "string") return p.imageUrl;
  if (typeof p.thumbnail === "string") return p.thumbnail;
  return null;
}

// Utility: normalize a string for contains-based search
function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

export default function AdminDashboard() {
  const nav = useNavigate();
const ADMIN_PAGE_SIZE = 20;

const [pendingPage, setPendingPage] = useState(0);
const [approvedPage, setApprovedPage] = useState(0);

  // ---- Reactive state (pending/approved tables + counters + import status) ----
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [repStats, setRepStats] = useState({ total: 0, open: 0, in_progress: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  // Admin search (client-side, non-destructive)
  const [adminSearch, setAdminSearch] = useState("");

  // Selection state per section (do not share to avoid accidental cross-ops)
  const [selPending, setSelPending] = useState(() => new Set());
  const [selApproved, setSelApproved] = useState(() => new Set());

  // ---- Live subscriptions to Firestore (pending/approved) + aggregated counters ----
  useEffect(() => {
    const qPending = query(
      collection(db, "clothes"),
      where("approved", "==", false),
      orderBy("createdAt", "desc"),
      qLimit(200)
    );

    const qApprovedRecent = query(
      collection(db, "clothes"),
      where("approved", "==", true),
      orderBy("createdAt", "desc"),
      qLimit(200)
    );

    const unsub1 = onSnapshot(qPending, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPending(rows);
      // Keep selection in sync with live data (drop ids that are no longer in the list)
      setSelPending((prev) => {
        const keep = new Set();
        const ids = new Set(rows.map((r) => r.id));
        prev.forEach((id) => { if (ids.has(id)) keep.add(id); });
        return keep;
      });
      setLoading(false);
    }, () => setLoading(false));

    const unsub2 = onSnapshot(qApprovedRecent, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApproved(rows);
      setSelApproved((prev) => {
        const keep = new Set();
        const ids = new Set(rows.map((r) => r.id));
        prev.forEach((id) => { if (ids.has(id)) keep.add(id); });
        return keep;
      });
    });

    const qAll = query(collection(db, "clothes"), orderBy("createdAt", "desc"), qLimit(1));
    const unsub3 = onSnapshot(qAll, async () => {
      const [all, p, a] = await Promise.all([
        getDocs(query(collection(db, "clothes"))),
        getDocs(query(collection(db, "clothes"), where("approved", "==", false))),
        getDocs(query(collection(db, "clothes"), where("approved", "==", true))),
      ]);
      setStats({ total: all.size, pending: p.size, approved: a.size });
    });

    return () => { unsub1 && unsub1(); unsub2 && unsub2(); unsub3 && unsub3(); };
  }, []);
useEffect(() => {
  setPendingPage(0);
  setApprovedPage(0);
}, [adminSearch]);

  // ---- Derived lists: apply client-side search safely (name/category/id) ----
const pendingFiltered = useMemo(() => {
  const q = norm(adminSearch);
  if (!q) return pending;

  return pending.filter((p) => {
    const name   = norm(displayName(p));
    const cat    = norm(textify(p.category));
    const id     = norm(p.id);
    const brand  = norm(p.brand);
    const source = norm(p.sourceApi);
    const price  = norm(`₪${Number(p.price || 0).toFixed(2)}`);

    return (
      name.includes(q) ||
      cat.includes(q) ||
      id.includes(q) ||
      brand.includes(q) ||
      source.includes(q) ||
      price.includes(q)
    );
  });
}, [pending, adminSearch]);


 const approvedFiltered = useMemo(() => {
  const q = norm(adminSearch);
  if (!q) return approved;

  return approved.filter((p) => {
    const name   = norm(displayName(p));
    const cat    = norm(textify(p.category));
    const id     = norm(p.id);
    const brand  = norm(p.brand);
    const source = norm(p.sourceApi);
    const price  = norm(`₪${Number(p.price || 0).toFixed(2)}`);

    return (
      name.includes(q) ||
      cat.includes(q) ||
      id.includes(q) ||
      brand.includes(q) ||
      source.includes(q) ||
      price.includes(q)
    );
  });
}, [approved, adminSearch]);

const pendingPageCount  = useMemo(
  () => Math.max(1, Math.ceil(pendingFiltered.length / ADMIN_PAGE_SIZE)),
  [pendingFiltered.length]
);
const approvedPageCount = useMemo(
  () => Math.max(1, Math.ceil(approvedFiltered.length / ADMIN_PAGE_SIZE)),
  [approvedFiltered.length]
);
const pendingPaged = useMemo(() => {
  const start = pendingPage * ADMIN_PAGE_SIZE;
  return pendingFiltered.slice(start, start + ADMIN_PAGE_SIZE);
}, [pendingFiltered, pendingPage]);

const approvedPaged = useMemo(() => {
  const start = approvedPage * ADMIN_PAGE_SIZE;
  return approvedFiltered.slice(start, start + ADMIN_PAGE_SIZE);
}, [approvedFiltered, approvedPage]);

// Clamp if data shrinks (e.g., search filter)
useEffect(() => {
  if (pendingPage >= pendingPageCount) setPendingPage(Math.max(0, pendingPageCount - 1));
}, [pendingPage, pendingPageCount]);
useEffect(() => {
  if (approvedPage >= approvedPageCount) setApprovedPage(Math.max(0, approvedPageCount - 1));
}, [approvedPage, approvedPageCount]);

useEffect(() => {
  const qReports = query(
    collection(db, "reports"),
    orderBy("createdAt", "desc"),
    qLimit(200)
  );
  const unsub = onSnapshot(qReports, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const counts = rows.reduce((acc, r) => {
      const s = (r.status || "open");
      acc.total++;
      if (s === "open") acc.open++;
      else if (s === "in_progress") acc.in_progress++;
      else if (s === "closed") acc.closed++;
      return acc;
    }, { total: 0, open: 0, in_progress: 0, closed: 0 });
    setRepStats(counts);
  });
  return () => unsub();
}, []);

  // ---- Derive display name for a product row ----
  function displayName(p) {
    const cands = [p.title, p.name, p.productName, p.brand, p.category];
    for (const v of cands) {
      const s = textify(v);
      if (s && s !== "—") return s;
    }
    return "—";
  }

  // ---- Row actions: approve / delete / import trigger ----
  async function toggleApproved(id, next) {
    await updateDoc(doc(db, "clothes", id), { approved: next === true });
  }

  async function handleDelete(id) {
    if (!window.confirm("למחוק את הפריט הזה?")) return;
    await deleteDoc(doc(db, "clothes", id));
  }

  async function runImport(sourceKey) {
    try {
      setImporting(true);
      setMessage("");
 const res = await importProducts({ source: sourceKey, page: 0, limit: 24 });
 const imported = (res && (res.imported ?? res.count ?? res.data?.imported)) || 0;
 setMessage(`הוספו ${imported} פריטים ממקור ${sourceKey}.`);
    } catch {
      setMessage("אירעה שגיאה בייבוא. נסה שוב.");
    } finally {
      setImporting(false);
    }
  }

  // ---- Selection helpers (per section) ----
  function toggleSelect(setter, currentSet, id) {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllCurrent(setter, ids) {
    setter(new Set(ids));
  }

  async function approveSelectedPending() {
    if (selPending.size === 0) return;
    const ok = window.confirm(`לאשר ${selPending.size} פריטים?`);
    if (!ok) return;
    const batch = writeBatch(db);
    selPending.forEach((id) => {
      batch.update(doc(db, "clothes", id), { approved: true });
    });
    await batch.commit();
    setSelPending(new Set());
  }

  async function deleteSelected(ids, clearSelection) {
    if (ids.size === 0) return;
    const ok = window.confirm(`למחוק ${ids.size} פריטים?`);
    if (!ok) return;
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, "clothes", id)));
    await batch.commit();
    clearSelection(new Set());
  }

  // ---- UI sections and table components (presentation only) ----
  function Section({ title, right, children }) {
    return (
      <section style={{
        marginTop: 24,
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid var(--line)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--cream)"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "var(--ink)" }}>{title}</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{right}</div>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </section>
    );
  }

  function Table({ columns, rows, rowKey = (r) => r.id, renderCell }) {
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>

          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{
                  textAlign: c.align || "start",
                  padding: "10px 8px",
                  fontSize: 13,
                  color: "var(--muted)",
                  borderBottom: "1px solid var(--line)",
                  whiteSpace: "nowrap",
                  background: "var(--cream)"
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} style={{ background: "#fff" }}>
                {columns.map((c) => (
                  <td key={c.key} style={{
                    padding: "10px 8px",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 14,
                    whiteSpace: c.nowrap ? "nowrap" : "normal",
                    color: "var(--ink)"
                  }}>
                    {renderCell ? renderCell(r, c) : textify(r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 16, color: "var(--muted)" }}>
                  אין נתונים להצגה.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function Thumb({ url, alt }) {
    return url ? (
      <img
        src={url}
        alt={alt}
        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
      />
    ) : (
      <div style={{ width: 56, height: 56, borderRadius: 8, background: "var(--sand)", border: "1px solid var(--line)" }} />
    );
  }
  function Pagination({ page, pageCount, onPrev, onNext, total, showingStart, showingEnd }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
      <small style={{ color: "var(--muted)" }}>
        מציג {showingStart}-{showingEnd} מתוך {total}
      </small>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="outline" disabled={page === 0} onClick={onPrev}>הקודם</Button>
        <span style={{ minWidth: 110, textAlign: "center" }}>
          עמוד {page + 1} מתוך {pageCount}
        </span>
        <Button variant="outline" disabled={page + 1 >= pageCount} onClick={onNext}>הבא</Button>
      </div>
    </div>
  );
}

  // ---- Page layout (header + search + sections: Import / Pending / Approved) ----
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto", color: "var(--ink)" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
  <h2 style={{ margin: 0, color: "var(--ink)" }}>Admin Dashboard</h2>

  {/* RIGHT SIDE: chips + search + counts + clear */}
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <Chip tone="info">סה״כ {stats.total}</Chip>
    <Chip tone="warn">ממתינים {stats.pending}</Chip>
    <Chip tone="ok">מאושרים {stats.approved}</Chip>

    {/* Admin search input (client-side) */}
    <input
      type="search"
      placeholder="חיפוש מוצרים…"
      value={adminSearch}
      onChange={(e) => setAdminSearch(e.target.value)}
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "8px 10px",
        minWidth: 220,
        outline: "none",
      }}
    />

    {/*  filtered/total summary across both tables */}
    <small style={{ color: "var(--muted)" }}>
      נמצאו {pendingFiltered.length + approvedFiltered.length}/{pending.length + approved.length}
    </small>

    {/*  quick clear */}
    {adminSearch && (
      <Button variant="outline" onClick={() => setAdminSearch("")}>
        נקה
      </Button>
    )}
  </div>
</header>


      <Section
        title="ייבוא נתונים"
        right={
          <>
            <Button onClick={() => runImport("platzi")} disabled={importing}>Platzi (primary)</Button>
            <Button onClick={() => runImport("dummyjson")} variant="outline" disabled={importing}>DummyJSON (fallback)</Button>
          </>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>ייבוא מהיר של פריטים ממקורות מוגדרים.</span>
          {importing && <Chip tone="info">מייבא…</Chip>}
          {!!message && <Chip tone="ok">{message}</Chip>}
        </div>
      </Section>
      <Section
        title="דיווחים"
        right={
          <Link to="/admin/reports" style={{ textDecoration: "none" }}>
            <Button>פתח עמוד דיווחים</Button>
          </Link>
        }
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Chip tone="bad">פתוחים {repStats.open}</Chip>
          <Chip tone="warn">בטיפול {repStats.in_progress}</Chip>
          <Chip tone="ok">סגורים {repStats.closed}</Chip>
          <Chip tone="info">סה״כ {repStats.total}</Chip>
        </div>
      </Section>

      {/* Pending section with selection and bulk approve/delete */}
      <Section
        title="ממתינים לאישור"
        right={
          <>
           <Chip tone="warn">{pendingFiltered.length}/{pending.length}</Chip>

            <Button
              variant="outline"
              onClick={() => selectAllCurrent(setSelPending, pendingPaged.map(p => p.id))}

              disabled={pendingFiltered.length === 0}
            >
              סמן הכל
            </Button>
            <Button onClick={approveSelectedPending} disabled={selPending.size === 0}>
              אשר מסומנים ({selPending.size})
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteSelected(selPending, setSelPending)}
              disabled={selPending.size === 0}
            >
              מחק מסומנים
            </Button>
          </>
        }
      >
        {loading ? (
          <div>טוען…</div>
        ) : (
          <Table

            columns={[
              { key: "sel", label: "", nowrap: true },
              { key: "thumb", label: "תמונה", nowrap: true },
              { key: "name", label: "שם" },
              { key: "category", label: "קטגוריה", nowrap: true },
              { key: "price", label: "מחיר", nowrap: true },
              { key: "actions", label: "פעולות", nowrap: true, align: "end" },
            ]}
            rows={pendingPaged}

            renderCell={(p, c) => {
              if (c.key === "sel") {
                const checked = selPending.has(p.id);
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(setSelPending, selPending, p.id)}
                    aria-label="select row"
                  />
                );
              }
              if (c.key === "thumb") return <Thumb url={firstImage(p)} alt={displayName(p)} />;
              if (c.key === "name") return textify(displayName(p));
              if (c.key === "category") return textify(p.category);
              if (c.key === "price") return `₪${Number(p.price || 0).toFixed(2)}`;
              if (c.key === "actions")
                return (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button onClick={() => toggleApproved(p.id, true)}>אשר</Button>
                    <Button variant="outline" onClick={() => nav(`/admin/edit/${p.id}`)}>ערוך</Button>
                    <Button variant="danger" onClick={() => handleDelete(p.id)}>מחק</Button>
                  </div>
                );
              return textify(p[c.key]);
            }}
          />
        )}
        <Pagination
  page={pendingPage}
  pageCount={pendingPageCount}
  onPrev={() => setPendingPage((p) => Math.max(0, p - 1))}
  onNext={() => setPendingPage((p) => Math.min(pendingPageCount - 1, p + 1))}
  total={pendingFiltered.length}
  showingStart={pendingFiltered.length === 0 ? 0 : pendingPage * ADMIN_PAGE_SIZE + 1}
  showingEnd={Math.min(pendingFiltered.length, (pendingPage + 1) * ADMIN_PAGE_SIZE)}
/>

      </Section>

      {/* Approved section with selection and bulk delete */}
      <Section
        title="מאושרים (אחרונים)"
        right={
          <>
            <Chip tone="ok">{approvedFiltered.length}/{approved.length}</Chip>
            <Button
              variant="outline"
              onClick={() => selectAllCurrent(setSelApproved, approvedPaged.map(p => p.id))}

              disabled={approvedFiltered.length === 0}
            >
              סמן הכל
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteSelected(selApproved, setSelApproved)}
              disabled={selApproved.size === 0}
            >
              מחק מסומנים
            </Button>
          </>
        }
      >
        <Table
          columns={[
            { key: "sel", label: "", nowrap: true },
            { key: "thumb", label: "תמונה", nowrap: true },
            { key: "name", label: "שם" },
            { key: "category", label: "קטגוריה", nowrap: true },
            { key: "price", label: "מחיר", nowrap: true },
            { key: "status", label: "סטטוס", nowrap: true },
            { key: "actions", label: "פעולות", nowrap: true, align: "end" },
          ]}
          rows={approvedPaged}

          renderCell={(p, c) => {
            if (c.key === "sel") {
              const checked = selApproved.has(p.id);
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelect(setSelApproved, selApproved, p.id)}
                  aria-label="select row"
                />
              );
            }
            if (c.key === "thumb") return <Thumb url={firstImage(p)} alt={displayName(p)} />;
            if (c.key === "name")
              return (
                <Link to={`/admin/edit/${p.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                  {textify(displayName(p))}
                </Link>
              );
            if (c.key === "category") return textify(p.category);
            if (c.key === "price") return `₪${Number(p.price || 0).toFixed(2)}`;
            if (c.key === "status") return <Chip tone="ok">מאושר</Chip>;
            if (c.key === "actions")
              return (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button variant="outline" onClick={() => nav(`/admin/edit/${p.id}`)}>ערוך</Button>
                  <Button variant="danger" onClick={() => handleDelete(p.id)}>מחק</Button>
                </div>
              );
            return textify(p[c.key]);
          }}
        />
        <Pagination
  page={approvedPage}
  pageCount={approvedPageCount}
  onPrev={() => setApprovedPage((p) => Math.max(0, p - 1))}
  onNext={() => setApprovedPage((p) => Math.min(approvedPageCount - 1, p + 1))}
  total={approvedFiltered.length}
  showingStart={approvedFiltered.length === 0 ? 0 : approvedPage * ADMIN_PAGE_SIZE + 1}
  showingEnd={Math.min(approvedFiltered.length, (approvedPage + 1) * ADMIN_PAGE_SIZE)}
/>

      </Section>

    </div>
  );
}
