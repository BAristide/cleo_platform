import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const methodLabels = { bank_transfer: 'Virement', check: 'Chèque', cash: 'Espèces', lcn: 'LCN', other: 'Autre' };

export default function PaymentList() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    axios.get('/api/purchasing/supplier-payments/').then(r => setPayments(r.data.results || r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Paiements fournisseur</h1>
        <Link to="/purchasing/payments/new" style={{
          padding: '8px 16px', background: '#3182ce', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14
        }}>+ Nouveau</Link>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Facture</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Fournisseur</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Date</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Montant</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Méthode</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Référence</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{p.invoice_number || '—'}</td>
              <td style={{ padding: '12px 16px' }}>{p.supplier_name || '—'}</td>
              <td style={{ padding: '12px 16px' }}>{new Date(p.date).toLocaleDateString('fr-FR')}</td>
              <td style={{ padding: '12px 16px', fontWeight: 600 }}>{parseFloat(p.amount || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '12px 16px' }}>{methodLabels[p.method] || p.method}</td>
              <td style={{ padding: '12px 16px' }}>{p.reference || '—'}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>Aucun paiement</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
