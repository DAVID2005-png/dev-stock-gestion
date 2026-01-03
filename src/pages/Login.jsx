import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin");
      else if (role === "adjoint") navigate("/adjoint");
      else if (role === "secretaire") navigate("/secretaire");
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Connexion Auth standard
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err) {
      // 2. Si échec, on vérifie si l'admin a créé ce compte dans Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", cleanEmail));
        if (userDoc.exists() && userDoc.data().password === password) {
          // Création auto dans Auth si le MDP Firestore correspond
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } else {
          setError("Identifiants incorrects ou compte non autorisé.");
        }
      } catch (fsErr) {
        setError("Impossible de vérifier le compte.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logoText}>DEV <span style={{ color: "#3498db" }}>STOCK</span></h1>
        <h2 style={styles.title}>Connexion</h2>
        {error && <div style={styles.errorBadge}>{error}</div>}
        <form onSubmit={handleLogin} style={styles.form}>
          <input type="email" placeholder="Email" value={email} style={styles.input} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" value={password} style={styles.input} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" style={styles.button} disabled={loading}>{loading ? "Connexion..." : "Accéder au logiciel"}</button>
        </form>
        <p style={styles.footerText}>Propriétaire ? <Link to="/register" style={styles.link}>Créer une boutique</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f4f7f6" },
  card: { background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", textAlign: "center" },
  logoText: { fontSize: "28px", margin: "0 0 10px 0", fontWeight: "800" },
  title: { fontSize: "18px", marginBottom: "20px", color: "#7f8c8d" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd" },
  button: { padding: "14px", background: "#2c3e50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  errorBadge: { background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px" },
  footerText: { marginTop: "20px", fontSize: "14px" },
  link: { color: "#3498db", textDecoration: "none", fontWeight: "bold" }
};