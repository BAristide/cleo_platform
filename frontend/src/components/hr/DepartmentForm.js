// src/components/hr/DepartmentForm.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse, handleApiError } from '../../utils/apiUtils';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DepartmentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const parentId = queryParams.get('parent');

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    axios.get('/api/hr/departments/').then(r => {
      setDepartments(extractResultsFromResponse(r));
    }).catch(() => {});

    if (parentId) {
      form.setFieldsValue({ parent: parseInt(parentId) });
    }
  }, [form, parentId]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const response = await axios.post('/api/hr/departments/', values);
      message.success('Département créé avec succès');
      navigate(`/hr/departments/${response.data.id}`);
    } catch (error) {
      handleApiError(error, form, "Impossible de créer le département");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Nouveau département</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          scrollToFirstError
          onFinishFailed={() => message.error('Veuillez corriger les erreurs indiquées dans le formulaire')}
        >
          <Form.Item
            name="name"
            label="Nom"
            rules={[{ required: true, message: 'Veuillez saisir le nom du département' }]}
          >
            <Input placeholder="Ex : Direction Commerciale" />
          </Form.Item>

          <Form.Item name="code" label="Code">
            <Input placeholder="Ex : COMM" />
          </Form.Item>

          <Form.Item name="parent" label="Département parent">
            <Select allowClear placeholder="Sélectionner un département parent" showSearch optionFilterProp="children">
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Description optionnelle" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Créer
              </Button>
              <Button onClick={() => navigate('/hr/departments')}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default DepartmentForm;
