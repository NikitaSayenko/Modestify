// src/pages/Register.js
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function fbErrToHeb(err) {
    const code = err?.code || "";
    if (code.includes("email-already-in-use")) return "האימייל כבר בשימוש";
    if (code.includes("invalid-email")) return "האימייל לא תקין";
    if (code.includes("weak-password")) return "סיסמה חלשה (לפחות 6 תווים)";
    return "שגיאה בהרשמה. נסה/י שוב.";
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("הסיסמה חייבת לכלול לפחות 6 תווים");
      return;
    }

    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await updateProfile(cred.user, { displayName: name.trim() });

      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          fullName: name.trim(),
          name: name.trim(),
          email: email.trim(),
          role: "user",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      nav("/account"); // Redirect to account page after successful registration
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
        <h1 className="page-title" style={{ marginBottom: 16 }}>הרשמה</h1>

        {error ? (
          <div className="card" style={{ background: "#fff4f4", color: "#a3002f", marginBottom: 12, padding: 12 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleRegister} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            שם מלא
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="יוסי כהן"
              required
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5d5cf" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            אימייל
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5d5cf" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              required
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5d5cf" }}
            />
          </label>

          <div style={{ fontSize: 13, color: "var(--muted, #876)" }}>
            כבר רשומים? <Link to="/login">להתחברות</Link>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn" type="submit" disabled={submitting} style={{ minWidth: 120 }}>
              {submitting ? "נרשם…" : "הרשמה"}
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
