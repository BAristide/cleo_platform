import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Switch, Card, message, Spin } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { handleApiError } from '../../../utils/apiUtils';
import axios from '../../../utils/axiosConfig';

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      axios.get(`/api/inventory/warehouses/${id}/`).then((res) => {
        form.setFieldsValue(res.data);
      }).catch(() => {
        message.error("Erreur lors du chargement");
      }).finally(() => setLoading(false));
    }
  }, [id, form, isEdit]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`/api/inventory/warehouses/${id}/`, values);
        message.success('Entrepôt modifié');
      } else {
        await axios.post('/api/inventory/warehouses/', values);
        message.success('Entrepôt créé');
      }
      navigate('/inventory/warehouses');
    } catch (err) {
      handleApiError(err, form, "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title={isEdit ? "Modifier l'entrepôt" : 'Nouvel entrepôt'}>
      <Form form={form} layout="vertical" onFinish={onFinish} scrollToFirstError initialValues={{ is_active: true, is_default: false }}>
        <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Le code est requis' }]}>
          <Input maxLength={20} />
        </Form.Item>
        <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Le nom est requis' }]}>
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="address" label="Adresse">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="is_active" label="Actif" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="is_default" label="Entrepôt par défaut" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? 'Modifier' : 'Créer'}
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/inventory/warehouses')}>
            Annuler
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default WarehouseForm;
