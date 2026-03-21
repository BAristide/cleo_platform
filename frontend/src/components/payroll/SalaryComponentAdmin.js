// src/components/payroll/SalaryComponentAdmin.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Option } = Select;

const categoryColors = {
  earnings: 'green', social_employee: 'blue', social_employer: 'cyan',
  health_employee: 'purple', health_employer: 'magenta', tax: 'red',
  other_deduction: 'orange', other_employer: 'gold',
};
const categoryLabels = {
  earnings: 'Gains', social_employee: 'Cot. soc. salariale', social_employer: 'Cot. soc. patronale',
  health_employee: 'Sante salariale', health_employer: 'Sante patronale', tax: 'Impot',
  other_deduction: 'Autre retenue', other_employer: 'Autre patronale',
};
const typeLabels = { brut: 'Brut', cotisation: 'Cotisation', non_soumise: 'Non soumise' };
const baseRuleLabels = { gross: 'Brut total', capped: 'Brut plafonne', taxable: 'Imposable', fixed: 'Fixe' };

const SalaryComponentAdmin = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({ category: '', component_type: '', is_active: '' });

  const fetchData = () => {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.component_type) params.component_type = filters.component_type;
    if (filters.is_active !== '') params.is_active = filters.is_active;
    axios.get('/api/payroll/components/', { params })
      .then(r => setComponents(r.data.results || r.data || []))
      .catch(() => message.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filters]);

  const openNew = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, is_taxable: true, is_cnss_eligible: true, base_rule: 'fixed', default_display_order: 50 });
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await axios.put(`/api/payroll/components/${editingId}/`, values);
        message.success('Composant modifié');
      } else {
        await axios.post('/api/payroll/components/', values);
        message.success('Composant cree');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) {
        const errors = Object.values(err.response.data).flat().join(', ');
        message.error(errors);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/components/${id}/`);
      message.success('Composant supprimé');
      fetchData();
    } catch (err) {
      message.error('Impossible de supprimer (utilise dans des bulletins)');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 120, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Categorie', dataIndex: 'category', key: 'category', width: 150,
      render: v => <Tag color={categoryColors[v] || 'default'}>{categoryLabels[v] || v}</Tag>,
    },
    { title: 'Type', dataIndex: 'component_type', key: 'type', width: 100, render: v => typeLabels[v] || v },
    { title: 'Code taux', dataIndex: 'rate_parameter_code', key: 'rate', width: 150, render: v => v || '-' },
    { title: 'Base', dataIndex: 'base_rule', key: 'base', width: 110, render: v => baseRuleLabels[v] || v },
    { title: 'Ordre', dataIndex: 'default_display_order', key: 'order', width: 70 },
    {
      title: 'Actif', dataIndex: 'is_active', key: 'active', width: 70,
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Oui' : 'Non'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Supprimer ce composant ?" onConfirm={() => handleDelete(record.id)} okText="Oui" cancelText="Non">
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Composants de salaire" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nouveau</Button>}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Select placeholder="Categorie" allowClear style={{ width: 180 }} onChange={v => setFilters(f => ({ ...f, category: v || '' }))}>
          {Object.entries(categoryLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
        </Select>
        <Select placeholder="Type" allowClear style={{ width: 140 }} onChange={v => setFilters(f => ({ ...f, component_type: v || '' }))}>
          {Object.entries(typeLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
        </Select>
        <Select placeholder="Statut" allowClear style={{ width: 120 }} onChange={v => setFilters(f => ({ ...f, is_active: v ?? '' }))}>
          <Option value="true">Actif</Option>
          <Option value="false">Inactif</Option>
        </Select>
      </div>

      <Table columns={columns} dataSource={components} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} composants` }} />

      <Modal title={editingId ? 'Modifier le composant' : 'Nouveau composant'} open={modalVisible}
        onCancel={() => setModalVisible(false)} onOk={handleSave} width={700} okText="Enregistrer" cancelText="Annuler">
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="Ex: CNSS_EMP" disabled={!!editingId} />
            </Form.Item>
            <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
              <Input placeholder="Ex: Cotisation CNPS Retraite" />
            </Form.Item>
            <Form.Item name="component_type" label="Type" rules={[{ required: true }]}>
              <Select>{Object.entries(typeLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="category" label="Categorie" rules={[{ required: true }]}>
              <Select>{Object.entries(categoryLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="rate_parameter_code" label="Code parametre taux">
              <Input placeholder="Ex: CNSS_EMPLOYEE_RATE" />
            </Form.Item>
            <Form.Item name="base_rule" label="Regle de base">
              <Select>{Object.entries(baseRuleLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="cap_parameter_code" label="Code parametre plafond">
              <Input placeholder="Ex: CNSS_CEILING" />
            </Form.Item>
            <Form.Item name="default_display_order" label="Ordre d'affichage">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="is_taxable" label="Imposable" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_cnss_eligible" label="Soumis CNSS" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_active" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SalaryComponentAdmin;
