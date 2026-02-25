import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';

export default function ReceptionDetail() {
  const { id } = useParams();
  const [reception, setReception] = useState(null);

  const load = () => api.get(`/api/purchasing/receptions/${id}/`).then(r => setReception(r.data)).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const handleValidate = () => {
    if (window.confirm('Valider cette réception ? Les stocks seront mis à jour.')) {
      api.post(`/api/purchasing/receptions/${id}/validate/`).then(r => {
        alert(r.data.detail + ` (${r.data.moves_created} mouvement(s) créé(s))`);
        load();
      }).catch(e => alert(e.response?.data?.detail || 'Erreur'));
    }
  };

  if (!reception) return <p>Chargement...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Réception {reception.number}</h1>
          <span style={{
            padding: '2px 10px', borderRadius: 12, fontSize: 12,
            background: reception.state === 'validated' ? '#c6f6d5' : '#e2e8f0',
            color: reception.state === 'validated' ? '#276749' : '#4a5568'
          }}>{reception.state === 'validated' ? 'Validée' : 'Brouillon'}</span>
        </div>
        {reception.state === 'draft' && (
          <button onClick={handleValidate} style={{
            padding: '10px 20px', background: '#38a169', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
          }}>✓ Valider la réception</button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Bon de commande</span><br /><strong>{reception.purchase_order_number || '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Entrepôt</span><br /><strong>{reception.warehouse_name || '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Date</span><br /><strong>{reception.date ? new Date(reception.date).toLocaleDateString('fr-FR') : '—'}</strong></div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Lignes reçues</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Produit</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Quantité reçue</th>
            </tr>
          </thead>
          <tbody>
            {(reception.items || []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{item.product_name || `Produit #${item.product}`}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.quantity_received}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
