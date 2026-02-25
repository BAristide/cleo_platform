import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Select, Input, Button, Card, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import dayjs from 'dayjs';

const StockMoveForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    axios.get('/api/sales/products/?is_active=true').then((res) => setProducts(res.data.results || res.data));
    axios.get('/api/inventory/warehouses/?is_active=true').then((res) => setWarehouses(res.data.results || res.data));
  }, []);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        date: values.date.toISOString(),
      };
      await axios.post('/api/inventory/stock-moves/', payload);
      message.success('Mouvement créé');
      navigate('/inventory/stock-moves');
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        Object.entries(errors).forEach(([key, val]) => message.error(`${key}: ${val}`));
      } else {
        message.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Nouveau mouvement de stock">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ date: dayjs(), move_type: 'IN' }}>
        <Form.Item name="product" label="Produit" rules={[{ required: true }]}>
          <Select showSearch placeholder="Sélectionner un produit" optionFilterProp="children">
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>{p.reference} - {p.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="warehouse" label="Entrepôt" rules={[{ required: true }]}>
          <Select placeholder="Sélectionner un entrepôt">
            {warehouses.map((wh) => (
              <Select.Option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="move_type" label="Type" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="IN">Entrée</Select.Option>
            <Select.Option value="OUT">Sortie</Select.Option>
            <Select.Option value="ADJUST">Ajustement</Select.Option>
            <Select.Option value="RETURN_IN">Retour client</Select.Option>
            <Select.Option value="RETURN_OUT">Retour fournisseur</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="quantity" label="Quantité" rules={[{ required: true }]}>
          <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="unit_cost" label="Coût unitaire">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="reference" label="Référence">
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Créer le mouvement</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/inventory/stock-moves')}>Annuler</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default StockMoveForm;
