// src/components/hr/forms/RewardForm.js
import React, { useState, useEffect } from 'react';
import { Form, Select, Input, DatePicker, Switch, Button, Card, Typography, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const RewardForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees]   = useState([]);
  const [rewardTypes, setRewardTypes] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/hr/employees/'),
      axios.get('/api/hr/reward-types/'),
    ]).then(([empR, typeR]) => {
      setEmployees(extractResultsFromResponse(empR));
      setRewardTypes(extractResultsFromResponse(typeR));
    }).catch(() => message.error('Erreur lors du chargement des donnees.'));
  }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await axios.post('/api/hr/rewards/', {
        ...values,
        awarded_date: values.awarded_date.format('YYYY-MM-DD'),
      });
      message.success('Recompense attribuee avec succes.');
      navigate('/hr/rewards');
    } catch {
      message.error("Erreur lors de l'attribution.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Title level={2}>Attribuer une recompense</Title>
      <Card style={{ maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ is_public: true, awarded_date: moment() }}>
          <Form.Item name="employee" label="Employe"
            rules={[{ required: true, message: 'Selectionnez un employe.' }]}>
            <Select showSearch placeholder="Choisir un employe"
              filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
              {employees.map(e => (
                <Option key={e.id} value={e.id}>{e.first_name} {e.last_name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="reward_type" label="Type de recompense"
            rules={[{ required: true, message: 'Selectionnez un type.' }]}>
            <Select placeholder="Choisir un type">
              {rewardTypes.map(t => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="awarded_date" label="Date d attribution"
            rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Commentaire (optionnel)">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="is_public" label="Visible sur le reward board" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>Attribuer</Button>
            <Button onClick={() => navigate('/hr/rewards')}>Annuler</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default RewardForm;
