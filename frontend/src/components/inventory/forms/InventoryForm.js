import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../../../utils/apiUtils';
import axios from '../../../utils/axiosConfig';
import dayjs from 'dayjs';

const InventoryForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    axios.get('/api/inventory/warehouses/?is_active=true').then((res) => setWarehouses(res.data.results || res.data));
  }, []);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      await axios.post('/api/inventory/inventories/', payload);
      message.success('Inventaire créé');
      navigate('/inventory/inventories');
    } catch (err) {
      handleApiError(err, form, "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Nouvel inventaire">
      <Form form={form} layout="vertical" onFinish={onFinish} scrollToFirstError initialValues={{ date: dayjs(), state: 'draft' }}>
        <Form.Item name="reference" label="Référence" rules={[{ required: true, message: 'La référence est requise' }]}>
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item name="warehouse" label="Entrepôt" rules={[{ required: true }]}>
          <Select placeholder="Sélectionner un entrepôt">
            {warehouses.map((wh) => (
              <Select.Option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Créer l'inventaire</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/inventory/inventories')}>Annuler</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default InventoryForm;
