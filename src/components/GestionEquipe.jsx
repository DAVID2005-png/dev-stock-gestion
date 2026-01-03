import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function GestionEquipe() {
  const { user } = useAuth(); // Récupère les infos de l'admin connecté
  const [employees, setEmployees] = useState([]);
  const [newEmp, setNewEmp] = useState({ email: "", password: "", role: "secretaire" });
  const [loading, setLoading] = useState(false);

  // 1. Charger uniquement les employés rattachés à cet Admin
  useEffect(() => {
    if (!user?.uid) return;

    // On cherche dans "users" ceux qui ont l'adminId de l'admin actuel (sauf l'admin lui-même)
    const q = query(
      collection(db, "users"), 
      where("adminId", "==", user.uid),
      where("role", "!=", "admin")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
    });

    return () => unsub();
  }, [user]);

  // 2. Ajouter un membre d'équipe
  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const empEmail = newEmp.email.toLowerCase().trim();
      
      // On crée un document dans la collection "users"
      // L'ID du document est l'email pour faciliter la recherche au login
      await setDoc(doc(db, "users", empEmail), {
        email: empEmail,
        password: newEmp.password, // Stocké pour que l'admin s'en souvienne
        role: newEmp.role,
        adminId: user.uid, // Lien crucial avec la boutique de l'admin
        shopName: user.shopName,
        createdAt: serverTimestamp(),
        avertissement: "" // Vide par défaut
      });

      alert("Compte employé créé ! Donnez-lui ses accès.");
      setNewEmp({ email: "", password: "", role: "secretaire" });
    } catch (err) {
      alert("Erreur lors de l'ajout : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Supprimer un membre
  const deleteMember = async (id) => {
    if (window.confirm("Voulez-vous vraiment retirer l'accès à cet employé ?")) {
      try {
        await deleteDoc(doc(db, "users", id));
      } catch (err) {
        alert("Erreur de suppression");
      }
    }
  };

  // 4. Envoyer un message/avertissement
  const sendNote = async (id) => {
    const note = prompt("Entrez votre message ou avertissement pour cet employé :");
    if (note !== null) {
      try {
        await updateDoc(doc(db, "users", id), { avertissement: note });
      } catch (err) {
        alert("Erreur lors de l'envoi");
      }
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>👥 Ma Gestion d'Équipe</h2>
      <p style={styles.subtitle}>Créez et gérez les comptes de votre personnel (Adjoints et Secrétaires).</p>

      {/* FORMULAIRE D'AJOUT */}
      <form onSubmit={handleAddMember} style={styles.form}>
        <div style={styles.inputGroup}>
          <input 
            type="email" 
            placeholder="Email de l'employé" 
            value={newEmp.email} 
            onChange={e => setNewEmp({...newEmp, email: e.target.value})} 
            required 
            style={styles.input}
          />
          <input 
            type="text" 
            placeholder="Mot de passe" 
            value={newEmp.password} 
            onChange={e => setNewEmp({...newEmp, password: e.target.value})} 
            required 
            style={styles.input}
          />
          <select 
            value={newEmp.role} 
            onChange={e => setNewEmp({...newEmp, role: e.target.value})} 
            style={styles.select}
          >
            <option value="secretaire">Secrétaire (Ventes uniquement)</option>
            <option value="ajoint">Adjoint (Ventes + Stock)</option>
          </select>
          <button type="submit" disabled={loading} style={styles.addBtn}>
            {loading ? "..." : "+ Ajouter"}
          </button>
        </div>
      </form>

      {/* LISTE DES EMPLOYÉS */}
      <div style={styles.list}>
        {employees.length === 0 ? (
          <p style={styles.empty}>Aucun employé enregistré pour le moment.</p>
        ) : (
          employees.map(emp => (
            <div key={emp.id} style={styles.item}>
              <div style={styles.info}>
                <span style={styles.empEmail}>{emp.email}</span>
                <span style={styles.empRole}>{emp.role === "ajoint" ? "🔹 Adjoint" : "🔸 Secrétaire"}</span>
                {emp.avertissement && (
                  <div style={styles.warnBadge}>📢 Note : {emp.avertissement}</div>
                )}
              </div>
              <div style={styles.actions}>
                <button onClick={() => sendNote(emp.id)} style={styles.msgBtn} title="Envoyer une note">📢 Message</button>
                <button onClick={() => deleteMember(emp.id)} style={styles.delBtn} title="Supprimer">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  title: { margin: "0 0 10px 0", color: "#2c3e50" },
  subtitle: { color: "#7f8c8d", fontSize: "14px", marginBottom: "20px" },
  form: { marginBottom: "30px", padding: "15px", background: "#f8f9fa", borderRadius: "8px" },
  inputGroup: { display: "flex", gap: "10px", flexWrap: "wrap" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ddd", flex: "1", minWidth: "150px" },
  select: { padding: "10px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer" },
  addBtn: { background: "#27ae60", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #eee", borderRadius: "8px" },
  info: { display: "flex", flexDirection: "column", gap: "2px" },
  empEmail: { fontWeight: "bold", color: "#34495e" },
  empRole: { fontSize: "12px", color: "#95a5a6", textTransform: "uppercase" },
  warnBadge: { fontSize: "12px", background: "#fff3cd", color: "#856404", padding: "4px 8px", borderRadius: "4px", marginTop: "5px" },
  actions: { display: "flex", gap: "8px" },
  msgBtn: { background: "#f1c40f", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" },
  delBtn: { background: "#e74c3c", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" },
  empty: { textAlign: "center", color: "#bdc3c7", fontStyle: "italic" }
};