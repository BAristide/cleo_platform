// src/components/payroll/ContractTypeAdmin.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Switch, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const ContractTypeAdmin = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/payroll/contract-types/')
      .then(r => setTypes(r.data.results || r.data || []))
      .catch(() => message.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, requires_end_date: false });
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
        await axios.put(`/api/payroll/contract-types/${editingId}/`, values);
        message.success('Type de contrat modifie');
      } else {
        await axios.post('/api/payroll/contract-types/', values);
        message.success('Type de contrat cree');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) message.error(Object.values(err.response.data).flat().join(', '));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/contract-types/${id}/`);
      message.success('Type supprime');
      fetchData();
    } catch (err) { message.error('Impossible de supprimer (utilise par des employes)'); }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
    { title: 'Date fin requise', dataIndex: 'requires_end_date', key: 'req', width: 130, render: v => v ? 'Oui' : 'Non' },
    { title: 'Actif', dataIndex: 'is_active', key: 'active', width: 70, render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Oui' : 'Non'}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Supprimer ?" onConfirm={() => handleDelete(record.id)} okText="Oui" cancelText="Non">
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Types de contrat" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nouveau</Button>}>
      <Table columns={columns} dataSource={types} rowKey="id" loading={loading} size="small" pagination={false} />
      <Modal title={editingId ? 'Modifier le type' : 'Nouveau type'} open={modalVisible}
        onCancel={() => setModalVisible(false)} onOk={handleSave} width={500} okText="Enregistrer" cancelText="Annuler">
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="Ex: CDI, CDD" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
            <Input placeholder="Ex: Contrat a Duree Indeterminee" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 24 }}>
            <Form.Item name="requires_end_date" label="Date de fin obligatoire" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_active" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default ContractTypeAdmin;
