import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("secretaire");
  const navigate = useNavigate();

  // --- LOGIQUE RESPONSIVE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      let finalRole = selectedRole;
      if (email.toLowerCase() === "admin@gmail.com") {
        finalRole = "admin";
      }

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email.toLowerCase(),
        role: finalRole,
        createdAt: new Date(),
        shopName: "DEV STOCK",
      });

      alert(`Compte ${finalRole} créé avec succès !`);
      navigate("/");
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.card, 
        width: isMobile ? "90%" : "100%",
        padding: isMobile ? "30px 20px" : "40px"
      }}>
        <h2 style={styles.title}>Créer un compte - DEV</h2>
        
        <form onSubmit={handleRegister} style={styles.form}>
          <label style={styles.label}>Adresse Email</label>
          <input
            type="email"
            placeholder="ex: admin@gmail.com"
            style={styles.input}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={styles.label}>Mot de passe</label>
          <input
            type="password"
            placeholder="Minimum 8 caractères"
            style={styles.input}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {email.toLowerCase() !== "admin@gmail.com" && (
            <>
              <label style={styles.label}>Attribuer un rôle</label>
              <select 
                style={styles.input} 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="secretaire">Secrétaire (Ventes uniquement)</option>
                <option value="ajoint">Adjoint (Gestion partielle)</option>
              </select>
            </>
          )}

          {email.toLowerCase() === "admin@gmail.com" && (
            <p style={styles.adminNote}>⭐ Cet email sera configuré comme <b>ADMINISTRATEUR</b></p>
          )}

          <button type="submit" style={styles.button}>Enregistrer l'utilisateur</button>
        </form>

        <p style={styles.footer}>
          Déjà un compte ? <Link to="/" style={styles.link}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f0f2f5" },
  card: { background: "white", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: "400px", boxSizing: "border-box" },
  title: { textAlign: "center", marginBottom: "20px", color: "#2c3e50", fontSize: "22px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontSize: "14px", fontWeight: "bold", color: "#34495e" },
  input: { padding: "12px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "16px", outline: "none" },
  button: { padding: "12px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" },
  adminNote: { backgroundColor: "#e8f4fd", padding: "10px", borderRadius: "5px", color: "#2980b9", fontSize: "13px", textAlign: "center" },
  footer: { textAlign: "center", marginTop: "20px", fontSize: "14px" },
  link: { color: "#3498db", textDecoration: "none", fontWeight: "bold" }
};