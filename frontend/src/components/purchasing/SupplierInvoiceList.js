import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Select, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;
const { Option } = Select;

const STATE_LABELS = {
  draft: { label: 'Brouillon', color: 'default' },
  validated: { label: 'Validée', color: 'blue' },
  paid: { label: 'Payée', color: 'success' },
  cancelled: { label: 'Annulée', color: 'error' },
};

export default function SupplierInvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/api/purchasing/supplier-invoices/?state=${filter}` : '/api/purchasing/supplier-invoices/';
    axios.get(url).then(r => setInvoices(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  const columns = [
    { title: 'Numéro', dataIndex: 'number', width: 150,
      render: v => <code style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{v}</code> },
    { title: 'Fournisseur', dataIndex: 'supplier_name', render: v => v || '—' },
    { title: 'Réf. fournisseur', dataIndex: 'supplier_reference', render: v => v || '—' },
    { title: 'Date', dataIndex: 'date', width: 120, render: v => v ? new Date(v).toLocaleDateString('fr-FR') : '—' },
    { title: 'Total', dataIndex: 'total', width: 130, align: 'right', render: v => <strong>{fmt(v)}</strong> },
    { title: 'Reste dû', dataIndex: 'amount_due', width: 130, align: 'right',
      render: v => <Text style={{ color: parseFloat(v) > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{fmt(v)}</Text> },
    { title: 'État', dataIndex: 'state', width: 120,
      render: v => { const s = STATE_LABELS[v] || {}; return <Tag color={s.color}>{s.label}</Tag>; } },
    { title: 'Actions', key: 'actions', width: 80,
      render: (_, r) => <Button type="link" style={{ color: '#10B981', padding: 0 }} onClick={() => navigate(`/purchasing/invoices/${r.id}`)}>Détail</Button> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Factures fournisseur</Title>
        <Space>
          <Select value={filter || undefined} placeholder="Tous les états" allowClear
            onChange={v => setFilter(v || '')} style={{ width: 160 }}>
            <Option value="draft">Brouillons</Option>
            <Option value="validated">Validées</Option>
            <Option value="paid">Payées</Option>
            <Option value="cancelled">Annulées</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/invoices/new')}
            style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
            Nouvelle
          </Button>
        </Space>
      </div>
      <Table dataSource={invoices} columns={columns} rowKey="id" loading={loading}
        style={{ borderRadius: 12 }} locale={{ emptyText: 'Aucune facture fournisseur' }} />
    </div>
  );
}
