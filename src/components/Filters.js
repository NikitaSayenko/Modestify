import React from "react";

export default function Filters({
  categories = [],
  cat, min, max, sort,
  onCat, onMin, onMax, onSort,
  hideCategory = false,
  className = ""
}) {
  return (
    <div
      className={className}
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}
    >
      {!hideCategory && (
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>קטגוריה</label>
          <select
            value={cat}
            onChange={(e) => onCat?.(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">— הכל —</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label style={{ display: "block", marginBottom: 6 }}>מחיר מינימלי</label>
        <input
          type="number"
          min="0"
          value={min}
          onChange={(e) => onMin?.(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          placeholder="₪"
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 6 }}>מחיר מקסימלי</label>
        <input
          type="number"
          min="0"
          value={max}
          onChange={(e) => onMax?.(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          placeholder="₪"
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 6 }}>מיון</label>
        <select
          value={sort}
          onChange={(e) => onSort?.(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="">— ללא —</option>
          <option value="price_asc">מחיר (נמוך → גבוה)</option>
          <option value="price_desc">מחיר (גבוה → נמוך)</option>
        </select>
      </div>
    </div>
  );
}
