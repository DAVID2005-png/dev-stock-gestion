import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, onSnapshot, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Importation indispensable

export default function DashboardSecretaire() {
  const [products, setProducts] = useState([]);
  const [selectedProd, setSelectedProd] = useState("");
  const [qty, setQty] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [currentTotal, setCurrentTotal] = useState(0);

  // --- DETECTION MOBILE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "produits"), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const product = products.find(p => p.id === selectedProd);
    if (product) {
      setCurrentTotal(Number(product.prix || 0) * Number(qty));
    } else {
      setCurrentTotal(0);
    }
  }, [selectedProd, qty, products]);

  // --- FONCTION DE GÉNÉRATION DU PDF (CORRIGÉE) ---
  const generatePDF = (saleData) => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('fr-FR');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(52, 152, 219);
    doc.text("DEV STOCK", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text("REÇU DE VENTE", 105, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date : ${dateStr}`, 20, 45);
    doc.text(`Vendeur : ${auth.currentUser?.email}`, 20, 50);
    doc.text(`Client : ${saleData.client}`, 20, 55);
    doc.text(`Téléphone : ${saleData.phone}`, 20, 60);

    // Utilisation de la fonction autoTable importée directement (Correction de l'erreur)
    autoTable(doc, {
      startY: 70,
      head: [['Produit', 'Prix Unit.', 'Quantité', 'Total HT']],
      body: [[
        saleData.productName, 
        `${saleData.unitPrice.toLocaleString()} F`, 
        saleData.quantity, 
        `${saleData.totalPrice.toLocaleString()} F`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total à payer : ${saleData.totalPrice.toLocaleString()} F`, 140, finalY);
    doc.text(`Montant versé : ${saleData.paid.toLocaleString()} F`, 140, finalY + 8);
    
    if (saleData.debt > 0) {
      doc.setTextColor(231, 76, 60);
      doc.setFont("helvetica", "bold");
      doc.text(`RESTE À PAYER : ${saleData.debt.toLocaleString()} F`, 140, finalY + 16);
    } else {
      doc.setTextColor(39, 174, 96);
      doc.text("STATUT : RÉGLÉ ✅", 140, finalY + 16);
    }
    
    doc.save(`Recu_${saleData.client}_${Date.now()}.pdf`);
  };

  const handleSale = async (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === selectedProd);
    if (!product) return alert("Veuillez choisir un produit");
    if (Number(product.action || 0) < Number(qty)) return alert("Stock insuffisant !");

    const totalHT = Number(product.prix || 0) * Number(qty);
    const debtAmount = totalHT - Number(amountPaid);

    const saleData = {
      productName: product.nom,
      unitPrice: Number(product.prix),
      quantity: Number(qty),
      totalPrice: totalHT,
      paid: Number(amountPaid),
      debt: debtAmount >= 0 ? debtAmount : 0,
      client: clientName,
      phone: clientPhone
    };

    try {
      await addDoc(collection(db, "transactions"), {
        ...saleData,
        seller: auth.currentUser.email,
        date: serverTimestamp()
      });
      await updateDoc(doc(db, "produits", selectedProd), {
        action: increment(-Number(qty))
      });
      generatePDF(saleData);
      alert("Vente validée et Reçu téléchargé !");
      setSelectedProd(""); setQty(1); setClientName(""); setClientPhone(""); setAmountPaid(0);
    } catch (err) { alert("Erreur : " + err.message); }
  };

  return (
    <div style={styles.container}>
      <nav style={{...styles.navbar, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0'}}>
        <div style={styles.logo}>DEV STOCK</div>
        <div style={{display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px'}}>
           <span style={{fontSize: isMobile ? '11px' : '14px'}}>{auth.currentUser?.email}</span>
           <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Déconnexion</button>
        </div>
      </nav>

      <div style={{...styles.main, gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", padding: isMobile ? "15px" : "30px"}}>
        <section style={styles.card}>
          <h3 style={{color: '#2c3e50', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '16px' : '18px'}}>
            🛒 Nouvelle Vente
            {currentTotal > 0 && <span style={{color: '#3498db'}}>{currentTotal.toLocaleString()} FC</span>}
          </h3>
          
          <form onSubmit={handleSale} style={styles.form}>
            <label style={styles.label}>Sélectionner le produit</label>
            <select value={selectedProd} onChange={(e) => setSelectedProd(e.target.value)} required style={styles.input}>
              <option value="">Choisir un article...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.action <= 0}>
                  {p.nom} ({p.prix} F) - Stock: {p.action}
                </option>
              ))}
            </select>
            
            <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px'}}>
              <div>
                <label style={styles.label}>Quantité</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={styles.input} min="1" required />
              </div>
              <div>
                <label style={styles.label}>Montant payé (FC)</label>
                <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{...styles.input, borderColor: (currentTotal - amountPaid) > 0 ? '#e74c3c' : '#2ecc71'}} required />
              </div>
            </div>

            {currentTotal - amountPaid > 0 && (
              <div style={styles.debtAlert}>
                ⚠️ Dette : <b>{(currentTotal - amountPaid).toLocaleString()} FC</b>
              </div>
            )}

            <label style={styles.label}>Client</label>
            <input type="text" placeholder="Nom du client" value={clientName} onChange={e => setClientName(e.target.value)} style={styles.input} required />
            <input type="text" placeholder="Téléphone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={styles.input} required />
            
            <button type="submit" style={styles.sellBtn}>Valider & Imprimer</button>
          </form>
        </section>

        <section style={styles.card}>
          <h3 style={{color: '#2c3e50', marginBottom: '20px', fontSize: isMobile ? '16px' : '18px'}}>📦 État des Stocks</h3>
          <div style={styles.scrollZone}>
            {products.map(p => (
              <div key={p.id} style={styles.prodItem}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  {p.imageUrl ? <img src={p.imageUrl} style={styles.imgThumb} alt="" /> : <div style={styles.noImg}>📦</div>}
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '14px'}}>{p.nom}</div>
                    <div style={{fontSize: '12px', color: '#7f8c8d'}}>{p.prix?.toLocaleString()} FC</div>
                  </div>
                </div>
                <span style={p.action <= 5 ? styles.lowStock : styles.okStock}>{p.action}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#f4f7f6", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
  navbar: { display: "flex", justifyContent: "space-between", padding: "15px 30px", background: "#2c3e50", color: "white", alignItems: 'center' },
  logo: { fontSize: "20px", fontWeight: "bold", color: "#3498db" },
  logoutBtn: { background: "#e74c3c", color: "white", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" },
  main: { display: "grid", gap: "25px" },
  card: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", height: 'fit-content' },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase' },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", outline: 'none', fontSize: '15px', width: '100%', boxSizing: 'border-box' },
  debtAlert: { padding: '10px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '13px' },
  sellBtn: { padding: "15px", background: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  scrollZone: { maxHeight: "400px", overflowY: "auto" },
  prodItem: { display: "flex", justifyContent: "space-between", alignItems: 'center', padding: "10px 0", borderBottom: "1px solid #f4f7f6" },
  imgThumb: { width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' },
  noImg: { width: '40px', height: '40px', background: '#eee', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lowStock: { color: "#e74c3c", fontWeight: "bold", fontSize: '12px', background: '#fff5f5', padding: '4px 8px', borderRadius: '4px' },
  okStock: { color: "#2ecc71", fontWeight: "bold", fontSize: '12px', background: '#f0fff4', padding: '4px 8px', borderRadius: '4px' }
};