import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  deleteDoc 
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function DashboardAdjoint() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("stock");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [newProd, setNewProd] = useState({ nom: "", prix: "", action: "", imageUrl: "" });
  const [imagePreview, setImagePreview] = useState(null);

  // AJOUT RESPONSIVE
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "produits"), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTrans = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProd(); unsubTrans(); };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setNewProd({ ...newProd, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        nom: newProd.nom,
        prix: Number(newProd.prix),
        action: Number(newProd.action),
        imageUrl: newProd.imageUrl,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "produits", editingId), productData);
        alert("Produit mis à jour !");
      } else {
        await addDoc(collection(db, "produits"), { ...productData, createdAt: serverTimestamp() });
        alert("Produit ajouté !");
      }
      closeModal();
    } catch (err) { alert("Erreur: " + err.message); }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      try {
        await deleteDoc(doc(db, "produits", id));
      } catch (err) { alert("Erreur lors de la suppression"); }
    }
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setNewProd({ nom: p.nom, prix: p.prix, action: p.action, imageUrl: p.imageUrl });
    setImagePreview(p.imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewProd({ nom: "", prix: "", action: "", imageUrl: "" });
    setImagePreview(null);
  };

  const handlePayDebt = async (transactionId) => {
    if (!window.confirm("Confirmer le règlement ?")) return;
    try {
      await updateDoc(doc(db, "transactions", transactionId), {
        debt: 0,
        type: "Réglé",
        paymentDate: serverTimestamp()
      });
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={styles.container}>
      {/* NAVBAR RESPONSIVE */}
      <nav style={{...styles.navbar, padding: isMobile ? "10px 15px" : "15px 30px"}}>
        <div style={{...styles.logo, fontSize: isMobile ? "18px" : "22px"}}>
          DEV STOCK <br/> {isMobile && <small style={{color: '#bdc3c7', fontSize: '10px'}}>(Mode Adjoint)</small>}
          {!isMobile && <small style={{color: '#bdc3c7'}}>(Mode Adjoint)</small>}
        </div>
        <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Déconnexion</button>
      </nav>

      <div style={{...styles.content, padding: isMobile ? "15px" : "30px"}}>
        {/* TABS RESPONSIVE */}
        <div style={{...styles.tabContainer, flexWrap: isMobile ? "wrap" : "nowrap"}}>
          <button style={activeTab === "stock" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("stock")}>📦 Inventaire</button>
          <button style={activeTab === "ventes" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("ventes")}>📋 Ventes & Dettes</button>
        </div>

        {activeTab === "stock" && (
          <section style={styles.section}>
            <div style={{...styles.sectionHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? "10px" : "0"}}>
              <h3 style={{margin: 0}}>État de l'Entrepôt</h3>
              <button style={styles.addBtn} onClick={() => setIsModalOpen(true)}>+ Nouveau Produit</button>
            </div>
            
            <div style={{overflowX: "auto"}}>
              <table style={{...styles.table, minWidth: isMobile ? "600px" : "100%"}}>
                <thead>
                  <tr style={styles.thr}>
                    <th style={styles.th}>Aperçu</th>
                    <th style={styles.th}>Produit</th>
                    <th style={styles.th}>Prix</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}>
                        {p.imageUrl ? <img src={p.imageUrl} alt="" style={styles.imgTable} /> : <div style={styles.noImg}>📦</div>}
                      </td>
                      <td style={styles.td}>{p.nom}</td>
                      <td style={styles.td}>{p.prix?.toLocaleString()} FC</td>
                      <td style={{...styles.td, fontWeight: "bold", color: p.action <= 5 ? 'red' : 'inherit'}}>{p.action}</td>
                      <td style={styles.td}>
                        <button onClick={() => openEditModal(p)} style={styles.editBtn}>✏️</button>
                        <button onClick={() => handleDeleteProduct(p.id)} style={styles.deleteBtn}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "ventes" && (
          <section style={styles.section}>
            <h3>Historique & Créances</h3>
            <div style={{overflowX: "auto"}}>
              <table style={{...styles.table, minWidth: isMobile ? "600px" : "100%"}}>
                <thead>
                  <tr style={styles.thr}>
                    <th style={styles.th}>Client</th>
                    <th style={styles.th}>Produit</th>
                    <th style={styles.th}>Reste (Dette)</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={styles.tr}>
                      <td style={styles.td}>{t.client} <br/> <small>{t.phone}</small></td>
                      <td style={styles.td}>{t.productName} (x{t.quantity})</td>
                      <td style={{...styles.td, color: t.debt > 0 ? "#e74c3c" : "#27ae60", fontWeight: "bold"}}>
                        {t.debt > 0 ? `${t.debt.toLocaleString()} F` : "Réglé ✅"}
                      </td>
                      <td style={styles.td}>
                        {t.debt > 0 && <button onClick={() => handlePayDebt(t.id)} style={styles.payBtn}>💰 Encaisser</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MODAL RESPONSIVE */}
        {isModalOpen && (
          <div style={styles.overlay}>
            <div style={{...styles.modal, width: isMobile ? "90%" : "400px", padding: isMobile ? "20px" : "30px"}}>
              <h3 style={{marginTop: 0}}>{editingId ? "Modifier" : "Ajouter"} le Produit</h3>
              <form onSubmit={handleSaveProduct} style={styles.form}>
                <label style={styles.label}>Nom</label>
                <input type="text" value={newProd.nom} style={styles.input} required onChange={e => setNewProd({...newProd, nom: e.target.value})} />
                <label style={styles.label}>Prix (FCFA)</label>
                <input type="number" value={newProd.prix} style={styles.input} required onChange={e => setNewProd({...newProd, prix: e.target.value})} />
                <label style={styles.label}>Quantité</label>
                <input type="number" value={newProd.action} style={styles.input} required onChange={e => setNewProd({...newProd, action: e.target.value})} />
                <label style={styles.label}>Photo</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {imagePreview && <img src={imagePreview} style={styles.preview} alt="" />}
                <div style={styles.modalButtons}>
                  <button type="button" onClick={closeModal} style={styles.cancelBtn}>Annuler</button>
                  <button type="submit" style={styles.saveBtn}>Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#f4f7f6", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
  navbar: { display: "flex", justifyContent: "space-between", background: "#2c3e50", color: "white", alignItems: "center" },
  logo: { fontWeight: "bold", color: "#3498db" },
  logoutBtn: { background: "#e74c3c", color: "white", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer" },
  content: { },
  tabContainer: { display: "flex", gap: "10px", marginBottom: "25px" },
  tab: { padding: "12px 25px", background: "#dcdde1", border: "none", borderRadius: "8px", cursor: "pointer" },
  tabActive: { padding: "12px 25px", background: "#3498db", color: "white", borderRadius: "8px", fontWeight: "bold" },
  section: { background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" },
  addBtn: { background: "#27ae60", color: "white", border: "none", padding: "12px 20px", borderRadius: "6px", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse" },
  thr: { background: "#f8f9fa" },
  th: { textAlign: "left", padding: "15px", borderBottom: "2px solid #edf2f7", fontSize: "14px" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "15px", fontSize: "15px" },
  imgTable: { width: "45px", height: "45px", borderRadius: "8px", objectFit: "cover" },
  noImg: { width: "45px", height: "45px", background: "#eee", borderRadius: "8px", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editBtn: { background: "#f39c12", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", marginRight: "5px", cursor: "pointer" },
  deleteBtn: { background: "#e74c3c", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer" },
  payBtn: { background: "#3498db", color: "white", border: "none", padding: "8px 12px", borderRadius: "5px", cursor: "pointer" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", borderRadius: "15px", boxSizing: 'border-box' },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  label: { fontSize: "13px", fontWeight: "bold" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ddd" },
  preview: { width: "100%", height: "100px", objectFit: "contain", marginTop: "10px" },
  modalButtons: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" },
  cancelBtn: { padding: "10px 15px", background: "#eee", border: "none", borderRadius: "8px", cursor: "pointer" },
  saveBtn: { padding: "10px 15px", background: "#2ecc71", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }
};