import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Select, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;
const { Option } = Select;

const STATE_LABELS = {
  draft: { label: 'Brouillon', color: 'default' },
  confirmed: { label: 'Confirmé', color: 'blue' },
  received: { label: 'Réceptionné', color: 'success' },
  invoiced: { label: 'Facturé', color: 'purple' },
  cancelled: { label: 'Annulé', color: 'error' },
};

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/api/purchasing/purchase-orders/?state=${filter}` : '/api/purchasing/purchase-orders/';
    axios.get(url).then(r => setOrders(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  const columns = [
    { title: 'Numéro', dataIndex: 'number', width: 150,
      render: v => <code style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{v}</code> },
    { title: 'Fournisseur', dataIndex: 'supplier_name', render: v => v || '—' },
    { title: 'Date', dataIndex: 'date', width: 120, render: v => v ? new Date(v).toLocaleDateString('fr-FR') : '—' },
    { title: 'Total', dataIndex: 'total', width: 140, align: 'right', render: v => <strong>{fmt(v)}</strong> },
    { title: 'État', dataIndex: 'state', width: 140,
      render: v => { const s = STATE_LABELS[v] || {}; return <Tag color={s.color}>{s.label}</Tag>; } },
    { title: 'Actions', key: 'actions', width: 80,
      render: (_, r) => <Button type="link" style={{ color: '#10B981', padding: 0 }} onClick={() => navigate(`/purchasing/orders/${r.id}`)}>Détail</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Bons de commande</Title>
        <Space>
          <Select value={filter || undefined} placeholder="Tous les états" allowClear
            onChange={v => setFilter(v || '')} style={{ width: 160 }}>
            <Option value="draft">Brouillons</Option>
            <Option value="confirmed">Confirmés</Option>
            <Option value="received">Réceptionnés</Option>
            <Option value="invoiced">Facturés</Option>
            <Option value="cancelled">Annulés</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/orders/new')}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            Nouveau
          </Button>
        </Space>
      </div>
      <Table dataSource={orders} columns={columns} rowKey="id" loading={loading}
        style={{ borderRadius: 12 }} locale={{ emptyText: 'Aucun bon de commande' }} />
    </div>
  );
}
