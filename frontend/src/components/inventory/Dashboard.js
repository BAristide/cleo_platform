import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert } from 'antd';
import {
  InboxOutlined,
  WarningOutlined,
  SwapOutlined,
  HomeOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { useCurrency } from '../../context/CurrencyContext';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currencyCode } = useCurrency();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/api/inventory/dashboard/');
        setData(res.data);
      } catch (err) {
        setError("Erreur lors du chargement du tableau de bord");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error) return <Alert message={error} type="error" />;
  if (!data) return null;

  const moveColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (val) => new Date(val).toLocaleDateString('fr-FR'),
    },
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    {
      title: 'Type',
      dataIndex: 'move_type_display',
      key: 'move_type_display',
      render: (val, record) => {
        const colors = { IN: 'green', OUT: 'red', TRANSFER: 'blue', ADJUST: 'orange', RETURN_IN: 'cyan', RETURN_OUT: 'magenta' };
        return <Tag color={colors[record.move_type] || 'default'}>{val}</Tag>;
      },
    },
    { title: 'Quantité', dataIndex: 'quantity', key: 'quantity', align: 'right' },
    { title: 'Référence', dataIndex: 'reference', key: 'reference' },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Produits stockables"
              value={data.total_products}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={`Valeur du stock (${currencyCode})`}
              value={parseFloat(data.stock_value)}
              precision={2}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Alertes stock bas"
              value={data.alerts_count}
              prefix={<WarningOutlined />}
              valueStyle={data.alerts_count > 0 ? { color: '#cf1322' } : {}}
            />
            {data.alerts_count > 0 && (
              <Link to="/inventory/alerts">Voir les alertes</Link>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Entrepôts actifs"
              value={data.warehouses_count}
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Entrées (30j)"
              value={parseFloat(data.moves_in_30d)}
              prefix={<SwapOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Sorties (30j)"
              value={parseFloat(data.moves_out_30d)}
              prefix={<SwapOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Inventaires en cours"
              value={data.pending_inventories}
              prefix={<AuditOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Derniers mouvements" style={{ marginTop: 16 }}>
        <Table
          columns={moveColumns}
          dataSource={data.latest_moves}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default Dashboard;
