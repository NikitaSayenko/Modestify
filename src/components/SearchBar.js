import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SearchBar({
  onSearch,                 // preferred
  onSubmit,                 // legacy
  placeholder = "חיפוש מוצרים...",
  autoFocus = false,

  // NEW: allow navbar/styles to target elements
  formClassName = "",
  inputClassName = "",
  submitClassName = "search-submit",
  clearClassName = "search-clear",
}) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const initial = params.get("q") || "";

  const [q, setQ] = useState(initial);
  useEffect(() => { setQ(initial); }, [initial]);

  function handleSubmit(e) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (onSearch) onSearch(query);
    else if (onSubmit) onSubmit(query);
    else navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleClear() { setQ(""); }

  return (
    <form
      onSubmit={handleSubmit}
      className={formClassName}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        margin: 0,
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search"
        dir="rtl"
        className={inputClassName}
        style={{
          flex: "1 1 auto",
          minWidth: 0,
        }}
      />
      {q && (
        <button
          type="button"
          onClick={handleClear}
          className={clearClassName}
        >
          נקה
        </button>
      )}
      <button type="submit" className={submitClassName}>חפש</button>
    </form>
  );
}
