import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Spin, message, Popconfirm } from 'antd';
import { CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/inventory/inventories/${id}/`);
      setInventory(res.data);
    } catch (err) {
      message.error("Erreur lors du chargement de l'inventaire");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      await axios.post(`/api/inventory/inventories/${id}/validate/`);
      message.success('Inventaire validé avec succès');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!inventory) return null;

  const stateColors = { draft: 'default', in_progress: 'processing', validated: 'success' };

  const lineColumns = [
    { title: 'Référence', dataIndex: 'product_reference', key: 'product_reference' },
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Qté théorique', dataIndex: 'theoretical_qty', key: 'theoretical_qty', align: 'right' },
    { title: 'Qté physique', dataIndex: 'physical_qty', key: 'physical_qty', align: 'right' },
    {
      title: 'Écart',
      dataIndex: 'difference',
      key: 'difference',
      align: 'right',
      render: (val) => {
        const num = parseFloat(val);
        const color = num > 0 ? '#3f8600' : num < 0 ? '#cf1322' : undefined;
        return <span style={{ color, fontWeight: 'bold' }}>{num > 0 ? '+' : ''}{val}</span>;
      },
    },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory/inventories')} style={{ marginBottom: 16 }}>
        Retour
      </Button>

      <Card
        title={`Inventaire ${inventory.reference}`}
        extra={
          inventory.state !== 'validated' && (
            <Popconfirm title="Valider cet inventaire ? Les écarts génèreront des mouvements d'ajustement." onConfirm={handleValidate}>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={validating}>
                Valider l'inventaire
              </Button>
            </Popconfirm>
          )
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Référence">{inventory.reference}</Descriptions.Item>
          <Descriptions.Item label="Entrepôt">{inventory.warehouse_name}</Descriptions.Item>
          <Descriptions.Item label="Date">{new Date(inventory.date).toLocaleDateString('fr-FR')}</Descriptions.Item>
          <Descriptions.Item label="État">
            <Tag color={stateColors[inventory.state]}>{inventory.state_display}</Tag>
          </Descriptions.Item>
          {inventory.validated_by_name && (
            <Descriptions.Item label="Validé par">{inventory.validated_by_name}</Descriptions.Item>
          )}
          {inventory.validated_at && (
            <Descriptions.Item label="Validé le">{new Date(inventory.validated_at).toLocaleString('fr-FR')}</Descriptions.Item>
          )}
          {inventory.notes && (
            <Descriptions.Item label="Notes" span={2}>{inventory.notes}</Descriptions.Item>
          )}
        </Descriptions>

        <h3 style={{ marginTop: 24 }}>Lignes d'inventaire</h3>
        <Table
          columns={lineColumns}
          dataSource={inventory.lines || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default InventoryDetail;
