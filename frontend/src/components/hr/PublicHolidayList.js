// src/components/hr/PublicHolidayList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Switch,
  Tag, Popconfirm, message, Space, Select,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Option } = Select;

const PublicHolidayList = () => {
  const [holidays, setHolidays]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [filterRecurring, setFilterRecurring] = useState('all');
  const [form] = Form.useForm();

  const fetchHolidays = useCallback(() => {
    setLoading(true);
    axios.get('/api/hr/public-holidays/')
      .then(r => setHolidays(r.data.results ?? r.data))
      .catch(() => message.error('Impossible de charger les jours feries.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_recurring: true });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name:         record.name,
      date:         dayjs(record.date),
      is_recurring: record.is_recurring,
      country_code: record.country_code,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); }
    catch { return; }

    const payload = {
      name:         values.name,
      date:         values.date.format('YYYY-MM-DD'),
      is_recurring: values.is_recurring ?? false,
      country_code: values.country_code ?? '',
    };

    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`/api/hr/public-holidays/${editing.id}/`, payload);
        message.success('Jour férié mis à jour.');
      } else {
        await axios.post('/api/hr/public-holidays/', payload);
        message.success('Jour férié ajouté.');
      }
      setModalOpen(false);
      fetchHolidays();
    } catch {
      message.error('Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/public-holidays/${id}/`);
      message.success('Jour férié supprimé.');
      fetchHolidays();
    } catch {
      message.error('Suppression impossible.');
    }
  };

  const displayed = holidays.filter(h => {
    if (filterRecurring === 'recurring')    return h.is_recurring;
    if (filterRecurring === 'punctual')     return !h.is_recurring;
    return true;
  });

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date),
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Recurrence',
      dataIndex: 'is_recurring',
      key: 'is_recurring',
      render: (v) => v
        ? <Tag color="green">Annuel</Tag>
        : <Tag color="orange">Ponctuel</Tag>,
    },
    {
      title: 'Pack',
      dataIndex: 'country_code',
      key: 'country_code',
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <Tag>Universel</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Modifier
          </Button>
          <Popconfirm
            title="Supprimer ce jour ferie ?"
            onConfirm={() => handleDelete(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Jours feries</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Ajouter un jour ferie
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          value={filterRecurring}
          onChange={setFilterRecurring}
          style={{ width: 200 }}
        >
          <Option value="all">Tous les jours feries</Option>
          <Option value="recurring">Annuels uniquement</Option>
          <Option value="punctual">Ponctuels uniquement</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={displayed}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: 'Aucun jour ferie enregistre.' }}
      />

      <Modal
        title={editing ? 'Modifier le jour ferie' : 'Ajouter un jour ferie'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Enregistrer' : 'Ajouter'}
        cancelText="Annuler"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Nom du jour ferie"
            rules={[{ required: true, message: 'Le nom est obligatoire.' }]}
          >
            <Input placeholder="Ex : Fete du Travail" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'La date est obligatoire.' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_recurring"
            label="Recurrent annuellement"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Annuel"
              unCheckedChildren="Ponctuel"
            />
          </Form.Item>

          <Form.Item
            name="country_code"
            label="Code pack (informatif)"
            tooltip="Non contraignant. Laisser vide pour un jour universel."
          >
            <Input placeholder="Ex : MA, FR, OHADA" maxLength={10} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PublicHolidayList;
