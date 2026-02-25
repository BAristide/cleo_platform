import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

const kpiConfig = [
  { key: 'suppliers_count', label: 'Fournisseurs actifs', icon: '🏭', color: '#3182ce' },
  { key: 'pending_orders', label: 'BC à réceptionner', icon: '📋', color: '#dd6b20' },
  { key: 'pending_receptions', label: 'Réceptions en attente', icon: '📦', color: '#805ad5' },
  { key: 'unpaid_invoices', label: 'Factures impayées', icon: '🧾', color: '#e53e3e' },
  { key: 'total_purchases', label: 'Total achats', icon: '💰', color: '#38a169', isCurrency: true },
  { key: 'total_due', label: 'Dettes fournisseurs', icon: '💳', color: '#d69e2e', isCurrency: true },
];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/purchasing/dashboard/').then(r => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return <p>Chargement...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Achats — Tableau de bord</h1>
        <Link to="/purchasing/orders/new" style={{
          padding: '10px 20px', background: '#3182ce', color: '#fff',
          borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
        }}>
          + Nouveau bon de commande
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {kpiConfig.map(kpi => (
          <div key={kpi.key} style={{
            background: '#fff', borderRadius: 12, padding: 20,
            borderLeft: `4px solid ${kpi.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2d3748' }}>
              {kpi.isCurrency
                ? parseFloat(data[kpi.key] || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })
                : data[kpi.key]}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Bons de commande</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>Brouillons</span>
              <span style={{ fontWeight: 600 }}>{data.po_draft}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>Confirmés</span>
              <span style={{ fontWeight: 600, color: '#dd6b20' }}>{data.po_confirmed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>Réceptionnés</span>
              <span style={{ fontWeight: 600, color: '#38a169' }}>{data.po_received}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Actions rapides</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/purchasing/suppliers/new" style={{ color: '#3182ce', textDecoration: 'none' }}>+ Nouveau fournisseur</Link>
            <Link to="/purchasing/orders/new" style={{ color: '#3182ce', textDecoration: 'none' }}>+ Nouveau bon de commande</Link>
            <Link to="/purchasing/receptions/new" style={{ color: '#3182ce', textDecoration: 'none' }}>+ Nouvelle réception</Link>
            <Link to="/purchasing/invoices/new" style={{ color: '#3182ce', textDecoration: 'none' }}>+ Nouvelle facture fournisseur</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
