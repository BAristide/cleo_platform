import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, InputNumber, Button, Card, Space, Typography } from 'antd';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currencies, setCurrencies] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/core/currencies/').then(r => setCurrencies(r.data.results || r.data)).catch(console.error);
    if (id) {
      axios.get(`/api/purchasing/suppliers/${id}/`).then(r => {
        const d = r.data;
        form.setFieldsValue({
          code: d.code, name: d.name, contact_name: d.contact_name,
          email: d.email, phone: d.phone, tax_id: d.tax_id,
          currency: d.currency, payment_terms: d.payment_terms,
          address: d.address, notes: d.notes,
        });
      }).catch(console.error);
    }
  }, [id]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (id) {
        await axios.put(`/api/purchasing/suppliers/${id}/`, values);
      } else {
        await axios.post('/api/purchasing/suppliers/', values);
      }
      navigate('/purchasing/suppliers');
    } catch (err) {
      if (err?.errorFields) return;
      handleApiError(err, form, "Impossible d'enregistrer le fournisseur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={4} style={{ color: '#0F172A', marginBottom: 24 }}>{id ? 'Modifier' : 'Nouveau'} fournisseur</Title>
      <Form form={form} layout="vertical" scrollToFirstError style={{ maxWidth: 800 }}>
        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Champ requis' }]}>
              <Input placeholder="EX : HETZNER" />
            </Form.Item>
            <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Champ requis' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contact_name" label="Contact">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email invalide' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Téléphone">
              <Input />
            </Form.Item>
            <Form.Item name="tax_id" label="Identifiant fiscal (ICE, IF…)">
              <Input />
            </Form.Item>
            <Form.Item name="currency" label="Devise">
              <Select showSearch optionFilterProp="children" placeholder="— Sélectionner —" allowClear>
                {currencies.map(c => <Option key={c.id} value={c.id}>{c.code} — {c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="payment_terms" label="Délai de paiement (jours)" initialValue={30}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Adresse">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
        <Space>
          <Button type="primary" onClick={handleSubmit} loading={submitting}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            {id ? 'Enregistrer' : 'Créer'}
          </Button>
          <Button onClick={() => navigate('/purchasing/suppliers')} style={{ borderRadius: 8 }}>Annuler</Button>
        </Space>
      </Form>
    </div>
  );
}
