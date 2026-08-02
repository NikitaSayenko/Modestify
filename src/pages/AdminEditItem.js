import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import {collection,doc,getDocs,onSnapshot,updateDoc,query,limit as qLimit,orderBy,} from "firebase/firestore";

function textify(v) {
  if (v == null) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(textify).join(", ");
  if (t === "object") {
    const prefs = ["name", "title", "label", "value", "id"];
    for (const k of prefs) if (v[k] != null) return textify(v[k]);
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return String(v);
}

function pickImages(p) {
  if (Array.isArray(p?.images)) {
    return p.images.filter((u) => typeof u === "string" && u.startsWith("http"));
  }
  if (typeof p?.imageUrl === "string") return [p.imageUrl];
  if (typeof p?.thumbnail === "string") return [p.thumbnail];
  return [];
}

export default function AdminEditItem() {
  const { id } = useParams();
  const nav = useNavigate();

  const [docData, setDocData] = useState(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [approved, setApproved] = useState(false);
  const [available, setAvailable] = useState(true);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryMode, setCategoryMode] = useState("existing");
  const [categoryExisting, setCategoryExisting] = useState("");
  const [categoryNew, setCategoryNew] = useState("");

  const [merchantMode, setMerchantMode] = useState("existing");
  const [merchantExisting, setMerchantExisting] = useState("");
  const [merchantNew, setMerchantNew] = useState("");
  const [merchantOptions, setMerchantOptions] = useState([]);


  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");

  const images = useMemo(() => pickImages(docData), [docData]);
  const [idx, setIdx] = useState(0);
  const active = images[idx] || null;

  useEffect(() => {
    const ref = doc(db, "clothes", id);
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      setDocData({ id: snap.id, ...d });

      setTitle(textify(d.title) || textify(d.name) || "");
      setPrice(d.price != null ? String(d.price) : "");

      setApproved(Boolean(d.approved));
      setAvailable(d.available === undefined ? true : Boolean(d.available));

      const catName = textify(d.category) || "";
      setCategoryExisting(catName);
      setCategoryMode(catName ? "existing" : "new");

      const mEmail = textify(d.merchantPayPalEmail ?? d.merchantEmail) || "";
      setMerchantExisting(mEmail);
      setMerchantMode(mEmail ? "existing" : "new");

      const t = Array.isArray(d.tags) ? d.tags : [];
      setBrand(textify(t[0]) || "");
      setColor(textify(t[1]) || "");
      setStyle(textify(t[2]) || "");

      setIdx(0);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    (async () => {
      const qy = query(
        collection(db, "clothes"),
        orderBy("createdAt", "desc"),
        qLimit(500)
      );
      const snap = await getDocs(qy);
      const names = new Set();
      snap.forEach((s) => {
        const c = (textify(s.data()?.category) || "").trim();
        if (c) names.add(c);
      });
      setCategoryOptions(Array.from(names).sort((a, b) => a.localeCompare(b, "he")));
    })();
  }, []);


useEffect(() => {
  (async () => {
    const qy = query(
      collection(db, "clothes"),
      orderBy("createdAt", "desc"),
      qLimit(500)
    );
    const snap = await getDocs(qy);
    const emails = new Set();
    snap.forEach((s) => {
      const data = s.data();
      const e = (textify(data.merchantPayPalEmail ?? data.merchantEmail) || "").trim();

      if (e && e.includes("@")) emails.add(e);
    });
    setMerchantOptions(Array.from(emails).sort((a, b) => a.localeCompare(b, "he")));
  })();
}, []);


  useEffect(() => {
    if (!categoryExisting) return;
    if (!categoryOptions.includes(categoryExisting)) {
      setCategoryOptions((prev) => [categoryExisting, ...prev]);
    }
  }, [categoryExisting, categoryOptions]);

  useEffect(() => {
  if (!merchantExisting) return;
  if (!merchantOptions.includes(merchantExisting)) {
    setMerchantOptions((prev) => [merchantExisting, ...prev]);
  }
}, [merchantExisting, merchantOptions]);


  function prevImg(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i - 1 + images.length) % images.length);
  }
  function nextImg(e) {
    e.preventDefault();
    if (!images.length) return;
    setIdx((i) => (i + 1) % images.length);
  }

  async function save() {
    try {
      setSaving(true);
      const ref = doc(db, "clothes", id);

      const catName =
        categoryMode === "new"
          ? (categoryNew || "").trim()
          : (categoryExisting || "").trim();

      const nextCat =
        catName
          ? (docData?.category && typeof docData.category === "object" && docData.category.id
              ? { id: docData.category.id, name: catName }
              : { name: catName })
          : null;

      const tags = [brand.trim(), color.trim(), style.trim()].filter((x) => x !== "");

       const finalMerchant =
        merchantMode === "new"
        ? (merchantNew || "").trim()
        : (merchantExisting || "").trim();


      const payload = {
        title: title?.trim() || "",
        price: price ? Number(price) : 0,
        approved: Boolean(approved),
        available: Boolean(available),
        ...(nextCat ? { category: nextCat } : { category: null }),
        tags,
        merchantPayPalEmail: finalMerchant,
        updatedAt: Date.now(),
     };


      await updateDoc(ref, payload);
      nav("/admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ direction: "rtl" }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>עריכת פריט</h2>
      </div>

      <div className="admin-edit-grid">
                <div className="panel admin-card admin-edit-form">
          <div className="profile-form" style={{ display: "grid", gap: 12 }}>
            <label className="form-row">
              <span>שם</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם המוצר"
              />
            </label>

            <label className="form-row">
              <span>מחיר</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
                inputMode="decimal"
              />
            </label>

            <div className="form-row" style={{ display: "grid", gap: 8 }}>
              <span>קטגוריה</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setCategoryMode("existing")}
                  style={{
                    borderWidth: categoryMode === "existing" ? 2 : 1,
                    background: categoryMode === "existing" ? "var(--cream)" : "transparent",
                  }}
                >
                  קיים
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setCategoryMode("new")}
                  style={{
                    borderWidth: categoryMode === "new" ? 2 : 1,
                    background: categoryMode === "new" ? "var(--cream)" : "transparent",
                  }}
                >
                  חדשה
                </button>
              </div>

              {categoryMode === "existing" ? (
                <select
                  value={categoryExisting}
                  onChange={(e) => setCategoryExisting(e.target.value)}
                >
                  {categoryOptions.length === 0 && <option value="">—</option>}
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={categoryNew}
                  onChange={(e) => setCategoryNew(e.target.value)}
                  placeholder="שם קטגוריה חדשה"
                />
              )}
            </div>
            <div className="form-row" style={{ display: "grid", gap: 8 }}>
          <span>אימייל לתשלום</span>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setMerchantMode("existing")}
              style={{
                borderWidth: merchantMode === "existing" ? 2 : 1,
                background: merchantMode === "existing" ? "var(--cream)" : "transparent",
              }}
            >
              קיים
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setMerchantMode("new")}
              style={{
                borderWidth: merchantMode === "new" ? 2 : 1,
                background: merchantMode === "new" ? "var(--cream)" : "transparent",
              }}
            >
              חדש
            </button>
          </div>

              {merchantMode === "existing" ? (
                <select
                  value={merchantExisting}
                  onChange={(e) => setMerchantExisting(e.target.value)}
                  dir="ltr"
                >
                  <option value="">—</option>
                  {merchantOptions.map((em) => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="email"
                  value={merchantNew}
                  onChange={(e) => setMerchantNew(e.target.value)}
                  placeholder="email@domain.com"
                  dir="ltr"
                />
              )}
            </div>


            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              <label className="form-row">
                <span>מאושר</span>
                <select
                  value={approved ? "yes" : "no"}
                  onChange={(e) => setApproved(e.target.value === "yes")}
                >
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              </label>

              <label className="form-row">
                <span>זמין</span>
                <select
                  value={available ? "yes" : "no"}
                  onChange={(e) => setAvailable(e.target.value === "yes")}
                >
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              </label>
            </div>

            <div className="form-row" style={{ display: "grid", gap: 8 }}>
              <span>תגיות</span>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="מותג" />
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="צבע" />
                <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="סגנון" />
              </div>
            </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={save} disabled={saving}>שמור</button>
          <button className="btn" onClick={() => nav(-1)}>חזור</button>
        </div>
          </div>
        </div>
<div className="panel admin-card admin-edit-preview">
  <div className="preview-inner">
    {active ? (
      <img
        src={active}
        alt={title || "product"}
        className="admin-edit-preview-img"
      />
    ) : (
      <div style={{ width: "100%", height: 320, background: "var(--sand)", borderRadius: "14px" }} />
    )}

    {images.length > 1 && (
      <>
        <button
          className="editcar-btn editcar-left"
          onClick={prevImg}
          aria-label="previous"
        />
        <button
          className="editcar-btn editcar-right"
          onClick={nextImg}
          aria-label="next"
        />
        <div className="editcar-dots">
          {images.map((_, i) => (
            <span
              key={i}
              className={i === idx ? "editcar-dot active" : "editcar-dot"}
            />
          ))}
        </div>
      </>
    )}
  </div>

  <div className="thumb-grid">
    {images.map((u, i) => (
      <img
        key={i}
        src={u}
        alt={"thumb"+i}
        className={i === idx ? "thumb-img selected" : "thumb-img"}
        onClick={() => setIdx(i)}
      />
    ))}
  </div>
</div>



      </div>
    </div>
  );
}
