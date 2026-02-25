import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const WarehouseList = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/inventory/warehouses/');
      setWarehouses(res.data.results || res.data);
    } catch (err) {
      message.error('Erreur lors du chargement des entrepôts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/inventory/warehouses/${id}/`);
      message.success('Entrepôt supprimé');
      fetchData();
    } catch (err) {
      message.error('Erreur lors de la suppression');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Statut',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? 'Actif' : 'Inactif'}</Tag>,
    },
    {
      title: 'Par défaut',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (val) => val ? <Tag color="blue">Par défaut</Tag> : null,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/inventory/warehouses/${record.id}/edit`)} />
          <Popconfirm title="Supprimer cet entrepôt ?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Entrepôts</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/warehouses/new')}>
          Nouvel entrepôt
        </Button>
      </div>
      <Table columns={columns} dataSource={warehouses} rowKey="id" loading={loading} />
    </div>
  );
};

export default WarehouseList;
