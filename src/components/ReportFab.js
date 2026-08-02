// src/components/ReportFab.js
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const REASONS = [
  { id: "wrong_category", label: "קטגוריה לא נכונה" },
  { id: "bug",            label: "באג/תצוגה שבורה" },
  { id: "inappropriate",  label: "תוכן לא מתאים" },
  { id: "price",          label: "מחיר/מידע שגוי" },
  { id: "other",          label: "אחר" },
];

export default function ReportFab({ context = {} }) {
  const { firebaseUser } = useAuth() || {};
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_category");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Close on Esc for safety
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        createdAt: serverTimestamp(),
        userId: firebaseUser?.uid || "anon",
        userEmail: firebaseUser?.email || "",
        reason,
        message: (message || "").slice(0, 1000),
        page: pathname,
        productId: context.productId || "",
        category: context.category || "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };
      await addDoc(collection(db, "reports"), payload);
      setOpen(false);
      setMessage("");
      setReason("wrong_category");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* match your CSS: fixed bottom-left */}
      <button type="button" className="fab-report" onClick={() => setOpen(true)}>
        דווח
      </button>

      {open && (
        <div
          className="report-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setOpen(false)}
        >
          <div className="report-box" onClick={(e) => e.stopPropagation()}>
            <div className="report-head">
              <h3>דווח על בעיה</h3>
              <button
                type="button"
                className="report-x"
                aria-label="Close"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form
              className="report-form"
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              style={{ direction: "rtl" }}
            >
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>

              <textarea
                placeholder="תיאור קצר (לא חובה)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />

              {error && <div className="report-msg" style={{ color: "crimson" }}>{error}</div>}

              <div className="report-actions">
                <button className="button" type="submit" disabled={submitting}>
                  {submitting ? "שולח..." : "שלח דיווח"}
                </button>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
