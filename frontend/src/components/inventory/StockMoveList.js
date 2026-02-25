import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const StockMoveList = () => {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/inventory/stock-moves/';
      if (typeFilter) url += `?move_type=${typeFilter}`;
      const res = await axios.get(url);
      setMoves(res.data.results || res.data);
    } catch (err) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [typeFilter]);

  const typeColors = { IN: 'green', OUT: 'red', TRANSFER: 'blue', ADJUST: 'orange', RETURN_IN: 'cyan', RETURN_OUT: 'magenta' };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (val) => new Date(val).toLocaleDateString('fr-FR'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    { title: 'Produit', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Entrepôt', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    {
      title: 'Type',
      dataIndex: 'move_type_display',
      key: 'move_type_display',
      render: (val, record) => <Tag color={typeColors[record.move_type] || 'default'}>{val}</Tag>,
    },
    { title: 'Quantité', dataIndex: 'quantity', key: 'quantity', align: 'right' },
    { title: 'Référence', dataIndex: 'reference', key: 'reference' },
    { title: 'Créé par', dataIndex: 'created_by_name', key: 'created_by_name' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Mouvements de stock</h2>
        <Space>
          <Select style={{ width: 180 }} placeholder="Type de mouvement" allowClear onChange={(val) => setTypeFilter(val)}>
            <Select.Option value="IN">Entrée</Select.Option>
            <Select.Option value="OUT">Sortie</Select.Option>
            <Select.Option value="TRANSFER">Transfert</Select.Option>
            <Select.Option value="ADJUST">Ajustement</Select.Option>
            <Select.Option value="RETURN_IN">Retour client</Select.Option>
            <Select.Option value="RETURN_OUT">Retour fournisseur</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/stock-moves/new')}>
            Nouveau mouvement
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={moves} rowKey="id" loading={loading} />
    </div>
  );
};

export default StockMoveList;
