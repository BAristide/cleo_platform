// src/components/hr/ComplaintForm.js
import React, { useState } from 'react';
import { Form, Select, Input, Switch, Button, Card, Typography, message, Space, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { handleApiError } from '../../utils/apiUtils';

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
      message.success('Votre doléance a été soumise avec succès.');
      navigate('/hr/complaints');
    } catch (error) {
      handleApiError(error, form, 'Erreur lors de la soumission de la doléance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Soumettre une doléance</Title>
      <Card style={{ maxWidth: 680 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message="Confidentialité"
          description="Votre doléance sera traitée en toute confidentialité par le service RH. Vous pouvez choisir de rester anonyme."
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          scrollToFirstError
          onFinishFailed={() => message.error('Veuillez corriger les erreurs indiquées dans le formulaire')}
          initialValues={{ is_anonymous: false, category: 'other' }}>
          <Form.Item name="category" label="Catégorie"
            rules={[{ required: true, message: 'Veuillez sélectionner une catégorie.' }]}>
            <Select>
              <Option value="harassment">Harcèlement</Option>
              <Option value="discrimination">Discrimination</Option>
              <Option value="workload">Charge de travail</Option>
              <Option value="management">Comportement managérial</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description"
            rules={[{ required: true, message: 'Veuillez décrire la situation.' }]}>
            <TextArea rows={6}
              placeholder="Décrivez la situation en détail..." />
          </Form.Item>

          <Form.Item name="is_anonymous" label="Soumettre de manière anonyme"
            valuePropName="checked">
            <Switch onChange={setIsAnonymous} />
          </Form.Item>

          {isAnonymous && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              message="Votre identité ne sera pas communiquée, mais le RH assigné pourra voir votre nom dans certains cas (administration uniquement)." />
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
