// src/components/hr/forms/ExpenseReportForm.js
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Table, Select, DatePicker,
  InputNumber, Upload, Space, Typography, Row, Col,
  message, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from '../../../utils/axiosConfig';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ExpenseReportForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState('draft');

  useEffect(() => {
    axios.get('/api/hr/expense-categories/').then(r => {
      const data = r.data;
      setCategories(Array.isArray(data) ? data : (data.results || []));
    }).catch(() => {});

    axios.get('/api/core/currencies/').then(r => {
      const data = r.data;
      setCurrencies(Array.isArray(data) ? data : (data.results || []));
    }).catch(() => {});

    if (isEdit) {
      axios.get(`/api/hr/expense-reports/${id}/`).then(r => {
        const report = r.data;
        form.setFieldsValue({
          title: report.title,
          period_month: report.period_month ? dayjs(report.period_month, 'YYYY-MM') : null,
          description: report.description,
        });
        setLines(
          (report.items || []).map((item, idx) => ({
            key: idx,
            id: item.id,
            date: item.date ? dayjs(item.date) : null,
            category: item.category,
            description: item.description,
            amount: parseFloat(item.amount) || 0,
            currency: item.currency || null,
            receipt: null,
          }))
        );
      }).catch(() => message.error('Erreur lors du chargement de la note.'));
    } else {
      setLines([{ key: 0, id: null, date: null, category: null, description: '', amount: 0, currency: null, receipt: null }]);
    }
  }, [id, isEdit, form]);

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { key: Date.now(), id: null, date: null, category: null, description: '', amount: 0, currency: null, receipt: null },
    ]);
  };

  const removeLine = (key) => {
    setLines(prev => prev.filter(l => l.key !== key));
  };

  const updateLine = (key, field, value) => {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  };

  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const handleSave = async (mode) => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    const periodMonth = values.period_month ? values.period_month.format('YYYY-MM') : '';

    if (!periodMonth) {
      message.error('La période est obligatoire.');
      return;
    }

    if (lines.length === 0) {
      message.error('Ajoutez au moins une ligne de frais.');
      return;
    }

    for (const line of lines) {
      if (!line.date || !line.category || !line.description || !line.amount) {
        message.error('Toutes les lignes doivent être complètes (date, catégorie, description, montant).');
        return;
      }
    }

    setLoading(true);
    try {
      let reportId = id;

      const reportData = {
        title: values.title,
        period_month: periodMonth,
        description: values.description || '',
      };

      if (isEdit) {
        await axios.patch(`/api/hr/expense-reports/${id}/`, reportData);
      } else {
        const resp = await axios.post('/api/hr/expense-reports/', reportData);
        reportId = resp.data.id;
      }

      // Sauvegarder les lignes
      for (const line of lines) {
        const lineData = {
          expense_report: reportId,
          category: line.category,
          date: line.date ? line.date.format('YYYY-MM-DD') : '',
          description: line.description,
          amount: line.amount,
          currency: line.currency || null,
        };

        if (line.id) {
          await axios.patch(`/api/hr/expense-items/${line.id}/`, lineData);
        } else {
          await axios.post('/api/hr/expense-items/', lineData);
        }
      }

      if (mode === 'submit') {
        await axios.post(`/api/hr/expense-reports/${reportId}/submit/`);
        message.success('Note soumise pour approbation.');
      } else {
        message.success('Note enregistrée en brouillon.');
      }

      navigate('/hr/expenses');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const lineColumns = [
    {
      title: 'Date',
      key: 'date',
      width: 140,
      render: (_, record) => (
        <DatePicker
          style={{ width: '100%' }}
          value={record.date}
          onChange={v => updateLine(record.key, 'date', v)}
          format="DD/MM/YYYY"
        />
      ),
    },
    {
      title: 'Catégorie',
      key: 'category',
      width: 180,
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Catégorie"
          value={record.category}
          onChange={v => updateLine(record.key, 'category', v)}
        >
          {categories.map(c => (
            <Option key={c.id} value={c.id}>{c.name}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (_, record) => (
        <Input
          placeholder="Description"
          value={record.description}
          onChange={e => updateLine(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Montant',
      key: 'amount',
      width: 130,
      render: (_, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          value={record.amount}
          onChange={v => updateLine(record.key, 'amount', v || 0)}
        />
      ),
    },
    {
      title: 'Devise',
      key: 'currency',
      width: 110,
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          allowClear
          placeholder="Devise"
          value={record.currency}
          onChange={v => updateLine(record.key, 'currency', v)}
        >
          {currencies.map(c => (
            <Option key={c.id} value={c.id}>{c.code}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Justificatif',
      key: 'receipt',
      width: 140,
      render: (_, record) => (
        <Upload
          beforeUpload={file => {
            updateLine(record.key, 'receipt', file);
            return false;
          }}
          maxCount={1}
          showUploadList={{ showRemoveIcon: false }}
        >
          <Button size="small" icon={<UploadOutlined />}>Joindre</Button>
        </Upload>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLine(record.key)}
          disabled={lines.length === 1}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={3}>{isEdit ? 'Modifier la note de frais' : 'Nouvelle note de frais'}</Title>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="title"
              label="Titre"
              rules={[{ required: true, message: 'Le titre est obligatoire.' }]}
            >
              <Input placeholder="Ex : Déplacement client Abidjan" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="period_month"
              label="Période"
              rules={[{ required: true, message: 'La période est obligatoire.' }]}
            >
              <DatePicker
                picker="month"
                format="MM/YYYY"
                style={{ width: '100%' }}
                placeholder="MM/YYYY"
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Description optionnelle" />
        </Form.Item>
      </Form>

      <Divider>Lignes de frais</Divider>

      <Table
        dataSource={lines}
        columns={lineColumns}
        rowKey="key"
        pagination={false}
        size="small"
        bordered
        style={{ marginBottom: 12 }}
      />

      <Button
        icon={<PlusOutlined />}
        onClick={addLine}
        style={{ marginBottom: 24 }}
      >
        Ajouter une ligne
      </Button>

      <Divider />

      <Row justify="space-between" align="middle">
        <Col>
          <Text strong style={{ fontSize: 18 }}>
            Total : {totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate('/hr/expenses')}>Annuler</Button>
            <Button
              loading={loading && submitMode === 'draft'}
              onClick={() => { setSubmitMode('draft'); handleSave('draft'); }}
            >
              Enregistrer brouillon
            </Button>
            <Button
              type="primary"
              loading={loading && submitMode === 'submit'}
              onClick={() => { setSubmitMode('submit'); handleSave('submit'); }}
            >
              Enregistrer et soumettre
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default ExpenseReportForm;
