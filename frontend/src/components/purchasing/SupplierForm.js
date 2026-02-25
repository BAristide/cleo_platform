import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({
    code: '', name: '', contact_name: '', email: '', phone: '',
    address: '', tax_id: '', currency: '', payment_terms: 30, is_active: true, notes: ''
  });

  useEffect(() => {
    api.get('/api/sales/currencies/').then(r => setCurrencies(r.data.results || r.data)).catch(console.error);
    if (id) api.get(`/api/purchasing/suppliers/${id}/`).then(r => setForm(r.data)).catch(console.error);
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = id ? api.put(`/api/purchasing/suppliers/${id}/`, form) : api.post('/api/purchasing/suppliers/', form);
    req.then(() => navigate('/purchasing/suppliers')).catch(e => alert(JSON.stringify(e.response?.data)));
  };

  const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>{id ? 'Modifier' : 'Nouveau'} fournisseur</h1>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Code *</label>
            <input required style={fieldStyle} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Nom *</label>
            <input required style={fieldStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Contact</label>
            <input style={fieldStyle} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Email</label>
            <input type="email" style={fieldStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Téléphone</label>
            <input style={fieldStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>ICE</label>
            <input style={fieldStyle} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Devise</label>
            <select style={fieldStyle} value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value || null })}>
              <option value="">— Sélectionner —</option>
              {currencies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Délai paiement (jours)</label>
            <input type="number" style={fieldStyle} value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#4a5568' }}>Adresse</label>
          <textarea style={{ ...fieldStyle, minHeight: 60 }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#4a5568' }}>Notes</label>
          <textarea style={{ ...fieldStyle, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {id ? 'Enregistrer' : 'Créer'}
          </button>
          <button type="button" onClick={() => navigate('/purchasing/suppliers')} style={{ padding: '10px 24px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
