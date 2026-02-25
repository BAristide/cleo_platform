import React, { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const StockAlertsWidget = ({ alertsCount = 0 }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (alertsCount > 0) {
      axios.get('/api/inventory/stock-levels/alerts/')
        .then(r => setAlerts((r.data.results || r.data).slice(0, 5)))
        .catch(console.error);
    }
  }, [alertsCount]);

  const columns = [
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    {
      title: 'En stock', dataIndex: 'quantity_on_hand', key: 'qty',
      render: (val, record) => (
        <Tag color={parseFloat(val) <= 0 ? 'red' : 'orange'}>
          {val} / {record.alert_threshold || '?'}
        </Tag>
      ),
    },
  ];

  if (alertsCount === 0) {
    return (
      <Card title={<span><AlertOutlined style={{ color: '#38a169', marginRight: 8 }} />Stock — Aucune alerte</span>} style={{ borderRadius: 12 }}>
        <p style={{ color: '#38a169', textAlign: 'center', margin: '20px 0' }}>Tous les niveaux de stock sont normaux 🎉</p>
      </Card>
    );
  }

  return (
    <Card
      title={<span><AlertOutlined style={{ color: '#dd6b20', marginRight: 8 }} />{alertsCount} alerte(s) stock</span>}
      extra={<Link to="/inventory/alerts">Voir tout</Link>}
      style={{ borderRadius: 12 }}
    >
      <Table columns={columns} dataSource={alerts} rowKey="id" pagination={false} size="small" />
    </Card>
  );
};

export default StockAlertsWidget;
