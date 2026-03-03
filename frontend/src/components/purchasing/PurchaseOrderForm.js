import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplier: '', currency: '', date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '', notes: ''
  });
  const [items, setItems] = useState([{ product: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);

  useEffect(() => {
    axios.get('/api/purchasing/suppliers/?is_active=true').then(r => setSuppliers(r.data.results || r.data)).catch(console.error);
    axios.get('/api/core/currencies/').then(r => setCurrencies(r.data.results || r.data)).catch(console.error);
    axios.get('/api/sales/products/').then(r => setProducts(r.data.results || r.data)).catch(console.error);
  }, []);

  // Auto-remplir la devise quand on sélectionne un fournisseur
  const handleSupplierChange = (supplierId) => {
    if (supplierId) {
      const supplier = suppliers.find(s => s.id === parseInt(supplierId));
      if (supplier && supplier.currency) {
        setForm(prev => ({ ...prev, supplier: supplierId, currency: String(supplier.currency) }));
      } else {
        setForm(prev => ({ ...prev, supplier: supplierId }));
      }
    } else {
      setForm(prev => ({ ...prev, supplier: '', currency: '' }));
    }
  };

  // Auto-remplir le prix et la TVA quand on sélectionne un produit
  const handleProductChange = (index, productId) => {
    const updated = [...items];
    updated[index] = { ...updated[index], product: productId };
    if (productId) {
      const product = products.find(p => p.id === parseInt(productId));
      if (product) {
        updated[index].unit_price = product.unit_price || 0;
        updated[index].tax_rate = product.tax_rate ?? 0;
      }
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { product: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.currency) {
        alert('Veuillez sélectionner une devise.');
        return;
      }
      if (!payload.expected_delivery_date) {
        delete payload.expected_delivery_date;
      }
      const orderRes = await axios.post('/api/purchasing/purchase-orders/', payload);
      const orderId = orderRes.data.id;
      for (const item of items) {
        if (item.product || item.description) {
          await axios.post('/api/purchasing/purchase-order-items/', { ...item, order: orderId });
        }
      }
      navigate(`/purchasing/orders/${orderId}`);
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Nouveau bon de commande</h1>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Fournisseur *</label>
            <select required style={fieldStyle} value={form.supplier} onChange={e => handleSupplierChange(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Devise *</label>
            <select required style={fieldStyle} value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {currencies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Date *</label>
            <input type="date" required style={fieldStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Livraison prévue</label>
            <input type="date" style={fieldStyle} value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} />
          </div>
        </div>

        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Lignes</h3>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 8 }}>
            <select style={fieldStyle} value={item.product} onChange={e => handleProductChange(i, e.target.value)}>
              <option value="">— Produit —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qté" style={fieldStyle} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
            <input type="number" step="0.01" placeholder="P.U." style={fieldStyle} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
            <input type="number" step="0.01" placeholder="TVA %" style={fieldStyle} value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
            <button type="button" onClick={() => removeItem(i)} style={{ background: '#fed7d7', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 18, color: '#e53e3e' }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addItem} style={{ padding: '6px 16px', background: '#edf2f7', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 20 }}>+ Ajouter une ligne</button>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#4a5568' }}>Notes</label>
          <textarea style={{ ...fieldStyle, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Créer le bon de commande</button>
          <button type="button" onClick={() => navigate('/purchasing/orders')} style={{ padding: '10px 24px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
