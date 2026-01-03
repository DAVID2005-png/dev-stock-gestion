import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function DashboardAdmin() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ totalVentes: 0, totalDettes: 0, alertes: 0 });
  const [view, setView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // AJOUT SEULEMENT POUR LE RESPONSIVE
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "produits"), (snap) => {
      const pList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(pList);
      const nbAlertes = pList.filter(p => Number(p.action || 0) <= 5).length;
      setStats(prev => ({ ...prev, alertes: nbAlertes }));
    });

    const unsubSales = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snap) => {
      const sList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(sList);
      let v = 0; let d = 0;
      sList.forEach(s => {
        v += Number(s.paid || 0);
        d += Number(s.debt || 0);
      });
      setStats(prev => ({ ...prev, totalVentes: v, totalDettes: d }));
    });

    return () => { unsubProd(); unsubSales(); };
  }, []);

  const filteredProducts = products.filter(p => 
    p.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerSummary = sales.reduce((acc, sale) => {
    if (sale.debt > 0) {
      if (!acc[sale.client]) {
        acc[sale.client] = { total: 0, phone: sale.phone, items: [] };
      }
      acc[sale.client].total += Number(sale.debt);
      acc[sale.client].items.push(sale);
    }
    return acc;
  }, {});

  const filteredClients = Object.entries(customerSummary).filter(([name]) => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{...styles.container, flexDirection: isMobile ? 'column' : 'row'}}>
      {/* SIDEBAR */}
      <aside style={{...styles.sidebar, width: isMobile ? '100%' : '280px'}}>
        <div style={styles.logoArea}>
          <h2 style={styles.logo}>DEV STOCK</h2>
          <div style={styles.adminBadge}>ADMINISTRATEUR</div>
        </div>
        
        <nav style={{...styles.sideNav, display: isMobile ? 'flex' : 'block', overflowX: isMobile ? 'auto' : 'visible'}}>
          <div onClick={() => {setView('dashboard'); setSearchTerm("");}} style={view === 'dashboard' ? styles.activeLink : styles.link}>📊 Tableau de bord</div>
          <div onClick={() => {setView('inventaire'); setSearchTerm("");}} style={view === 'inventaire' ? styles.activeLink : styles.link}>📦 Inventaire Complet</div>
          <div onClick={() => {setView('dettes'); setSearchTerm("");}} style={view === 'dettes' ? styles.activeLink : styles.link}>👥 Liste des Dettes</div>
          <div onClick={() => {setView('messages'); setSearchTerm("");}} style={view === 'messages' ? styles.activeLink : styles.link}>
            💬 Alertes {stats.alertes > 0 && <span style={styles.notifBadge}>{stats.alertes}</span>}
          </div>
        </nav>

        <div style={styles.footerNav}>
          <div style={styles.userInfo}>{auth.currentUser?.email}</div>
          <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Se déconnecter</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{...styles.main, padding: isMobile ? '15px' : '40px'}}>
        <header style={{...styles.header, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center'}}>
          <div>
            <h1 style={{...styles.viewTitle, fontSize: isMobile ? '22px' : '28px'}}>
              {view === 'dashboard' && 'Rapport d\'activité'}
              {view === 'inventaire' && 'Gestion des Stocks'}
              {view === 'dettes' && 'Portefeuille Créances'}
              {view === 'messages' && 'Notifications Système'}
            </h1>
            <p style={{color: '#7f8c8d'}}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>

          {view !== 'dashboard' && view !== 'messages' && (
            <input 
              type="text" 
              placeholder="Rechercher..." 
              style={{...styles.searchBar, width: isMobile ? '100%' : '300px'}}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}
        </header>

        {/* --- VUE DASHBOARD --- */}
        {view === 'dashboard' && (
          <>
            <div style={{...styles.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)'}}>
              <div style={{...styles.card, borderLeft: "5px solid #3498db"}}>
                <span style={styles.cardLabel}>Recettes Totales</span>
                <h2 style={styles.cardValue}>{stats.totalVentes.toLocaleString()} FC</h2>
              </div>
              <div style={{...styles.card, borderLeft: "5px solid #e74c3c"}}>
                <span style={styles.cardLabel}>Dettes à Recouvrer</span>
                <h2 style={{...styles.cardValue, color: "#e74c3c"}}>{stats.totalDettes.toLocaleString()} FC</h2>
              </div>
              <div style={{...styles.card, borderLeft: "5px solid #f39c12"}}>
                <span style={styles.cardLabel}>Produits en Rupture</span>
                <h2 style={{...styles.cardValue, color: "#f39c12"}}>{stats.alertes}</h2>
              </div>
            </div>

            <div style={{...styles.lowerGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
              <section style={styles.tableSection}>
                <h3 style={styles.sectionTitle}>⚠️ Stocks Critiques (≤ 10)</h3>
                <div style={styles.scrollBox}>
                  {products.filter(p => p.action <= 10).map(p => (
                    <div key={p.id} style={styles.criticalItem}>
                      <img src={p.imageUrl || 'https://via.placeholder.com/40'} style={styles.imgThumb} alt=""/>
                      <div style={{flex: 1, marginLeft: '10px'}}>
                        <div style={{fontWeight: 'bold'}}>{p.nom}</div>
                        <small style={{color: '#e74c3c'}}>Il ne reste que {p.action} pièces</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.tableSection}>
                <h3 style={styles.sectionTitle}>🕒 Flux des Ventes</h3>
                <div style={styles.scrollBox}>
                  {sales.slice(0, 10).map(s => (
                    <div key={s.id} style={styles.saleLog}>
                      <span><b>{s.client}</b></span>
                      <span>{s.productName}</span>
                      <span style={{color: '#27ae60', fontWeight: 'bold'}}>{s.paid} FC</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {/* --- VUE INVENTAIRE --- */}
        {view === 'inventaire' && (
          <div style={{...styles.tableSection, overflowX: 'auto'}}>
            <table style={{...styles.table, minWidth: isMobile ? '600px' : '100%'}}>
              <thead>
                <tr style={styles.thr}><th>Image</th><th>Désignation</th><th>Prix Unitaire</th><th>Quantité</th><th>Valeur</th></tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}><img src={p.imageUrl} style={styles.imgThumb} alt=""/></td>
                    <td style={styles.td}><b>{p.nom}</b></td>
                    <td style={styles.td}>{p.prix.toLocaleString()} FC</td>
                    <td style={{...styles.td, color: p.action <= 5 ? 'red' : 'inherit'}}>{p.action}</td>
                    <td style={styles.td}><b>{(p.prix * p.action).toLocaleString()} FC</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- VUE DETTES --- */}
        {view === 'dettes' && (
          <div style={{...styles.tableSection, overflowX: 'auto'}}>
            {!selectedClient ? (
              <table style={{...styles.table, minWidth: isMobile ? '600px' : '100%'}}>
                <thead>
                  <tr style={styles.thr}><th>Client</th><th>Téléphone</th><th>Montant Total</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filteredClients.map(([name, data]) => (
                    <tr key={name} style={styles.tr}>
                      <td style={styles.td}>👤 <b>{name}</b></td>
                      <td style={styles.td}>{data.phone}</td>
                      <td style={{...styles.td, color: '#e74c3c', fontWeight: 'bold'}}>{data.total.toLocaleString()} FC</td>
                      <td style={styles.td}>
                        <button onClick={() => setSelectedClient({name, ...data})} style={styles.detailsBtn}>Détails</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div>
                <button onClick={() => setSelectedClient(null)} style={styles.backBtn}>⬅ Retour à la liste</button>
                <div style={styles.clientHeader}>
                   <h2>Dossier : {selectedClient.name}</h2>
                   <p>Contact : {selectedClient.phone}</p>
                </div>
                {selectedClient.items.map((item, idx) => (
                  <div key={idx} style={styles.debtRow}>
                    <div>
                       <b>{item.productName}</b> (x{item.quantity})<br/>
                       <small>Vendu par : {item.seller}</small>
                    </div>
                    <div style={{textAlign: 'right'}}>
                       <span style={{color: '#e74c3c', fontWeight: 'bold'}}>{item.debt.toLocaleString()} FC</span><br/>
                       <small>{item.date?.toDate().toLocaleDateString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- VUE MESSAGES --- */}
        {view === 'messages' && (
          <div style={styles.msgContainer}>
            {products.filter(p => p.action <= 5).map(p => (
              <div key={p.id} style={styles.msgAlert}>
                <div style={{fontSize: '24px'}}>📢</div>
                <div>
                   <b>RUPTURE IMMINENTE : {p.nom}</b><br/>
                   Le stock est descendu à {p.action}. Veuillez lancer un réapprovisionnement immédiatement.
                </div>
              </div>
            ))}
            {stats.alertes === 0 && <div style={styles.emptyMsg}>Aucune alerte système. Votre stock est sain. ✅</div>}
          </div>
        )}
      </main>
    </div>
  );
}

// STYLES INCHANGÉS (AVEC ADAPTATIONS MOBILES DISCRÈTES)
const styles = {
  container: { display: "flex", minHeight: "100vh", backgroundColor: "#f0f2f5", fontFamily: "'Inter', sans-serif" },
  sidebar: { backgroundColor: "#1a2a3a", color: "white", padding: "30px 20px", display: "flex", flexDirection: "column", boxSizing: 'border-box' },
  logoArea: { textAlign: 'center', marginBottom: '40px' },
  logo: { fontSize: "24px", letterSpacing: '2px', margin: 0 },
  adminBadge: { fontSize: '10px', background: '#3498db', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '5px' },
  sideNav: { flex: 1, gap: '5px' },
  link: { padding: "14px 18px", cursor: "pointer", borderRadius: "10px", marginBottom: "8px", color: "#a0aec0", whiteSpace: 'nowrap' },
  activeLink: { padding: "14px 18px", backgroundColor: "#3498db", borderRadius: "10px", color: "white", fontWeight: "600", whiteSpace: 'nowrap' },
  notifBadge: { backgroundColor: '#e74c3c', padding: '2px 7px', borderRadius: '50%', fontSize: '11px', float: 'right' },
  footerNav: { borderTop: '1px solid #2d3748', paddingTop: '20px' },
  userInfo: { fontSize: '12px', color: '#718096', marginBottom: '10px', textAlign: 'center' },
  logoutBtn: { width: '100%', padding: '12px', background: '#e74c3c', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  main: { flex: 1, overflowY: "auto", boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '40px', gap: '15px' },
  viewTitle: { fontSize: '28px', color: '#2d3748', margin: 0 },
  searchBar: { padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  statsGrid: { display: "grid", gap: "25px", marginBottom: "40px" },
  card: { backgroundColor: "white", padding: "25px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" },
  cardLabel: { color: "#718096", fontSize: "13px", fontWeight: "600", textTransform: 'uppercase' },
  cardValue: { fontSize: "32px", margin: "10px 0 0 0", color: "#2d3748" },
  lowerGrid: { display: "grid", gap: "30px" },
  tableSection: { backgroundColor: "white", padding: "25px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" },
  sectionTitle: { marginBottom: '20px', fontSize: '18px', color: '#4a5568' },
  scrollBox: { maxHeight: '350px', overflowY: 'auto' },
  criticalItem: { display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f7fafc' },
  saleLog: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f7fafc', fontSize: '14px' },
  table: { width: "100%", borderCollapse: "collapse" },
  thr: { textAlign: "left", background: "#f8fafc", borderBottom: "2px solid #edf2f7" },
  tr: { borderBottom: "1px solid #edf2f7", transition: '0.2s' },
  td: { padding: "15px", fontSize: "14px" },
  imgThumb: { width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' },
  detailsBtn: { padding: '6px 14px', background: '#ebf8ff', color: '#3182ce', border: '1px solid #bee3f8', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  backBtn: { padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' },
  debtRow: { display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fff5f5', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #f56565' },
  msgContainer: { maxWidth: '800px' },
  msgAlert: { display: 'flex', gap: '20px', padding: '20px', background: '#fffaf0', borderLeft: '5px solid #ed8936', borderRadius: '12px', marginBottom: '15px', alignItems: 'center' },
  emptyMsg: { textAlign: 'center', padding: '50px', color: '#a0aec0', fontSize: '18px' }
};