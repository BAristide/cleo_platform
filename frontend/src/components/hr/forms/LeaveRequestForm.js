// src/components/hr/forms/LeaveRequestForm.js
import React, { useState, useEffect } from 'react';
import {
  Form, Select, DatePicker, InputNumber, Input,
  Upload, Button, Card, Typography, Space, message, Alert,
} from 'antd';
import { UploadOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Calcul client-side des jours ouvrés (lundi–vendredi)
function calculateWorkingDays(start, end) {
  if (!start || !end) return 0;
  let count = 0;
  let current = start.clone().startOf('day');
  const endDay = end.clone().startOf('day');
  while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
    const dow = current.day(); // 0=dim, 6=sam
    if (dow !== 0 && dow !== 6) count++;
    current = current.add(1, 'day');
  }
  return count;
}

const LeaveRequestForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitNow, setSubmitNow] = useState(false);

  useEffect(() => {
    axios.get('/api/hr/leave-types/').then(r => {
      const types = r.data.results || r.data;
      setLeaveTypes(types);
    }).catch(() => message.error('Impossible de charger les types de congés.'));
  }, []);

  const handleTypeChange = (typeId) => {
    const lt = leaveTypes.find(t => t.id === typeId);
    setSelectedType(lt || null);
  };

  const handleDateChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const days = calculateWorkingDays(dates[0], dates[1]);
      form.setFieldsValue({ nb_days: days });
    } else {
      form.setFieldsValue({ nb_days: undefined });
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        leave_type: values.leave_type,
        start_date: values.dates[0].format('YYYY-MM-DD'),
        end_date:   values.dates[1].format('YYYY-MM-DD'),
        nb_days:    values.nb_days,
        reason:     values.reason || '',
      };
      const resp = await axios.post('/api/hr/leave-requests/', payload);
      const id = resp.data.id;

      if (submitNow) {
        await axios.post(`/api/hr/leave-requests/${id}/submit/`);
        message.success('Demande soumise pour approbation.');
      } else {
        message.success('Demande enregistrée en brouillon.');
      }
      navigate('/hr/leaves');
    } catch (err) {
      const detail = err.response?.data?.detail
        || err.response?.data?.error
        || 'Erreur lors de la création.';
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Title level={3}>Nouvelle demande de congé</Title>

      {selectedType && !selectedType.is_paid && (
        <Alert
          type="warning"
          showIcon
          message="Congé sans solde : les jours seront déduits de votre rémunération."
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Type de congé"
            name="leave_type"
            rules={[{ required: true, message: 'Sélectionnez un type.' }]}
          >
            <Select placeholder="Choisir un type" onChange={handleTypeChange}>
              {leaveTypes.map(lt => (
                <Option key={lt.id} value={lt.id}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: lt.color,
                      marginRight: 8,
                    }}
                  />
                  {lt.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Période"
            name="dates"
            rules={[{ required: true, message: 'Sélectionnez les dates.' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              onChange={handleDateChange}
              disabledDate={(d) => !d || d.day() === 0 || d.day() === 6}
            />
          </Form.Item>

          <Form.Item
            label="Nombre de jours ouvrés"
            name="nb_days"
            rules={[{ required: true, message: 'Nombre de jours requis.' }]}
            extra="Calculé automatiquement. Modifiable pour les demi-journées (ex: 0.5)."
          >
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Motif" name="reason">
            <TextArea rows={3} placeholder="Motif de la demande (optionnel)" />
          </Form.Item>

          {selectedType?.requires_document && (
            <Form.Item
              label="Justificatif"
              name="document"
              rules={[{ required: true, message: 'Ce type de congé exige un justificatif.' }]}
            >
              <Upload maxCount={1} beforeUpload={() => false}>
                <Button icon={<UploadOutlined />}>Choisir un fichier</Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button
                icon={<SaveOutlined />}
                loading={loading}
                onClick={() => { setSubmitNow(false); form.submit(); }}
              >
                Enregistrer (brouillon)
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={loading}
                onClick={() => { setSubmitNow(true); form.submit(); }}
              >
                Soumettre
              </Button>
              <Button onClick={() => navigate('/hr/leaves')}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LeaveRequestForm;
