// src/pages/AdminReports.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  limit as qLimit,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const STATUS = [
  { id: "open",        label: "פתוח" },
  { id: "in_progress", label: "בטיפול" },
  { id: "closed",      label: "נסגר" },
];
const REASONS = [
  { id: "wrong_category", label: "קטגוריה לא נכונה" },
  { id: "bug",            label: "באג/תצוגה שבורה" },
  { id: "inappropriate",  label: "תוכן לא מתאים" },
  { id: "price",          label: "מחיר/מידע שגוי" },
  { id: "other",          label: "אחר" },
];

const STATUS_MAP = Object.fromEntries(STATUS.map(s => [s.id, s.label]));
const REASON_MAP = Object.fromEntries(REASONS.map(r => [r.id, r.label]));
const PAGE_SIZE = 20;

function norm(s) { return (s ?? "").toString().toLowerCase().trim(); }

function Pagination({ page, pageCount, onPrev, onNext, total, showingStart, showingEnd }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
      <small style={{ color: "var(--muted)" }}>
        מציג {showingStart}-{showingEnd} מתוך {total}
      </small>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="button" disabled={page === 0} onClick={onPrev}>הקודם</button>
        <span style={{ color: "white", minWidth: 110, textAlign: "center" }}>
          עמוד {page + 1} מתוך {pageCount}
        </span>
        <button className="button" disabled={page + 1 >= pageCount} onClick={onNext}>הבא</button>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");

  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
      qLimit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(list);
        setLoading(false);
        setSelected((prev) => {
          const ids = new Set(list.map((r) => r.id));
          const next = new Set();
          prev.forEach((id) => { if (ids.has(id)) next.add(id); });
          return next;
        });
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => { setPage(0); }, [search, status, reason]);

  const filtered = useMemo(() => {
    const q = norm(search);
    return rows.filter((r) => {
      if (status && (r.status || "open") !== status) return false;
      if (reason && r.reason !== reason) return false;
      if (!q) return true;
      const blob = [
        r.userEmail, r.userId, r.reason, r.status,
        r.message, r.page, r.productId, r.category, r.userAgent
      ].map((x) => (x || "").toString().toLowerCase()).join(" ");
      return blob.includes(q);
    });
  }, [rows, search, status, reason]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );
  const paged = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  async function setRowStatus(id, next) {
    await updateDoc(doc(db, "reports", id), {
      status: next,
      processedAt: new Date().toISOString(),
    });
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllCurrent() {
    setSelected(new Set(paged.map((r) => r.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }
  async function deleteOne(id) {
    const ok = window.confirm("למחוק את הדיווח הזה?");
    if (!ok) return;
    await deleteDoc(doc(db, "reports", id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }
  async function deleteSelectedBulk() {
    if (selected.size === 0) return;
    const ok = window.confirm(`למחוק ${selected.size} דיווחים מסומנים?`);
    if (!ok) return;
    await Promise.all(Array.from(selected, (id) => deleteDoc(doc(db, "reports", id))));
    setSelected(new Set());
  }

  return (
    <div className="container" style={{ direction: "rtl" }}>
      <h1 className="page-title">ניהול דיווחים</h1>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            placeholder="חיפוש חופשי…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: "1 1 240px" }}
          />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            {STATUS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">כל הסיבות</option>
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>

          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
            <button className="btn-outline" onClick={selectAllCurrent}>סמן הכל</button>
            <button className="btn-outline" onClick={clearSelection}>נקה בחירה</button>
            <button className="btn-danger" onClick={deleteSelectedBulk} disabled={selected.size === 0}>
              מחק מסומנים ({selected.size})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel">טוען…</div>
      ) : filtered.length === 0 ? (
        <div className="panel">אין דיווחים להצגה.</div>
      ) : (
        <>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "start", padding: 8 }} />
                  <th style={{ textAlign: "start", padding: 8 }}>תאריך</th>
                  <th style={{ textAlign: "start", padding: 8 }}>סטטוס</th>
                  <th style={{ textAlign: "start", padding: 8 }}>סיבה</th>
                  <th style={{ textAlign: "start", padding: 8 }}>עמוד</th>
                  <th style={{ textAlign: "start", padding: 8 }}>משתמש</th>
                  <th style={{ textAlign: "start", padding: 8 }}>הודעה</th>
                  <th style={{ textAlign: "start", padding: 8 }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const d = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : null);
                  const date = d && !isNaN(d) ? d.toLocaleString() : "—";
                  const statusLabel = STATUS_MAP[r.status || "open"] || r.status || "—";
                  const reasonLabel = REASON_MAP[r.reason] || r.reason || "—";
                  const userCell =
                    (r.userEmail && r.userEmail.trim())
                      ? <a href={`mailto:${r.userEmail}`}>{r.userEmail}</a>
                      : (r.userId || "אנונימי");

                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          aria-label="select row"
                        />
                      </td>
                      <td style={{ padding: 8, whiteSpace: "nowrap" }}>{date}</td>
                      <td style={{ padding: 8 }}>{statusLabel}</td>
                      <td style={{ padding: 8 }}>{reasonLabel}</td>
                      <td style={{ padding: 8 }}>
                        {r.page ? (
                          <a href={r.page} target="_blank" rel="noopener noreferrer">
                            {r.page}
                          </a>
                        ) : "—"}
                      </td>
                      <td style={{ padding: 8 }}>{userCell}</td>
                      <td style={{ padding: 8, maxWidth: 360 }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{r.message || "—"}</div>
                      </td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn-outline" onClick={() => setRowStatus(r.id, "open")}>פתוח</button>
                          <button className="btn-outline" onClick={() => setRowStatus(r.id, "in_progress")}>בטיפול</button>
                          <button className="btn-outline" onClick={() => setRowStatus(r.id, "closed")}>סגור</button>
                          <button className="btn-danger" onClick={() => deleteOne(r.id)}>מחק</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            total={filtered.length}
            showingStart={filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}
            showingEnd={Math.min(filtered.length, (page + 1) * PAGE_SIZE)}
          />
        </>
      )}
    </div>
  );
}
