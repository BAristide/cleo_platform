import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  validated: { label: 'Validée', bg: '#c6f6d5', color: '#276749' },
  cancelled: { label: 'Annulée', bg: '#fed7d7', color: '#9b2c2c' },
};

export default function ReceptionList() {
  const [receptions, setReceptions] = useState([]);

  useEffect(() => {
    axios.get('/api/purchasing/receptions/').then(r => setReceptions(r.data.results || r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Réceptions</h1>
        <Link to="/purchasing/receptions/new" style={{
          padding: '8px 16px', background: '#3182ce', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14
        }}>+ Nouvelle</Link>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Numéro</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Bon de commande</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Entrepôt</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Date</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>État</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {receptions.map(r => {
            const s = stateLabels[r.state] || {};
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{r.number}</td>
                <td style={{ padding: '12px 16px' }}>{r.purchase_order_number || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{r.warehouse_name || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link to={`/purchasing/receptions/${r.id}`} style={{ color: '#3182ce', fontSize: 13 }}>Détail</Link>
                </td>
              </tr>
            );
          })}
          {receptions.length === 0 && (
            <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>Aucune réception</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
