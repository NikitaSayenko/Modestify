// src/pages/Login.js
import React, { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function fbErrToHeb(err) {
    const code = err?.code || "";
    if (code.includes("invalid-email")) return "האימייל לא תקין";
    if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
      return "אימייל או סיסמה שגויים";
    if (code.includes("too-many-requests")) return "יותר מדי ניסיונות. נסה/י שוב מאוחר יותר.";
    return "שגיאה בהתחברות. נסה/י שוב.";
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/account"); // אל אזור אישי
    } catch (err) {
      setError(fbErrToHeb(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" dir="rtl">
      <div
        className="card"
        style={{
          maxWidth: 560,
          margin: "24px auto",
          padding: 20,
        }}
      >
        <h1 className="page-title" style={{ marginBottom: 16 }}>התחברות</h1>

        {error ? (
          <div className="card" style={{ background: "#fff4f4", color: "#a3002f", marginBottom: 12, padding: 12 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            אימייל
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5d5cf" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5d5cf" }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <div style={{ fontSize: 13, color: "var(--muted, #876)" }}>
              אין לך משתמש? <Link to="/register">להרשמה</Link>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn" type="submit" disabled={submitting} style={{ minWidth: 120 }}>
              {submitting ? "מתחבר…" : "התחבר"}
            </button>
            <Link to="/" className="btn-outline" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 12 }}>
              חזרה
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
