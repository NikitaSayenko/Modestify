import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(
        doc(db, "users", userCredential.user.uid),
        {
          name,
          email,
          role: "user",               // default role
          createdAt: serverTimestamp()
        }
      ); 
      navigate("/profile");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h1>הרשמה</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="סיסמה" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">🚀 הירשם</button>
      </form>
    </div>
  );
}

export default Register;
