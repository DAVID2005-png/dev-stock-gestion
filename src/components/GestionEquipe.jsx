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
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [newEmp, setNewEmp] = useState({ email: "", password: "", role: "secretaire" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // On utilise l'ID de l'admin (boutique) pour filtrer
    const currentAdminId = user?.adminId || user?.uid;
    if (!currentAdminId) return;

    const q = query(
      collection(db, "users"), 
      where("adminId", "==", currentAdminId),
      where("role", "!=", "admin")
    );

    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const empEmail = newEmp.email.toLowerCase().trim();
      const currentAdminId = user?.adminId || user?.uid;
      
      await setDoc(doc(db, "users", empEmail), {
        email: empEmail,
        password: newEmp.password,
        role: newEmp.role,
        adminId: currentAdminId,
        shopName: user.shopName || "Ma Boutique",
        createdAt: serverTimestamp(),
        avertissement: ""
      });

      alert("Compte employé créé avec succès !");
      setNewEmp({ email: "", password: "", role: "secretaire" });
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (id) => {
    if (window.confirm("Supprimer cet accès ?")) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const sendNote = async (id) => {
    const note = prompt("Message pour l'employé :");
    if (note) await updateDoc(doc(db, "users", id), { avertissement: note });
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>👥 Ma Gestion d'Équipe</h2>
      <form onSubmit={handleAddMember} style={styles.form}>
        <div style={styles.inputGroup}>
          <input type="email" placeholder="Email" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} required style={styles.input} />
          <input type="text" placeholder="Mot de passe" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required style={styles.input} />
          <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} style={styles.select}>
            <option value="secretaire">Secrétaire</option>
            <option value="adjoint">Adjoint</option>
          </select>
          <button type="submit" disabled={loading} style={styles.addBtn}>{loading ? "..." : "Ajouter"}</button>
        </div>
      </form>

      <div style={styles.list}>
        {employees.map(emp => (
          <div key={emp.id} style={styles.item}>
            <div style={styles.info}>
              <span style={styles.empEmail}>{emp.email}</span>
              <span style={styles.empRole}>{emp.role === "adjoint" ? "🔹 Adjoint" : "🔸 Secrétaire"}</span>
              {emp.avertissement && <div style={styles.warnBadge}>📢 {emp.avertissement}</div>}
            </div>
            <div style={styles.actions}>
              <button onClick={() => sendNote(emp.id)} style={styles.msgBtn}>📢</button>
              <button onClick={() => deleteMember(emp.id)} style={styles.delBtn}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  title: { margin: "0 0 20px 0", color: "#2c3e50" },
  form: { marginBottom: "30px", padding: "15px", background: "#f8f9fa", borderRadius: "8px" },
  inputGroup: { display: "flex", gap: "10px", flexWrap: "wrap" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ddd", flex: "1" },
  select: { padding: "10px", borderRadius: "6px", border: "1px solid #ddd" },
  addBtn: { background: "#27ae60", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer" },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #eee", borderRadius: "8px", marginBottom: "10px" },
  info: { display: "flex", flexDirection: "column" },
  empEmail: { fontWeight: "bold" },
  empRole: { fontSize: "11px", color: "#7f8c8d", textTransform: "uppercase" },
  warnBadge: { fontSize: "12px", background: "#fff3cd", padding: "4px", borderRadius: "4px", marginTop: "5px" },
  actions: { display: "flex", gap: "5px" },
  msgBtn: { background: "#f1c40f", border: "none", padding: "8px", borderRadius: "4px" },
  delBtn: { background: "#e74c3c", color: "#fff", border: "none", padding: "8px", borderRadius: "4px" }
};