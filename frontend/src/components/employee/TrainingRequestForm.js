// src/components/employee/TrainingRequestForm.js
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Select, Card, Table, Row, Col,
  Typography, message, Spin, Space, Empty, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse, handleApiError } from '../../utils/apiUtils';
import { useCurrency } from '../../context/CurrencyContext';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TrainingRequestForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currencySymbol } = useCurrency();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [planItems, setPlanItems] = useState([]);
  const [planId, setPlanId] = useState(id || null);
  const [planStatus, setPlanStatus] = useState('draft');

  // Item form state
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [selectedPriority, setSelectedPriority] = useState(2);

  const isEditMode = !!id;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Catalogue des formations
        const coursesResp = await axios.get('/api/hr/training-courses/');
        setCourses(extractResultsFromResponse(coursesResp));

        if (isEditMode) {
          const planResp = await axios.get(`/api/hr/training-plans/${id}/`);
          const plan = planResp.data;
          form.setFieldsValue({
            year: plan.year,
            objectives: plan.objectives,
          });
          setPlanItems(plan.training_items || []);
          setPlanStatus(plan.status);
        } else {
          form.setFieldsValue({ year: currentYear });
        }
      } catch {
        message.error('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form, isEditMode, currentYear]);

  const savePlan = async (andSubmit = false) => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let savedId = planId;
      if (isEditMode) {
        await axios.patch(`/api/hr/training-plans/${id}/`, values);
        savedId = id;
      } else if (savedId) {
        await axios.patch(`/api/hr/training-plans/${savedId}/`, values);
      } else {
        const resp = await axios.post('/api/hr/training-plans/', values);
        savedId = resp.data.id;
        setPlanId(savedId);
      }

      if (andSubmit) {
        await axios.post(`/api/hr/training-plans/${savedId}/submit/`);
        message.success('Plan enregistré et soumis pour approbation.');
        navigate('/my-space/training');
      } else {
        message.success('Plan enregistré en brouillon.');
        if (!isEditMode) {
          navigate(`/my-space/training/${savedId}/edit`);
        }
      }
    } catch (err) {
      handleApiError(err, form, "Impossible d'enregistrer le plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = async () => {
    if (!selectedCourse) {
      message.warning('Sélectionnez une formation.');
      return;
    }
    if (!planId) {
      message.warning('Enregistrez d\'abord le plan avant d\'ajouter des formations.');
      return;
    }
    try {
      const resp = await axios.post('/api/hr/training-plan-items/', {
        training_plan: planId,
        training_course: selectedCourse,
        planned_quarter: selectedQuarter,
        priority: selectedPriority,
      });
      // Recharger les items
      const planResp = await axios.get(`/api/hr/training-plans/${planId}/`);
      setPlanItems(planResp.data.training_items || []);
      setSelectedCourse(null);
      message.success('Formation ajoutée.');
    } catch (err) {
      message.error(err.response?.data?.error || 'Impossible d\'ajouter la formation.');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/hr/training-plan-items/${itemId}/`);
      setPlanItems(prev => prev.filter(i => i.id !== itemId));
      message.success('Formation retirée.');
    } catch {
      message.error('Impossible de retirer la formation.');
    }
  };

  const itemColumns = [
    {
      title: 'Formation',
      key: 'course',
      render: (_, r) => r.training_course_data?.title || '-',
    },
    {
      title: 'Catégorie',
      key: 'category',
      render: (_, r) => r.training_course_data?.category_display || '-',
    },
    {
      title: 'Durée',
      key: 'duration',
      width: 80,
      render: (_, r) => r.training_course_data?.duration_hours ? `${r.training_course_data.duration_hours}h` : '-',
    },
    {
      title: 'Coût',
      key: 'cost',
      width: 100,
      render: (_, r) => r.training_course_data?.cost
        ? `${Number(r.training_course_data.cost).toLocaleString('fr-FR')} ${currencySymbol}`
        : '-',
    },
    { title: 'Trimestre', dataIndex: 'planned_quarter', key: 'q', width: 90, render: v => `Q${v}` },
    {
      title: 'Priorité',
      dataIndex: 'priority_display',
      key: 'priority',
      width: 90,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, r) => planStatus === 'draft' ? (
        <Popconfirm title="Retirer cette formation ?" onConfirm={() => removeItem(r.id)} okText="Oui" cancelText="Non">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null,
    },
  ];

  const years = Array.from({ length: 4 }, (_, i) => currentYear + i);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={3}>{isEditMode ? 'Modifier mon plan de formation' : 'Nouvelle demande de formation'}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="year" label="Année" rules={[{ required: true, message: 'Requis' }]}>
                <Select disabled={isEditMode}>
                  {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="objectives" label="Objectifs de développement"
                rules={[{ required: true, message: 'Requis' }]}>
                <TextArea rows={3} placeholder="Décrivez vos objectifs de développement professionnel..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Formations du plan */}
      <Card
        title={`Formations (${planItems.length})`}
        style={{ marginBottom: 24 }}
        extra={planStatus === 'draft' && planId && (
          <Space>
            <Select
              placeholder="Choisir une formation"
              style={{ width: 280 }}
              value={selectedCourse}
              onChange={setSelectedCourse}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {courses.map(c => (
                <Option key={c.id} value={c.id}>
                  {c.title} ({c.category_display})
                </Option>
              ))}
            </Select>
            <Select value={selectedQuarter} onChange={setSelectedQuarter} style={{ width: 80 }}>
              <Option value={1}>Q1</Option>
              <Option value={2}>Q2</Option>
              <Option value={3}>Q3</Option>
              <Option value={4}>Q4</Option>
            </Select>
            <Select value={selectedPriority} onChange={setSelectedPriority} style={{ width: 110 }}>
              <Option value={1}>Basse</Option>
              <Option value={2}>Moyenne</Option>
              <Option value={3}>Haute</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={addItem}>
              Ajouter
            </Button>
          </Space>
        )}
      >
        {!planId ? (
          <Empty description="Enregistrez d'abord le plan pour ajouter des formations" />
        ) : (
          <Table
            columns={itemColumns}
            dataSource={planItems}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: <Empty description="Aucune formation ajoutée" /> }}
          />
        )}
      </Card>

      {/* Actions */}
      <Space>
        <Button icon={<SaveOutlined />} loading={submitting} onClick={() => savePlan(false)}>
          Enregistrer (brouillon)
        </Button>
        {planItems.length > 0 && planStatus === 'draft' && (
          <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={() => savePlan(true)}>
            Enregistrer et soumettre
          </Button>
        )}
        <Button onClick={() => navigate('/my-space/training')}>Annuler</Button>
      </Space>
    </div>
  );
};

export default TrainingRequestForm;
