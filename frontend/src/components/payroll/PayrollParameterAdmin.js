// src/components/payroll/PayrollParameterAdmin.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Switch, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const PayrollParameterAdmin = () => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    axios.get('/api/payroll/parameters/', { params: { search: searchText || undefined } })
      .then(r => setParameters(r.data.results || r.data || []))
      .catch(() => message.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [searchText]);

  const openNew = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, effective_date: dayjs() });
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      effective_date: record.effective_date ? dayjs(record.effective_date) : dayjs(),
      end_date: record.end_date ? dayjs(record.end_date) : null,
    });
    setModalVisible(true);
  };

  const handleNewVersion = (record) => {
    // Creer un nouveau parametre avec le meme code et une nouvelle date d'effet
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      value: record.value,
      is_active: true,
      effective_date: dayjs(),
    });
    setModalVisible(true);
    message.info('Modifiez la valeur et la date d\'effet, puis enregistrez. L\'ancien parametre sera ferme automatiquement.');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        effective_date: values.effective_date.format('YYYY-MM-DD'),
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        await axios.put(`/api/payroll/parameters/${editingRecord.id}/`, payload);
        message.success('Paramètre modifié');
      } else {
        // Si le code existe deja et qu'on cree une nouvelle version, fermer l'ancien
        const existing = parameters.filter(p => p.code === payload.code && p.is_active && !p.end_date);
        for (const old of existing) {
          const yesterday = dayjs(payload.effective_date).subtract(1, 'day').format('YYYY-MM-DD');
          await axios.patch(`/api/payroll/parameters/${old.id}/`, { end_date: yesterday });
        }
        await axios.post('/api/payroll/parameters/', payload);
        message.success('Parametre cree');
      }
      setModalVisible(false);
      fetchData();
      // Vider le cache
      axios.post('/api/payroll/parameters/clear_cache/').catch(() => {});
    } catch (err) {
      if (err.response?.data) {
        const errors = Object.values(err.response.data).flat().join(', ');
        message.error(errors);
      }
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 200, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Valeur', dataIndex: 'value', key: 'value', width: 120, render: v => <strong>{v}</strong> },
    { title: 'Date d\'effet', dataIndex: 'effective_date', key: 'eff', width: 120, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Date de fin', dataIndex: 'end_date', key: 'end', width: 120, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    {
      title: 'Actif', dataIndex: 'is_active', key: 'active', width: 70,
      render: (v, record) => {
        const isCurrent = v && !record.end_date;
        return <Tag color={isCurrent ? 'green' : v ? 'orange' : 'red'}>{isCurrent ? 'Actif' : v ? 'Expire' : 'Inactif'}</Tag>;
      },
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} title="Modifier" />
          {record.is_active && !record.end_date && (
            <Button type="link" icon={<HistoryOutlined />} size="small" onClick={() => handleNewVersion(record)} title="Nouvelle version" />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="Parametres de paie" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nouveau</Button>}>
      <div style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Rechercher par code ou nom..." allowClear style={{ width: 350 }}
          onSearch={v => setSearchText(v)} onChange={e => !e.target.value && setSearchText('')} />
      </div>

      <Table columns={columns} dataSource={parameters} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} parametres` }} />

      <Modal title={editingRecord ? 'Modifier le parametre' : 'Nouveau parametre'} open={modalVisible}
        onCancel={() => setModalVisible(false)} onOk={handleSave} width={600} okText="Enregistrer" cancelText="Annuler">
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="Ex: CNSS_EMPLOYEE_RATE" disabled={!!editingRecord} />
            </Form.Item>
            <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
              <Input placeholder="Ex: Taux CNPS Employe" />
            </Form.Item>
            <Form.Item name="value" label="Valeur" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.01} />
            </Form.Item>
            <Form.Item name="effective_date" label="Date d'effet" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="end_date" label="Date de fin">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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

export default PayrollParameterAdmin;
