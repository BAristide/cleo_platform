import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';

export default function ReceptionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('po');

  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({
    purchase_order: poId || '', warehouse: '', date: new Date().toISOString().slice(0, 10), notes: ''
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/api/purchasing/purchase-orders/?state=confirmed').then(r => setOrders(r.data.results || r.data)).catch(console.error);
    api.get('/api/inventory/warehouses/?is_active=true').then(r => setWarehouses(r.data.results || r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.purchase_order) {
      api.get(`/api/purchasing/purchase-orders/${form.purchase_order}/`).then(r => {
        setSelectedOrder(r.data);
        setItems((r.data.items || []).map(item => ({
          purchase_order_item: item.id,
          product: item.product,
          product_name: item.product_name || item.description,
          quantity_ordered: item.quantity,
          quantity_already_received: item.quantity_received,
          quantity_remaining: item.quantity - item.quantity_received,
          quantity_received: item.quantity - item.quantity_received,
        })));
      }).catch(console.error);
    }
  }, [form.purchase_order]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const recRes = await api.post('/api/purchasing/receptions/', form);
      const recId = recRes.data.id;
      for (const item of items) {
        if (item.quantity_received > 0) {
          await api.post('/api/purchasing/reception-items/', {
            reception: recId, purchase_order_item: item.purchase_order_item,
            product: item.product, quantity_received: item.quantity_received
          });
        }
      }
      navigate(`/purchasing/receptions/${recId}`);
    } catch (err) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Nouvelle réception</h1>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Bon de commande *</label>
            <select required style={fieldStyle} value={form.purchase_order} onChange={e => setForm({ ...form, purchase_order: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.number} — {o.supplier_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Entrepôt *</label>
            <select required style={fieldStyle} value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#4a5568' }}>Date</label>
            <input type="date" style={fieldStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>

        {items.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Lignes à réceptionner</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontSize: 13 }}>Produit</th>
                  <th style={{ padding: '8px 12px', fontSize: 13 }}>Commandé</th>
                  <th style={{ padding: '8px 12px', fontSize: 13 }}>Déjà reçu</th>
                  <th style={{ padding: '8px 12px', fontSize: 13 }}>Restant</th>
                  <th style={{ padding: '8px 12px', fontSize: 13 }}>À réceptionner</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>{item.product_name}</td>
                    <td style={{ padding: '8px 12px' }}>{item.quantity_ordered}</td>
                    <td style={{ padding: '8px 12px' }}>{item.quantity_already_received}</td>
                    <td style={{ padding: '8px 12px', color: item.quantity_remaining > 0 ? '#dd6b20' : '#38a169' }}>{item.quantity_remaining}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="number" min="0" max={item.quantity_remaining}
                        style={{ ...fieldStyle, width: 100 }}
                        value={item.quantity_received}
                        onChange={e => {
                          const updated = [...items];
                          updated[i] = { ...updated[i], quantity_received: parseFloat(e.target.value) || 0 };
                          setItems(updated);
                        }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Créer la réception</button>
          <button type="button" onClick={() => navigate('/purchasing/receptions')} style={{ padding: '10px 24px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
