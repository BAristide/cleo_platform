import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, InputNumber,
  Button, Card, Space, Typography, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;

export default function SupplierInvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([
    { product: undefined, description: '', quantity: 1, unit_price: 0, tax_rate: 0 },
  ]);

  useEffect(() => {
    const fetches = [
      axios.get('/api/purchasing/suppliers/?is_active=true').then(r => {
        setSuppliers(r.data.results || r.data);
      }),
      axios.get('/api/core/currencies/').then(r => {
        setCurrencies(r.data.results || r.data);
      }),
      axios.get('/api/sales/products/').then(r => {
        setProducts(r.data.results || r.data);
      }),
      axios.get('/api/purchasing/purchase-orders/').then(r => {
        const list = r.data.results || r.data;
        setOrders(list);
        setFilteredOrders(list);
      }),
    ];
    Promise.all(fetches).then(() => {
      if (isEdit) {
        axios.get(`/api/purchasing/supplier-invoices/${id}/`).then(r => {
          const inv = r.data;
          form.setFieldsValue({
            supplier: inv.supplier || undefined,
            purchase_order: inv.purchase_order || undefined,
            supplier_reference: inv.supplier_reference || '',
            currency: inv.currency || undefined,
            date: inv.date ? dayjs(inv.date) : null,
            due_date: inv.due_date ? dayjs(inv.due_date) : null,
            notes: inv.notes || '',
          });
          if (inv.items && inv.items.length > 0) {
            setItems(inv.items.map(it => ({
              id: it.id,
              product: it.product || undefined,
              description: it.description || '',
              quantity: parseFloat(it.quantity),
              unit_price: parseFloat(it.unit_price),
              tax_rate: parseFloat(it.tax_rate),
            })));
          }
          setLoading(false);
        }).catch(err => { console.error(err); setLoading(false); });
      } else {
        setLoading(false);
      }
    }).catch(err => { console.error(err); setLoading(false); });
  }, [id, isEdit]);

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier?.currency) form.setFieldValue('currency', supplier.currency);
    form.setFieldValue('purchase_order', undefined);
    setFilteredOrders(supplierId ? orders.filter(o => o.supplier === supplierId) : orders);
  };

  const handleProductChange = (index, productId) => {
    const updated = [...items];
    updated[index] = { ...updated[index], product: productId || undefined };
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        updated[index].unit_price = parseFloat(product.unit_price) || 0;
        updated[index].tax_rate = parseFloat(product.tax_rate) ?? 0;
      }
    }
    setItems(updated);
  };

  const addItem = () =>
    setItems([...items, { product: undefined, description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);

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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validItems = items.filter(it => it.product || it.description?.trim());
      if (validItems.length === 0) {
        message.warning('Veuillez ajouter au moins une ligne (produit ou description).');
        return;
      }
      setSubmitting(true);
      const payload = {
        supplier: values.supplier,
        purchase_order: values.purchase_order || null,
        supplier_reference: values.supplier_reference || '',
        currency: values.currency,
        date: values.date ? values.date.format('YYYY-MM-DD') : '',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        notes: values.notes || '',
      };
      let invId;
      if (isEdit) {
        await axios.patch(`/api/purchasing/supplier-invoices/${id}/`, payload);
        invId = id;
        for (const item of validItems) {
          const itemData = {
            product: item.product || null,
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            invoice: invId,
          };
          if (item.id) {
            await axios.patch(`/api/purchasing/supplier-invoice-items/${item.id}/`, itemData);
          } else {
            await axios.post('/api/purchasing/supplier-invoice-items/', itemData);
          }
        }
      } else {
        const invRes = await axios.post('/api/purchasing/supplier-invoices/', payload);
        invId = invRes.data.id;
        for (const item of validItems) {
          await axios.post('/api/purchasing/supplier-invoice-items/', {
            product: item.product || null,
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            invoice: invId,
          });
        }
      }
      navigate(`/purchasing/invoices/${invId}`);
    } catch (err) {
      if (err?.errorFields) return;
      handleApiError(err, form, "Impossible d'enregistrer la facture fournisseur.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Chargement...</div>
  );

  const colLabel = (text) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
      {text}
    </span>
  );

  return (
    <div>
      <Title level={4} style={{ color: '#0F172A', marginBottom: 24 }}>
        {isEdit ? 'Modifier la facture fournisseur' : 'Nouvelle facture fournisseur'}
      </Title>

      <Form form={form} layout="vertical" scrollToFirstError>

        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="supplier" label="Fournisseur" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch placeholder="— Sélectionner —" optionFilterProp="children" onChange={handleSupplierChange} allowClear>
                {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="purchase_order" label="BC lié (optionnel)">
              <Select placeholder="— Aucun —" allowClear>
                {filteredOrders.map(o => <Option key={o.id} value={o.id}>{o.number}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="supplier_reference" label="Réf. fournisseur">
              <Input placeholder="Numéro de facture du fournisseur" />
            </Form.Item>

            <Form.Item name="currency" label="Devise" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select showSearch placeholder="— Sélectionner —" optionFilterProp="children" allowClear>
                {currencies.map(c => <Option key={c.id} value={c.id}>{c.code} — {c.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Champ requis' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item name="due_date" label="Échéance">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>
        </Card>

        <Card
          title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Lignes</span>}
          style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 90px 130px 80px 40px', gap: 8, marginBottom: 8, padding: '0 2px' }}>
            {['Produit', 'Description', 'Quantité', 'P.U. HT', 'TVA %', ''].map((h, i) => (
              <div key={i}>{colLabel(h)}</div>
            ))}
          </div>

          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 90px 130px 80px 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}
            >
              <Select
                showSearch
                allowClear
                placeholder="— Produit —"
                optionFilterProp="children"
                value={item.product || undefined}
                onChange={v => handleProductChange(i, v)}
              >
                {products.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
              </Select>

              <Input
                placeholder="Description"
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
              />

              <InputNumber
                style={{ width: '100%' }}
                min={0.001}
                step={1}
                value={item.quantity}
                onChange={v => updateItem(i, 'quantity', v)}
              />

              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                value={item.unit_price}
                onChange={v => updateItem(i, 'unit_price', v)}
              />

              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                step={0.01}
                value={item.tax_rate}
                onChange={v => updateItem(i, 'tax_rate', v)}
              />

              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
              />
            </div>
          ))}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addItem}
            style={{ marginTop: 8, borderColor: '#10B981', color: '#10B981' }}
          >
            Ajouter une ligne
          </Button>
        </Card>

        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 24 }}>
          <Form.Item name="notes" label="Notes internes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="Notes internes (non visibles sur la facture)" />
          </Form.Item>
        </Card>

        <Space>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}
          >
            {isEdit ? 'Enregistrer' : 'Créer la facture'}
          </Button>
          <Button
            onClick={() => navigate(isEdit ? `/purchasing/invoices/${id}` : '/purchasing/invoices')}
            style={{ borderRadius: 8 }}
          >
            Annuler
          </Button>
        </Space>

      </Form>
    </div>
  );
}
