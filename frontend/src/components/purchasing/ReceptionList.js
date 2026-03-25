import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;

const STATE_LABELS = {
  draft: { label: 'Brouillon', color: 'default' },
  validated: { label: 'Validée', color: 'success' },
  cancelled: { label: 'Annulée', color: 'error' },
};

export default function ReceptionList() {
  const navigate = useNavigate();
  const [receptions, setReceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/purchasing/receptions/')
      .then(r => setReceptions(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Numéro', dataIndex: 'number', width: 150,
      render: v => <code style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{v}</code> },
    { title: 'Bon de commande', dataIndex: 'purchase_order_number', render: v => v || '—' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', render: v => v || '—' },
    { title: 'Date', dataIndex: 'date', width: 120, render: v => v ? new Date(v).toLocaleDateString('fr-FR') : '—' },
    { title: 'État', dataIndex: 'state', width: 120,
      render: v => { const s = STATE_LABELS[v] || {}; return <Tag color={s.color}>{s.label}</Tag>; } },
    { title: 'Actions', key: 'actions', width: 80,
      render: (_, r) => <Button type="link" style={{ color: '#10B981', padding: 0 }} onClick={() => navigate(`/purchasing/receptions/${r.id}`)}>Détail</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Réceptions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/receptions/new')}
          style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
          Nouvelle
        </Button>
      </div>
      <Table dataSource={receptions} columns={columns} rowKey="id" loading={loading}
        style={{ borderRadius: 12 }} locale={{ emptyText: 'Aucune réception' }} />
    </div>
  );
}
