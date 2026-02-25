import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

const stateLabels = {
  draft: { label: 'Brouillon', bg: '#e2e8f0', color: '#4a5568' },
  validated: { label: 'Validée', bg: '#bee3f8', color: '#2b6cb0' },
  paid: { label: 'Payée', bg: '#c6f6d5', color: '#276749' },
  cancelled: { label: 'Annulée', bg: '#fed7d7', color: '#9b2c2c' },
};

export default function SupplierInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const url = filter ? `/api/purchasing/supplier-invoices/?state=${filter}` : '/api/purchasing/supplier-invoices/';
    api.get(url).then(r => setInvoices(r.data.results || r.data)).catch(console.error);
  }, [filter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Factures fournisseur</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <option value="">Tous les états</option>
            <option value="draft">Brouillons</option>
            <option value="validated">Validées</option>
            <option value="paid">Payées</option>
            <option value="cancelled">Annulées</option>
          </select>
          <Link to="/purchasing/invoices/new" style={{
            padding: '8px 16px', background: '#3182ce', color: '#fff',
            borderRadius: 6, textDecoration: 'none', fontSize: 14
          }}>+ Nouvelle</Link>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Numéro</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Fournisseur</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Réf. fournisseur</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Date</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Total</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Reste dû</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>État</th>
            <th style={{ padding: '12px 16px', fontSize: 13 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => {
            const s = stateLabels[inv.state] || {};
            return (
              <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{inv.number}</td>
                <td style={{ padding: '12px 16px' }}>{inv.supplier_name || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{inv.supplier_reference || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '—'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{parseFloat(inv.total || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '12px 16px', color: parseFloat(inv.amount_due) > 0 ? '#e53e3e' : '#38a169' }}>
                  {parseFloat(inv.amount_due || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link to={`/purchasing/invoices/${inv.id}`} style={{ color: '#3182ce', fontSize: 13 }}>Détail</Link>
                </td>
              </tr>
            );
          })}
          {invoices.length === 0 && (
            <tr><td colSpan="8" style={{ padding: 24, textAlign: 'center', color: '#a0aec0' }}>Aucune facture fournisseur</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
