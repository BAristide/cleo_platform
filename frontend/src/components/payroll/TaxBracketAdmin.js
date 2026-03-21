// src/components/payroll/TaxBracketAdmin.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, DatePicker, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import { useCurrency } from '../../context/CurrencyContext';

const TaxBracketAdmin = () => {
  const { currencySymbol } = useCurrency();
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/payroll/tax-brackets/')
      .then(r => setBrackets(r.data.results || r.data || []))
      .catch(() => message.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ effective_date: dayjs(), deduction: 0 });
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      effective_date: record.effective_date ? dayjs(record.effective_date) : dayjs(),
      end_date: record.end_date ? dayjs(record.end_date) : null,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        effective_date: values.effective_date.format('YYYY-MM-DD'),
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      };
      if (editingId) {
        await axios.put(`/api/payroll/tax-brackets/${editingId}/`, payload);
        message.success('Tranche modifiee');
      } else {
        await axios.post('/api/payroll/tax-brackets/', payload);
        message.success('Tranche créée');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err.response?.data) message.error(Object.values(err.response.data).flat().join(', '));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/payroll/tax-brackets/${id}/`);
      message.success('Tranche supprimee');
      fetchData();
    } catch (err) { message.error('Erreur de suppression'); }
  };

  const fmt = v => v != null ? Number(v).toLocaleString('fr-FR') : '-';

  const columns = [
    { title: `Min (${currencySymbol})`, dataIndex: 'min_amount', key: 'min', render: fmt },
    { title: `Max (${currencySymbol})`, dataIndex: 'max_amount', key: 'max', render: v => v ? fmt(v) : 'Illimite' },
    { title: 'Taux (%)', dataIndex: 'rate', key: 'rate', render: v => `${v}%` },
    { title: `Deduction (${currencySymbol})`, dataIndex: 'deduction', key: 'ded', render: fmt },
    { title: 'Date d\'effet', dataIndex: 'effective_date', key: 'eff', render: v => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
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
    <Card title="Tranches d'imposition" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nouvelle tranche</Button>}>
      <Table columns={columns} dataSource={brackets} rowKey="id" loading={loading} size="small" pagination={false} />
      <Modal title={editingId ? 'Modifier la tranche' : 'Nouvelle tranche'} open={modalVisible}
        onCancel={() => setModalVisible(false)} onOk={handleSave} width={600} okText="Enregistrer" cancelText="Annuler">
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="min_amount" label="Montant minimum" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} step={1000} />
            </Form.Item>
            <Form.Item name="max_amount" label="Montant maximum">
              <InputNumber style={{ width: '100%' }} min={0} step={1000} placeholder="Vide = illimite" />
            </Form.Item>
            <Form.Item name="rate" label="Taux (%)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.5} />
            </Form.Item>
            <Form.Item name="deduction" label="Somme a deduire">
              <InputNumber style={{ width: '100%' }} min={0} step={100} />
            </Form.Item>
            <Form.Item name="effective_date" label="Date d'effet" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="end_date" label="Date de fin">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default TaxBracketAdmin;
