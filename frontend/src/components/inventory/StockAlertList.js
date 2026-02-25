import React, { useState, useEffect } from 'react';
import { Table, Tag, Alert, message } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const StockAlertList = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/inventory/stock-levels/alerts/');
        setAlerts(res.data.results || res.data);
      } catch (err) {
        message.error('Erreur lors du chargement des alertes');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const columns = [
    { title: 'Référence', dataIndex: 'product_reference', key: 'product_reference' },
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    {
      title: 'Disponible',
      dataIndex: 'quantity_available',
      key: 'quantity_available',
      align: 'right',
      render: (val) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{val}</span>,
    },
    { title: 'Seuil', dataIndex: 'stock_alert_threshold', key: 'stock_alert_threshold', align: 'right' },
    {
      title: 'Déficit',
      key: 'deficit',
      align: 'right',
      render: (_, record) => {
        const deficit = parseFloat(record.stock_alert_threshold) - parseFloat(record.quantity_available);
        return <Tag color="red">-{deficit.toFixed(3)}</Tag>;
      },
    },
  ];

  return (
    <div>
      <h2><WarningOutlined style={{ color: '#cf1322' }} /> Alertes de réapprovisionnement</h2>
      {alerts.length === 0 && !loading && (
        <Alert message="Aucune alerte" description="Tous les produits sont au-dessus de leur seuil d'alerte." type="success" showIcon />
      )}
      <Table columns={columns} dataSource={alerts} rowKey="id" loading={loading} style={{ marginTop: 16 }} />
    </div>
  );
};

export default StockAlertList;
