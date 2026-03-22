import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { message } from 'antd';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  confirmed: { label: 'Confirmé', bg: '#bee3f8', color: '#2b6cb0' },
  received: { label: 'Réceptionné', bg: '#c6f6d5', color: '#276749' },
  invoiced: { label: 'Facturé', bg: '#e9d8fd', color: '#553c9a' },
  cancelled: { label: 'Annulé', bg: '#fed7d7', color: '#9b2c2c' },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  const load = () => axios.get(`/api/purchasing/purchase-orders/${id}/`).then(r => setOrder(r.data)).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const handleConfirm = () => {
    if (window.confirm('Confirmer ce bon de commande ?')) {
      axios.post(`/api/purchasing/purchase-orders/${id}/confirm/`).then(() => load()).catch(e => handleApiError(e, null, 'Une erreur est survenue.'));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Annuler ce bon de commande ?')) {
      axios.post(`/api/purchasing/purchase-orders/${id}/cancel/`).then(() => load()).catch(e => handleApiError(e, null, 'Une erreur est survenue.'));
    }
  };

  if (!order) return <p>Chargement...</p>;
  const s = stateLabels[order.state] || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>BC {order.number}</h1>
          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {order.state === 'draft' && (
            <button onClick={handleConfirm} style={{
              padding: '8px 16px', background: '#38a169', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>✓ Confirmer</button>
          )}
          {order.state === 'confirmed' && (
            <Link to={`/purchasing/receptions/new?po=${id}`} style={{
              padding: '8px 16px', background: '#805ad5', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 14
            }}>Créer réception</Link>
          )}
          {['draft', 'confirmed'].includes(order.state) && (
            <button onClick={handleCancel} style={{
              padding: '8px 16px', background: '#e53e3e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>✗ Annuler</button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Fournisseur</span><br /><strong>{order.supplier_name}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Date</span><br /><strong>{order.date ? new Date(order.date).toLocaleDateString('fr-FR') : '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Livraison prévue</span><br /><strong>{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR') : '—'}</strong></div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Lignes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Produit</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Quantité</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Reçu</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>P.U.</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>TVA</th>
              <th style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{item.product_name || item.description}</td>
                <td style={{ padding: '8px 12px' }}>{item.quantity}</td>
                <td style={{ padding: '8px 12px', color: item.quantity_received >= item.quantity ? '#38a169' : '#dd6b20' }}>
                  {item.quantity_received}
                </td>
                <td style={{ padding: '8px 12px' }}>{parseFloat(item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '8px 12px' }}>{item.tax_rate}%</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                  {parseFloat(item.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#718096', fontSize: 13 }}>HT : {parseFloat(order.subtotal).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
            <div style={{ color: '#718096', fontSize: 13 }}>TVA : {parseFloat(order.tax_amount).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Total : {parseFloat(order.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {order.notes && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Notes</h3>
          <p style={{ margin: 0, color: '#4a5568' }}>{order.notes}</p>
        </div>
      )}
    </div>
  );
}
