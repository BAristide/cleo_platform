import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ product: undefined, description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/purchasing/suppliers/?is_active=true').then(r => setSuppliers(r.data.results || r.data)).catch(console.error);
    axios.get('/api/core/currencies/').then(r => setCurrencies(r.data.results || r.data)).catch(console.error);
    axios.get('/api/sales/products/').then(r => setProducts(r.data.results || r.data)).catch(console.error);
  }, []);

  const handleSupplierChange = supplierId => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier?.currency) form.setFieldValue('currency', supplier.currency);
  };

  const handleProductChange = (index, productId) => {
    const updated = [...items];
    updated[index] = { ...updated[index], product: productId || undefined };
    if (productId) {
      const p = products.find(p => p.id === productId);
      if (p) { updated[index].unit_price = parseFloat(p.unit_price) || 0; updated[index].tax_rate = parseFloat(p.tax_rate) ?? 0; }
    }
    setItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        supplier: values.supplier, currency: values.currency,
        date: values.date ? values.date.format('YYYY-MM-DD') : '',
        expected_delivery_date: values.expected_delivery_date ? values.expected_delivery_date.format('YYYY-MM-DD') : null,
        notes: values.notes || '',
      };
      const orderRes = await axios.post('/api/purchasing/purchase-orders/', payload);
      const orderId = orderRes.data.id;
      for (const item of items.filter(it => it.product || it.description?.trim())) {
        await axios.post('/api/purchasing/purchase-order-items/', { ...item, product: item.product || null, order: orderId });
      }
      navigate(`/purchasing/orders/${orderId}`);
    } catch (err) {
      if (err?.errorFields) return;
      handleApiError(err, form, 'Impossible de créer le bon de commande.');
    } finally {
      setSubmitting(false);
    }
  };

  const colLabel = text => (
    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{text}</span>
  );

  return (
    <div>
      <Title level={4} style={{ color: '#0F172A', marginBottom: 24 }}>Nouveau bon de commande</Title>
      <Form form={form} layout="vertical" scrollToFirstError>
        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="supplier" label="Fournisseur" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —" onChange={handleSupplierChange} allowClear>
                {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="currency" label="Devise" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —" allowClear>
                {currencies.map(c => <Option key={c.id} value={c.id}>{c.code} — {c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Champ requis' }]} initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="expected_delivery_date" label="Livraison prévue">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>
        </Card>

        <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Lignes</span>}
          style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 130px 80px 40px', gap: 8, marginBottom: 8 }}>
            {['Produit', 'Quantité', 'P.U. HT', 'TVA %', ''].map((h, i) => <div key={i}>{colLabel(h)}</div>)}
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 130px 80px 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Select showSearch allowClear optionFilterProp="children" placeholder="— Produit —"
                value={item.product || undefined} onChange={v => handleProductChange(i, v)}>
                {products.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
              </Select>
              <InputNumber style={{ width: '100%' }} min={0.001} step={1} value={item.quantity}
                onChange={v => { const u = [...items]; u[i] = { ...u[i], quantity: v }; setItems(u); }} />
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} value={item.unit_price}
                onChange={v => { const u = [...items]; u[i] = { ...u[i], unit_price: v }; setItems(u); }} />
              <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.01} value={item.tax_rate}
                onChange={v => { const u = [...items]; u[i] = { ...u[i], tax_rate: v }; setItems(u); }} />
              <Button danger type="text" icon={<DeleteOutlined />} disabled={items.length === 1}
                onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />}
            onClick={() => setItems([...items, { product: undefined, description: '', quantity: 1, unit_price: 0, tax_rate: 0 }])}
            style={{ marginTop: 8, borderColor: '#10B981', color: '#10B981' }}>
            Ajouter une ligne
          </Button>
        </Card>

        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 24 }}>
          <Form.Item name="notes" label="Notes internes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="Notes internes" />
          </Form.Item>
        </Card>

        <Space>
          <Button type="primary" onClick={handleSubmit} loading={submitting}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            Créer le bon de commande
          </Button>
          <Button onClick={() => navigate('/purchasing/orders')} style={{ borderRadius: 8 }}>Annuler</Button>
        </Space>
      </Form>
    </div>
  );
}
