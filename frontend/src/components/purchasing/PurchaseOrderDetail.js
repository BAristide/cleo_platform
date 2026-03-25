import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Table, Typography, Space, Row, Col, message } from 'antd';
import { CheckOutlined, CloseOutlined, InboxOutlined } from '@ant-design/icons';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const STATE_LABELS = {
  draft: { label: 'Brouillon', color: 'default' },
  confirmed: { label: 'Confirmé', color: 'blue' },
  received: { label: 'Réceptionné', color: 'success' },
  invoiced: { label: 'Facturé', color: 'purple' },
  cancelled: { label: 'Annulé', color: 'error' },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  const load = () => axios.get(`/api/purchasing/purchase-orders/${id}/`).then(r => setOrder(r.data)).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const handleConfirm = () => {
    if (window.confirm('Confirmer ce bon de commande ?')) {
      axios.post(`/api/purchasing/purchase-orders/${id}/confirm/`)
        .then(() => { message.success('Bon de commande confirmé.'); load(); })
        .catch(e => handleApiError(e, null, 'Une erreur est survenue.'));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Annuler ce bon de commande ?')) {
      axios.post(`/api/purchasing/purchase-orders/${id}/cancel/`)
        .then(() => { message.success('Bon de commande annulé.'); load(); })
        .catch(e => handleApiError(e, null, 'Une erreur est survenue.'));
    }
  };

  if (!order) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Chargement...</div>;

  const s = STATE_LABELS[order.state] || {};
  const fmt = v => parseFloat(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });

  const columns = [
    { title: 'Produit / Description', key: 'product', render: (_, r) => r.product_name || r.description || '—' },
    { title: 'Quantité', dataIndex: 'quantity', width: 100, align: 'right' },
    { title: 'Reçu', dataIndex: 'quantity_received', width: 100, align: 'right',
      render: (v, r) => <Text style={{ color: parseFloat(v) >= parseFloat(r.quantity) ? '#10B981' : '#F97316' }}>{v}</Text> },
    { title: 'P.U. HT', dataIndex: 'unit_price', width: 130, align: 'right', render: v => fmt(v) },
    { title: 'TVA', dataIndex: 'tax_rate', width: 80, align: 'right', render: v => `${v}%` },
    { title: 'Total TTC', key: 'total', width: 140, align: 'right', render: (_, r) => <strong>{fmt(r.total)}</strong> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ color: '#0F172A', margin: 0 }}>BC {order.number}</Title>
          <Tag color={s.color}>{s.label}</Tag>
        </Space>
        <Space>
          {order.state === 'draft' && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}
              style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
              Confirmer
            </Button>
          )}
          {order.state === 'confirmed' && (
            <Button icon={<InboxOutlined />} onClick={() => navigate(`/purchasing/receptions/new?po=${id}`)}
              style={{ background: '#8B5CF6', borderColor: '#8B5CF6', color: '#fff', borderRadius: 8 }}>
              Créer réception
            </Button>
          )}
          {['draft', 'confirmed'].includes(order.state) && (
            <Button danger icon={<CloseOutlined />} onClick={handleCancel} style={{ borderRadius: 8 }}>Annuler</Button>
          )}
          <Button onClick={() => navigate('/purchasing/orders')} style={{ borderRadius: 8 }}>Retour</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: 'Fournisseur', value: order.supplier_name },
          { label: 'Date', value: order.date ? new Date(order.date).toLocaleDateString('fr-FR') : '—' },
          { label: 'Livraison prévue', value: order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR') : '—' },
        ].map(({ label, value }) => (
          <Col key={label} xs={24} md={8}>
            <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }} bodyStyle={{ padding: 20 }}>
              <Text style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</Text>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A', marginTop: 4 }}>{value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Lignes</span>}
        style={{ borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <Table dataSource={order.items || []} columns={columns} rowKey="id" pagination={false}
          locale={{ emptyText: 'Aucune ligne' }}
          footer={() => (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32 }}>
              <Text style={{ color: '#64748B' }}>HT : {fmt(order.subtotal)}</Text>
              <Text style={{ color: '#64748B' }}>TVA : {fmt(order.tax_amount)}</Text>
              <Text strong style={{ fontSize: 16 }}>Total : {fmt(order.total)} {order.currency_code}</Text>
            </div>
          )} />
      </Card>

      {order.notes && (
        <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Notes</span>}
          style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <Text style={{ color: '#4A5568', whiteSpace: 'pre-line' }}>{order.notes}</Text>
        </Card>
      )}
    </div>
  );
}
