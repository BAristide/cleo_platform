import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Row, Col, Space } from 'antd';
import {
  ShopOutlined, FileTextOutlined, InboxOutlined,
  FileExclamationOutlined, DollarOutlined, CreditCardOutlined, PlusOutlined,
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const KPI_CONFIG = [
  { key: 'suppliers_count', label: 'Fournisseurs actifs', icon: ShopOutlined, color: '#3B82F6' },
  { key: 'pending_orders', label: 'BC à réceptionner', icon: FileTextOutlined, color: '#F97316' },
  { key: 'pending_receptions', label: 'Réceptions en attente', icon: InboxOutlined, color: '#8B5CF6' },
  { key: 'unpaid_invoices', label: 'Factures impayées', icon: FileExclamationOutlined, color: '#EF4444' },
  { key: 'total_purchases', label: 'Total achats', icon: DollarOutlined, color: '#10B981', isCurrency: true },
  { key: 'total_due', label: 'Dettes fournisseurs', icon: CreditCardOutlined, color: '#F59E0B', isCurrency: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/api/purchasing/dashboard/').then(r => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Chargement...</div>;

  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Achats — Tableau de bord</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/purchasing/orders/new')}
          style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
          Nouveau bon de commande
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, isCurrency }) => (
          <Col key={key} xs={24} sm={12} lg={4}>
            <Card bodyStyle={{ padding: 20 }}
              style={{ borderRadius: 12, border: '1px solid #E5E7EB', borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 26, color, marginBottom: 8 }}><Icon /></div>
              <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>
                {isCurrency ? fmt(data[key]) : (data[key] ?? 0)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Bons de commande</span>}
            style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {[
                { label: 'Brouillons', key: 'po_draft', color: '#64748B' },
                { label: 'Confirmés', key: 'po_confirmed', color: '#F97316' },
                { label: 'Réceptionnés', key: 'po_received', color: '#10B981' },
              ].map(row => (
                <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#64748B' }}>{row.label}</Text>
                  <Text strong style={{ color: row.color }}>{data[row.key] ?? 0}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Actions rapides</span>}
            style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {[
                ['/purchasing/suppliers/new', '+ Nouveau fournisseur'],
                ['/purchasing/orders/new', '+ Nouveau bon de commande'],
                ['/purchasing/receptions/new', '+ Nouvelle réception'],
                ['/purchasing/invoices/new', '+ Nouvelle facture fournisseur'],
              ].map(([to, label]) => (
                <Link key={to} to={to} style={{ color: '#10B981', textDecoration: 'none', fontSize: 14 }}>{label}</Link>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
