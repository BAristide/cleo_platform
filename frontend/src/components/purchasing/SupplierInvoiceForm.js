import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

export default function SupplierInvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    supplier: '', purchase_order: '', supplier_reference: '', currency: '',
    date: new Date().toISOString().slice(0, 10), due_date: '', notes: ''
  });
  const [items, setItems] = useState([{ product: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);

  useEffect(() => {
    const fetches = [
      axios.get('/api/purchasing/suppliers/?is_active=true').then(r => setSuppliers(r.data.results || r.data)),
      axios.get('/api/core/currencies/').then(r => setCurrencies(r.data.results || r.data)),
      axios.get('/api/sales/products/').then(r => setProducts(r.data.results || r.data)),
      axios.get('/api/purchasing/purchase-orders/').then(r => setOrders(r.data.results || r.data)),
    ];
    Promise.all(fetches).then(() => {
      if (isEdit) {
        axios.get(`/api/purchasing/supplier-invoices/${id}/`).then(r => {
          const inv = r.data;
          setForm({
            supplier: inv.supplier || '',
            purchase_order: inv.purchase_order || '',
            supplier_reference: inv.supplier_reference || '',
            currency: inv.currency ? String(inv.currency) : '',
            date: inv.date || '',
            due_date: inv.due_date || '',
            notes: inv.notes || '',
          });
          if (inv.items && inv.items.length > 0) {
            setItems(inv.items.map(it => ({
              id: it.id,
              product: it.product || '',
              description: it.description || '',
              quantity: it.quantity,
              unit_price: it.unit_price,
              tax_rate: it.tax_rate,
            })));
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(err => { console.error(err); setLoading(false); });
  }, [id, isEdit]);

  const handleSupplierChange = (supplierId) => {
    if (supplierId) {
      const supplier = suppliers.find(s => s.id === parseInt(supplierId));
      if (supplier && supplier.currency) {
        setForm(prev => ({ ...prev, supplier: supplierId, currency: String(supplier.currency) }));
      } else {
        setForm(prev => ({ ...prev, supplier: supplierId }));
      }
    } else {
      setForm(prev => ({ ...prev, supplier: '', currency: '', purchase_order: '' }));
    }
  };

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
  const removeItem = (i) => {
    const item = items[i];
    if (isEdit && item.id) {
      axios.delete(`/api/purchasing/supplier-invoice-items/${item.id}/`).catch(console.error);
    }
    setItems(items.filter((_, idx) => idx !== i));
  };
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
        message.warning('Veuillez sélectionner une devise.');
        return;
      }
      const validItems = items.filter(it => it.product || it.description);
      if (validItems.length === 0) {
        message.warning('Veuillez ajouter au moins une ligne.');
        return;
      }
      payload.purchase_order = payload.purchase_order || null;
      if (!payload.due_date) delete payload.due_date;

      let invId;
      if (isEdit) {
        await axios.patch(`/api/purchasing/supplier-invoices/${id}/`, payload);
        invId = id;
        // Mettre a jour les lignes existantes et creer les nouvelles
        for (const item of validItems) {
          if (item.id) {
            await axios.patch(`/api/purchasing/supplier-invoice-items/${item.id}/`, { ...item, invoice: invId });
          } else {
            await axios.post('/api/purchasing/supplier-invoice-items/', { ...item, invoice: invId });
          }
        }
      } else {
        const invRes = await axios.post('/api/purchasing/supplier-invoices/', payload);
        invId = invRes.data.id;
        for (const item of validItems) {
          await axios.post('/api/purchasing/supplier-invoice-items/', { ...item, invoice: invId });
        }
      }
      navigate(`/purchasing/invoices/${invId}`);
    } catch (err) {
      handleApiError(err, null, "Impossible d'enregistrer la facture fournisseur.");
    }
  };

  const filteredOrders = form.supplier
    ? orders.filter(o => String(o.supplier) === String(form.supplier))
    : orders;

  const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>{isEdit ? 'Modifier la facture fournisseur' : 'Nouvelle facture fournisseur'}</h1>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Fournisseur *</label>
            <select required style={fieldStyle} value={form.supplier} onChange={e => handleSupplierChange(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>BC lié (optionnel)</label>
            <select style={fieldStyle} value={form.purchase_order} onChange={e => setForm({ ...form, purchase_order: e.target.value })}>
              <option value="">-- Aucun --</option>
              {filteredOrders.map(o => <option key={o.id} value={o.id}>{o.number}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Ref. fournisseur</label>
            <input style={fieldStyle} value={form.supplier_reference} onChange={e => setForm({ ...form, supplier_reference: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Devise *</label>
            <select required style={fieldStyle} value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {currencies.map(c => <option key={c.id} value={c.id}>{c.code} -- {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Date *</label>
            <input type="date" required style={fieldStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Échéance</label>
            <input type="date" style={fieldStyle} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>

        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Lignes</h3>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: 8, marginBottom: 8 }}>
            <select style={fieldStyle} value={item.product} onChange={e => handleProductChange(i, e.target.value)}>
              <option value="">-- Produit --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qté" style={fieldStyle} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
            <input type="number" step="0.01" placeholder="P.U." style={fieldStyle} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
            <input type="number" step="0.01" placeholder="TVA %" style={fieldStyle} value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
            <button type="button" onClick={() => removeItem(i)} style={{ background: '#fed7d7', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 18, color: '#e53e3e' }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addItem} style={{ padding: '6px 16px', background: '#edf2f7', border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 20 }}>+ Ajouter une ligne</button>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>{isEdit ? 'Enregistrer' : 'Créer la facture'}</button>
          <button type="button" onClick={() => navigate(isEdit ? `/purchasing/invoices/${id}` : '/purchasing/invoices')} style={{ padding: '10px 24px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
