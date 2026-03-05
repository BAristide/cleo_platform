// src/components/hr/WorkCertificateForm.js
import React, { useState } from 'react';
import { Form, Select, Input, Button, Card, Typography, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const WorkCertificateForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await axios.post('/api/hr/certificates/', values);
      message.success('Demande d attestation envoyee avec succes.');
      navigate('/hr/certificates');
    } catch {
      message.error("Erreur lors de l'envoi de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Demande d'attestation de travail</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ purpose: 'other' }}>
          <Form.Item name="purpose" label="Objet de la demande"
            rules={[{ required: true }]}>
            <Select>
              <Option value="bank">Dossier bancaire</Option>
              <Option value="visa">Demande de visa</Option>
              <Option value="rental">Dossier de location</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Form.Item>
          <Form.Item name="purpose_detail" label="Precisions (optionnel)">
            <TextArea rows={3} placeholder="Details supplementaires..." />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Envoyer la demande
            </Button>
            <Button onClick={() => navigate('/hr/certificates')}>Annuler</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default WorkCertificateForm;
