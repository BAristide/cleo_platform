import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title } = Typography;

const METHOD_LABELS = { bank_transfer: 'Virement', check: 'Chèque', cash: 'Espèces', lcn: 'LCN', other: 'Autre' };

export default function PaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/purchasing/supplier-payments/')
      .then(r => setPayments(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  const columns = [
    { title: 'Facture', dataIndex: 'invoice_number', width: 140,
      render: v => <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v || '—'}</code> },
    { title: 'Fournisseur', dataIndex: 'supplier_name', render: v => v || '—' },
    { title: 'Date', dataIndex: 'date', width: 120, render: v => new Date(v).toLocaleDateString('fr-FR') },
    { title: 'Montant', dataIndex: 'amount', width: 140, align: 'right', render: v => <strong>{fmt(v)}</strong> },
    { title: 'Méthode', dataIndex: 'method', width: 130, render: v => METHOD_LABELS[v] || v },
    { title: 'Référence', dataIndex: 'reference', render: v => v || '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Paiements fournisseur</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/payments/new')}
          style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
          Nouveau
        </Button>
      </div>
      <Table dataSource={payments} columns={columns} rowKey="id" loading={loading}
        style={{ borderRadius: 12 }} locale={{ emptyText: 'Aucun paiement' }} />
    </div>
  );
}
