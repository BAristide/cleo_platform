import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const InventoryList = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/inventory/inventories/');
        setInventories(res.data.results || res.data);
      } catch (err) {
        message.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stateColors = { draft: 'default', in_progress: 'processing', validated: 'success' };

  const columns = [
    { title: 'Référence', dataIndex: 'reference', key: 'reference' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (val) => new Date(val).toLocaleDateString('fr-FR'),
    },
    {
      title: 'État',
      dataIndex: 'state_display',
      key: 'state_display',
      render: (val, record) => <Tag color={stateColors[record.state]}>{val}</Tag>,
    },
    { title: 'Lignes', dataIndex: 'lines_count', key: 'lines_count', align: 'center' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/inventory/inventories/${record.id}`)}>
          Voir
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Inventaires physiques</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/inventories/new')}>
          Nouvel inventaire
        </Button>
      </div>
      <Table columns={columns} dataSource={inventories} rowKey="id" loading={loading} />
    </div>
  );
};

export default InventoryList;
