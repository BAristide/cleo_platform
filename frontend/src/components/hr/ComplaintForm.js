// src/components/hr/ComplaintForm.js
import React, { useState } from 'react';
import { Form, Select, Input, Switch, Button, Card, Typography, message, Space, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ComplaintForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await axios.post('/api/hr/complaints/', values);
      message.success('Votre doleance a ete soumise avec succes.');
      navigate('/hr/complaints');
    } catch {
      message.error('Erreur lors de la soumission de la doleance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Soumettre une doleance</Title>
      <Card style={{ maxWidth: 680 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message="Confidentialite"
          description="Votre doleance sera traitee en toute confidentialite par le service RH. Vous pouvez choisir de rester anonyme."
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ is_anonymous: false, category: 'other' }}>
          <Form.Item name="category" label="Categorie"
            rules={[{ required: true, message: 'Veuillez selectionner une categorie.' }]}>
            <Select>
              <Option value="harassment">Harcelement</Option>
              <Option value="discrimination">Discrimination</Option>
              <Option value="workload">Charge de travail</Option>
              <Option value="management">Comportement managerial</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description"
            rules={[{ required: true, message: 'Veuillez decrire la situation.' }]}>
            <TextArea rows={6}
              placeholder="Decrivez la situation en detail..." />
          </Form.Item>

          <Form.Item name="is_anonymous" label="Soumettre de maniere anonyme"
            valuePropName="checked">
            <Switch onChange={setIsAnonymous} />
          </Form.Item>

          {isAnonymous && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              message="Votre identite ne sera pas communiquee, mais le RH assigne pourra voir votre nom dans certains cas (administration uniquement)." />
          )}

          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Soumettre
            </Button>
            <Button onClick={() => navigate('/hr/complaints')}>Annuler</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default ComplaintForm;
