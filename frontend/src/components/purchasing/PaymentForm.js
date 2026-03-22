import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

export default function PaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');

  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({
    invoice: invoiceId || '', date: new Date().toISOString().slice(0, 10),
    amount: '', method: 'bank_transfer', reference: '', notes: ''
  });

  useEffect(() => {
    axios.get('/api/purchasing/supplier-invoices/?state=validated').then(r => {
      setInvoices(r.data.results || r.data);
    }).catch(console.error);
  }, []);

  // Pré-remplir le montant si facture pré-sélectionnée
  useEffect(() => {
    if (form.invoice && !form.amount) {
      const inv = invoices.find(i => String(i.id) === String(form.invoice));
      if (inv) setForm(f => ({ ...f, amount: inv.amount_due }));
    }
  }, [form.invoice, invoices]);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/purchasing/supplier-payments/', form)
      .then(() => navigate('/purchasing/payments'))
      .catch(err => handleApiError(err, null, "Impossible d'enregistrer le paiement."));
  };

  const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Nouveau paiement fournisseur</h1>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Facture *</label>
            <select required style={fieldStyle} value={form.invoice} onChange={e => setForm({ ...form, invoice: e.target.value, amount: '' })}>
              <option value="">— Sélectionner —</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} — {inv.supplier_name} — Dû: {parseFloat(inv.amount_due).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: '#4a5568' }}>Montant *</label>
              <input type="number" step="0.01" required style={fieldStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#4a5568' }}>Méthode *</label>
              <select required style={fieldStyle} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option value="bank_transfer">Virement bancaire</option>
                <option value="check">Chèque</option>
                <option value="cash">Espèces</option>
                <option value="lcn">LCN</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#4a5568' }}>Date</label>
              <input type="date" style={fieldStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#4a5568' }}>Référence</label>
              <input style={fieldStyle} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Notes</label>
            <textarea style={{ ...fieldStyle, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Enregistrer le paiement</button>
          <button type="button" onClick={() => navigate('/purchasing/payments')} style={{ padding: '10px 24px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
