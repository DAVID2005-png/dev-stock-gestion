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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin");
      else if (role === "ajoint") navigate("/ajoint");
      else if (role === "secretaire") navigate("/secretaire");
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Tenter une connexion normale
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err) {
      // 2. Si l'utilisateur n'existe pas dans Auth, on vérifie s'il est dans Firestore (créé par l'Admin)
      if (err.code === "auth/user-not-found") {
        try {
          const userDoc = await getDoc(doc(db, "users", cleanEmail));
          
          if (userDoc.exists() && userDoc.data().password === password) {
            // L'employé existe dans Firestore et le MDP est bon -> On lui crée son compte Auth
            await createUserWithEmailAndPassword(auth, cleanEmail, password);
          } else {
            setError("Identifiants invalides ou compte non autorisé");
          }
        } catch (fsErr) {
          setError("Erreur de vérification du compte");
        }
      } else {
        setError("Email ou mot de passe incorrect");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.card, 
        width: isMobile ? "90%" : "100%", 
        padding: isMobile ? "30px 20px" : "40px"
      }}>
        <div style={styles.logoContainer}>
          <h1 style={styles.logoText}>DEV <span style={{ color: "#3498db" }}>STOCK</span></h1>
          <p style={styles.subtitle}>Gestion de Magasin Intelligente</p>
        </div>

        <h2 style={styles.title}>Connexion</h2>

        {error && <div style={styles.errorBadge}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email professionnel</label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              style={styles.input}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              style={styles.input}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Chargement..." : "Accéder au tableau de bord"}
          </button>
        </form>

        <p style={styles.footerText}>
          Vous êtes propriétaire ? <Link to="/register" style={styles.link}>Créer une boutique</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f4f7f6", fontFamily: "'Segoe UI', sans-serif" },
  card: { background: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: "400px", textAlign: "center", boxSizing: "border-box" },
  logoContainer: { marginBottom: "30px" },
  logoText: { fontSize: "28px", margin: 0, fontWeight: "800", color: "#2c3e50" },
  subtitle: { color: "#7f8c8d", fontSize: "14px", marginTop: "5px" },
  title: { fontSize: "20px", color: "#2c3e50", marginBottom: "25px", fontWeight: "600" },
  form: { display: "flex", flexDirection: "column", gap: "18px", textAlign: "left" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#34495e" },
  input: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #dcdde1", fontSize: "15px" },
  button: { padding: "14px", background: "#2c3e50", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },
  errorBadge: { backgroundColor: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "20px", border: "1px solid #fecaca" },
  footerText: { marginTop: "25px", fontSize: "14px", color: "#7f8c8d" },
  link: { color: "#3498db", textDecoration: "none", fontWeight: "600" },
};