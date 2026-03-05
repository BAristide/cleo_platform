// src/components/hr/AnnouncementForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, DatePicker, Button, Card, Row, Col, Typography, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [targetAudience, setTargetAudience] = useState('all');

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [deptResp, empResp] = await Promise.all([
          axios.get('/api/hr/departments/'),
          axios.get('/api/hr/employees/'),
        ]);
        setDepartments(extractResultsFromResponse(deptResp));
        setEmployees(extractResultsFromResponse(empResp));
      } catch {
        message.error('Erreur lors du chargement des donnees de reference.');
      }
    };
    fetchRefs();
  }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        content: values.content,
        target_audience: values.target_audience,
        is_pinned: values.is_pinned || false,
        expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        target_departments: values.target_departments || [],
        target_employees: values.target_employees || [],
      };
      await axios.post('/api/hr/announcements/', payload);
      message.success('Annonce publiee avec succes.');
      navigate('/hr/announcements');
    } catch {
      message.error("Erreur lors de la publication de l'annonce.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Nouvelle annonce</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ target_audience: 'all', is_pinned: false }}
        >
          <Form.Item
            name="title"
            label="Titre"
            rules={[{ required: true, message: 'Le titre est obligatoire.' }]}
          >
            <Input placeholder="Titre de l'annonce" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="content"
            label="Contenu"
            rules={[{ required: true, message: 'Le contenu est obligatoire.' }]}
          >
            <TextArea rows={5} placeholder="Contenu de l'annonce..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="target_audience" label="Audience cible">
                <Select onChange={setTargetAudience}>
                  <Option value="all">Tous les employes</Option>
                  <Option value="department">Par departement</Option>
                  <Option value="individual">Individuel</Option>
                </Select>
              </Form.Item>
            </Col>

            {targetAudience === 'department' && (
              <Col xs={24} md={16}>
                <Form.Item name="target_departments" label="Departements cibles">
                  <Select mode="multiple" placeholder="Sélectionner les départements">
                    {departments.map((d) => (
                      <Option key={d.id} value={d.id}>{d.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}

            {targetAudience === 'individual' && (
              <Col xs={24} md={16}>
                <Form.Item name="target_employees" label="Employés ciblés">
                  <Select mode="multiple" placeholder="Sélectionner les employés">
                    {employees.map((e) => (
                      <Option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="is_pinned" label="Epingler" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="expires_at" label="Date d'expiration (optionnel)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Publier
            </Button>
            <Button onClick={() => navigate('/hr/announcements')}>
              Annuler
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default AnnouncementForm;
