import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;

export default function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/purchasing/suppliers/')
      .then(r => setSuppliers(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 130, render: v => <code style={{ fontFamily: 'monospace', color: '#0F172A' }}>{v}</code> },
    { title: 'Nom', dataIndex: 'name', render: v => <strong>{v}</strong> },
    { title: 'Contact', dataIndex: 'contact_name', render: v => v || '—' },
    { title: 'Email', dataIndex: 'email', render: v => v || '—' },
    { title: 'Devise', dataIndex: 'currency_code', width: 80, render: v => v || '—' },
    { title: 'Statut', dataIndex: 'is_active', width: 100,
      render: v => <Tag color={v ? 'success' : 'error'}>{v ? 'Actif' : 'Inactif'}</Tag> },
    { title: 'Actions', key: 'actions', width: 100,
      render: (_, r) => <Button type="link" style={{ color: '#10B981', padding: 0 }} onClick={() => navigate(`/purchasing/suppliers/${r.id}/edit`)}>Modifier</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Fournisseurs</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/suppliers/new')}
          style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
          Ajouter
        </Button>
      </div>
      <Table dataSource={suppliers} columns={columns} rowKey="id" loading={loading}
        style={{ borderRadius: 12 }} locale={{ emptyText: 'Aucun fournisseur' }} />
    </div>
  );
}
