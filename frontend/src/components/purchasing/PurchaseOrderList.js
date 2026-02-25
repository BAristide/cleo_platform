import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  confirmed: { label: 'Confirmé', bg: '#bee3f8', color: '#2b6cb0' },
  received: { label: 'Réceptionné', bg: '#c6f6d5', color: '#276749' },
  invoiced: { label: 'Facturé', bg: '#e9d8fd', color: '#553c9a' },
  cancelled: { label: 'Annulé', bg: '#fed7d7', color: '#9b2c2c' },
};

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const url = filter ? `/api/purchasing/purchase-orders/?state=${filter}` : '/api/purchasing/purchase-orders/';
    axios.get(url).then(r => setOrders(r.data.results || r.data)).catch(console.error);
  }, [filter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Bons de commande</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <option value="">Tous les états</option>
            <option value="draft">Brouillons</option>
            <option value="confirmed">Confirmés</option>
            <option value="received">Réceptionnés</option>
            <option value="invoiced">Facturés</option>
            <option value="cancelled">Annulés</option>
          </select>
          <Link to="/purchasing/orders/new" style={{
            padding: '8px 16px', background: '#3182ce', color: '#fff',
            borderRadius: 6, textDecoration: 'none', fontSize: 14
          }}>+ Nouveau</Link>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Numéro</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Fournisseur</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Date</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Total</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>État</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const s = stateLabels[o.state] || {};
            return (
              <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{o.number}</td>
                <td style={{ padding: '12px 16px' }}>{o.supplier_name || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{o.date ? new Date(o.date).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{parseFloat(o.total || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link to={`/purchasing/orders/${o.id}`} style={{ color: '#3182ce', fontSize: 13 }}>Détail</Link>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>Aucun bon de commande</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
