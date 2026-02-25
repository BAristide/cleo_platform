import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  validated: { label: 'Validée', bg: '#bee3f8', color: '#2b6cb0' },
  paid: { label: 'Payée', bg: '#c6f6d5', color: '#276749' },
  cancelled: { label: 'Annulée', bg: '#fed7d7', color: '#9b2c2c' },
};

export default function SupplierInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);

  const load = () => api.get(`/api/purchasing/supplier-invoices/${id}/`).then(r => setInvoice(r.data)).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const handleValidate = () => {
    if (window.confirm('Valider cette facture fournisseur ?')) {
      api.post(`/api/purchasing/supplier-invoices/${id}/validate/`).then(() => load()).catch(e => alert(e.response?.data?.detail || 'Erreur'));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Annuler cette facture ?')) {
      api.post(`/api/purchasing/supplier-invoices/${id}/cancel/`).then(() => load()).catch(e => alert(e.response?.data?.detail || 'Erreur'));
    }
  };

  if (!invoice) return <p>Chargement...</p>;
  const s = stateLabels[invoice.state] || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Facture {invoice.number}</h1>
          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {invoice.state === 'draft' && (
            <button onClick={handleValidate} style={{
              padding: '8px 16px', background: '#38a169', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>✓ Valider</button>
          )}
          {invoice.state === 'validated' && (
            <Link to={`/purchasing/payments/new?invoice=${id}`} style={{
              padding: '8px 16px', background: '#805ad5', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 14
            }}>💳 Enregistrer paiement</Link>
          )}
          {['draft', 'validated'].includes(invoice.state) && (
            <button onClick={handleCancel} style={{
              padding: '8px 16px', background: '#e53e3e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>✗ Annuler</button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Fournisseur</span><br /><strong>{invoice.supplier_name}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Réf. fournisseur</span><br /><strong>{invoice.supplier_reference || '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Date</span><br /><strong>{invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '—'}</strong></div>
          <div><span style={{ color: '#718096', fontSize: 13 }}>Échéance</span><br /><strong>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '—'}</strong></div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Lignes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Produit / Description</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>Quantité</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>P.U.</th>
              <th style={{ padding: '8px 12px', fontSize: 13 }}>TVA</th>
              <th style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{item.product_name || item.description}</td>
                <td style={{ padding: '8px 12px' }}>{item.quantity}</td>
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
            <div style={{ color: '#718096', fontSize: 13 }}>HT : {parseFloat(invoice.subtotal).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
            <div style={{ color: '#718096', fontSize: 13 }}>TVA : {parseFloat(invoice.tax_amount).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Total : {parseFloat(invoice.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 14, color: '#e53e3e', marginTop: 4 }}>Reste dû : {parseFloat(invoice.amount_due).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
