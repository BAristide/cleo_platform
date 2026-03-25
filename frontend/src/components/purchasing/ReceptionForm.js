import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Select, DatePicker, InputNumber, Button, Card, Table, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ReceptionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('po');
  const [form] = Form.useForm();
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/purchasing/purchase-orders/?state=confirmed').then(r => setOrders(r.data.results || r.data)).catch(console.error);
    axios.get('/api/inventory/warehouses/?is_active=true').then(r => setWarehouses(r.data.results || r.data)).catch(console.error);
    if (poId) {
      form.setFieldValue('purchase_order', parseInt(poId));
      loadOrderItems(poId);
    }
  }, []);

  const loadOrderItems = id => {
    axios.get(`/api/purchasing/purchase-orders/${id}/`).then(r => {
      setItems((r.data.items || []).map(item => ({
        purchase_order_item: item.id,
        product: item.product,
        product_name: item.product_name || item.description,
        quantity_ordered: parseFloat(item.quantity),
        quantity_already_received: parseFloat(item.quantity_received),
        quantity_remaining: parseFloat(item.quantity) - parseFloat(item.quantity_received),
        quantity_received: parseFloat(item.quantity) - parseFloat(item.quantity_received),
      })));
    }).catch(console.error);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        purchase_order: values.purchase_order, warehouse: values.warehouse,
        date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        notes: values.notes || '',
      };
      const recRes = await axios.post('/api/purchasing/receptions/', payload);
      const recId = recRes.data.id;
      for (const item of items.filter(it => it.quantity_received > 0)) {
        await axios.post('/api/purchasing/reception-items/', {
          reception: recId, purchase_order_item: item.purchase_order_item,
          product: item.product, quantity_received: item.quantity_received,
        });
      }
      navigate(`/purchasing/receptions/${recId}`);
    } catch (err) {
      if (err?.errorFields) return;
      handleApiError(err, form, 'Impossible de créer la réception.');
    } finally {
      setSubmitting(false);
    }
  };

  const itemColumns = [
    { title: 'Produit', dataIndex: 'product_name', render: v => v || '—' },
    { title: 'Commandé', dataIndex: 'quantity_ordered', width: 100, align: 'right' },
    { title: 'Déjà reçu', dataIndex: 'quantity_already_received', width: 100, align: 'right' },
    { title: 'Restant', dataIndex: 'quantity_remaining', width: 100, align: 'right',
      render: v => <Text style={{ color: v > 0 ? '#F97316' : '#10B981' }}>{v}</Text> },
    { title: 'À réceptionner', key: 'qty_input', width: 150,
      render: (_, row, index) => (
        <InputNumber min={0} max={row.quantity_remaining} value={row.quantity_received} style={{ width: 100 }}
          onChange={v => { const u = [...items]; u[index] = { ...u[index], quantity_received: v || 0 }; setItems(u); }} />
      )},
  ];

  return (
    <div>
      <Title level={4} style={{ color: '#0F172A', marginBottom: 24 }}>Nouvelle réception</Title>
      <Form form={form} layout="vertical" scrollToFirstError>
        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="purchase_order" label="Bon de commande" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —"
                onChange={v => { if (v) loadOrderItems(v); else setItems([]); }}>
                {orders.map(o => <Option key={o.id} value={o.id}>{o.number} — {o.supplier_name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="warehouse" label="Entrepôt" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —">
                {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="date" label="Date" initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>
        </Card>

        {items.length > 0 && (
          <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Lignes à réceptionner</span>}
            style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
            <Table dataSource={items} columns={itemColumns} rowKey="purchase_order_item"
              pagination={false} locale={{ emptyText: 'Aucune ligne' }} />
          </Card>
        )}

        <Space>
          <Button type="primary" onClick={handleSubmit} loading={submitting}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            Créer la réception
          </Button>
          <Button onClick={() => navigate('/purchasing/receptions')} style={{ borderRadius: 8 }}>Annuler</Button>
        </Space>
      </Form>
    </div>
  );
}
