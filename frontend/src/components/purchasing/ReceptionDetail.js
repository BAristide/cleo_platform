import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Table, Typography, Space, Row, Col, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const STATE_LABELS = {
  draft: { label: 'Brouillon', color: 'default' },
  validated: { label: 'Validée', color: 'success' },
  cancelled: { label: 'Annulée', color: 'error' },
};

export default function ReceptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reception, setReception] = useState(null);

  const load = () => axios.get(`/api/purchasing/receptions/${id}/`).then(r => setReception(r.data)).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const handleValidate = () => {
    if (window.confirm('Valider cette réception ? Les stocks seront mis à jour.')) {
      axios.post(`/api/purchasing/receptions/${id}/validate/`).then(r => {
        message.success(`${r.data.detail} (${r.data.moves_created} mouvement(s) créé(s))`);
        load();
      }).catch(e => handleApiError(e, null, 'Impossible de valider la réception.'));
    }
  };

  if (!reception) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Chargement...</div>;

  const s = STATE_LABELS[reception.state] || {};

  const columns = [
    { title: 'Produit', key: 'product', render: (_, r) => r.product_name || `Produit #${r.product}` },
    { title: 'Quantité reçue', dataIndex: 'quantity_received', width: 160, align: 'right',
      render: v => <strong>{v}</strong> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ color: '#0F172A', margin: 0 }}>Réception {reception.number}</Title>
          <Tag color={s.color}>{s.label}</Tag>
        </Space>
        <Space>
          {reception.state === 'draft' && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleValidate}
              style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}>
              Valider la réception
            </Button>
          )}
          <Button onClick={() => navigate('/purchasing/receptions')} style={{ borderRadius: 8 }}>Retour</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: 'Bon de commande', value: reception.purchase_order_number || '—' },
          { label: 'Entrepôt', value: reception.warehouse_name || '—' },
          { label: 'Date', value: reception.date ? new Date(reception.date).toLocaleDateString('fr-FR') : '—' },
        ].map(({ label, value }) => (
          <Col key={label} xs={24} md={8}>
            <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }} bodyStyle={{ padding: 20 }}>
              <Text style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</Text>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A', marginTop: 4 }}>{value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={<span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Lignes reçues</span>}
        style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <Table dataSource={reception.items || []} columns={columns} rowKey="id"
          pagination={false} locale={{ emptyText: 'Aucune ligne' }} />
      </Card>
    </div>
  );
}
