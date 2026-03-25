import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Select, InputNumber, DatePicker, Input, Button, Card, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;

const METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'check', label: 'Chèque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'lcn', label: 'LCN' },
  { value: 'other', label: 'Autre' },
];

export default function PaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const [form] = Form.useForm();
  const [invoices, setInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/purchasing/supplier-invoices/?state=validated').then(r => {
      const list = r.data.results || r.data;
      setInvoices(list);
      const defaults = { date: dayjs(), method: 'bank_transfer' };
      if (invoiceId) {
        const inv = list.find(i => String(i.id) === String(invoiceId));
        defaults.invoice = parseInt(invoiceId);
        if (inv) defaults.amount = parseFloat(inv.amount_due);
      }
      form.setFieldsValue(defaults);
    }).catch(console.error);
  }, []);

  const handleInvoiceChange = invId => {
    const inv = invoices.find(i => i.id === invId);
    if (inv) form.setFieldValue('amount', parseFloat(inv.amount_due));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await axios.post('/api/purchasing/supplier-payments/', {
        invoice: values.invoice, amount: values.amount,
        date: values.date ? values.date.format('YYYY-MM-DD') : '',
        method: values.method, reference: values.reference || '', notes: values.notes || '',
      });
      navigate('/purchasing/payments');
    } catch (err) {
      if (err?.errorFields) return;
      handleApiError(err, form, "Impossible d'enregistrer le paiement.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  return (
    <div>
      <Title level={4} style={{ color: '#0F172A', marginBottom: 24 }}>Nouveau paiement fournisseur</Title>
      <Form form={form} layout="vertical" scrollToFirstError style={{ maxWidth: 700 }}>
        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <Form.Item name="invoice" label="Facture" rules={[{ required: true, message: 'Champ requis' }]}>
            <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —" onChange={handleInvoiceChange}>
              {invoices.map(inv => (
                <Option key={inv.id} value={inv.id}>
                  {inv.number} — {inv.supplier_name} — Dû : {fmt(inv.amount_due)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="amount" label="Montant" rules={[{ required: true, message: 'Champ requis' }]}>
              <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
            </Form.Item>
            <Form.Item name="method" label="Méthode" rules={[{ required: true, message: 'Champ requis' }]}>
              <Select>
                {METHOD_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Champ requis' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="reference" label="Référence">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
        <Space>
          <Button type="primary" onClick={handleSubmit} loading={submitting}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            Enregistrer le paiement
          </Button>
          <Button onClick={() => navigate('/purchasing/payments')} style={{ borderRadius: 8 }}>Annuler</Button>
        </Space>
      </Form>
    </div>
  );
}
