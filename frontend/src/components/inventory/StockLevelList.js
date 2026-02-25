import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Input, Space, message } from 'antd';
import axios from '../../utils/axiosConfig';

const StockLevelList = () => {
  const [levels, setLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/inventory/stock-levels/';
      if (warehouseFilter) url += `?warehouse=${warehouseFilter}`;
      const res = await axios.get(url);
      setLevels(res.data.results || res.data);
    } catch (err) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    axios.get('/api/inventory/warehouses/').then((res) => setWarehouses(res.data.results || res.data));
  }, []);

  useEffect(() => { fetchData(); }, [warehouseFilter]);

  const columns = [
    { title: 'Référence', dataIndex: 'product_reference', key: 'product_reference' },
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    { title: 'En stock', dataIndex: 'quantity_on_hand', key: 'quantity_on_hand', align: 'right' },
    { title: 'Réservé', dataIndex: 'quantity_reserved', key: 'quantity_reserved', align: 'right' },
    {
      title: 'Disponible',
      dataIndex: 'quantity_available',
      key: 'quantity_available',
      align: 'right',
      render: (val, record) => (
        <span style={{ color: record.is_below_threshold ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
          {val}
        </span>
      ),
    },
    { title: 'Seuil alerte', dataIndex: 'stock_alert_threshold', key: 'stock_alert_threshold', align: 'right' },
    {
      title: 'Statut',
      key: 'status',
      render: (_, record) => record.is_below_threshold
        ? <Tag color="red">Sous seuil</Tag>
        : <Tag color="green">OK</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Niveaux de stock</h2>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="Filtrer par entrepôt"
            allowClear
            onChange={(val) => setWarehouseFilter(val)}
          >
            {warehouses.map((wh) => (
              <Select.Option key={wh.id} value={wh.id}>{wh.name}</Select.Option>
            ))}
          </Select>
        </Space>
      </div>
      <Table columns={columns} dataSource={levels} rowKey="id" loading={loading} />
    </div>
  );
};

export default StockLevelList;
