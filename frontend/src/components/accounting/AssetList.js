// src/components/accounting/AssetList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Input, 
  Button, 
  Tag, 
  Typography, 
  Space, 
  Select, 
  DatePicker, 
  Spin, 
  Alert, 
  Tooltip,
  Progress,
  Statistic
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  BuildOutlined,
  CreditCardOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const AssetList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [totalStats, setTotalStats] = useState({
    total: 0,
    acquisition: 0,
    depreciation: 0,
    netBook: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [assets, search, categoryFilter, stateFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch assets and categories
      const [assetsResponse, categoriesResponse] = await Promise.all([
        axios.get('/api/accounting/assets/'),
        axios.get('/api/accounting/asset-categories/')
      ]);

      const assetsData = extractResultsFromResponse(assetsResponse);
      const categoriesData = extractResultsFromResponse(categoriesResponse);

      setAssets(assetsData);
      setCategories(categoriesData);

      // Calculate totals
      if (assetsData.length > 0) {
        const acquisitionTotal = assetsData.reduce((sum, asset) => sum + parseFloat(asset.acquisition_value || 0), 0);
        const depreciationTotal = assetsData.reduce((sum, asset) => sum + parseFloat(asset.depreciation_value || 0), 0);
        const netBookTotal = acquisitionTotal - depreciationTotal;

        setTotalStats({
          total: assetsData.length,
          acquisition: acquisitionTotal,
          depreciation: depreciationTotal,
          netBook: netBookTotal
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      
      // Fallback to demo data
      setAssets(demoAssets);
      setCategories(demoCategories);

      // Calculate totals for demo data
      const acquisitionTotal = demoAssets.reduce((sum, asset) => sum + parseFloat(asset.acquisition_value || 0), 0);
      const depreciationTotal = demoAssets.reduce((sum, asset) => sum + parseFloat(asset.depreciation_value || 0), 0);
      const netBookTotal = acquisitionTotal - depreciationTotal;

      setTotalStats({
        total: demoAssets.length,
        acquisition: acquisitionTotal,
        depreciation: depreciationTotal,
        netBook: netBookTotal
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // Filter by search text
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(asset => 
        (asset.code && asset.code.toLowerCase().includes(searchLower)) || 
        (asset.name && asset.name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.category_id === parseInt(categoryFilter));
    }

    // Filter by state
    if (stateFilter !== 'all') {
      filtered = filtered.filter(asset => asset.state === stateFilter);
    }

    // Sort by code
    filtered.sort((a, b) => a.code.localeCompare(b.code));

    setFilteredAssets(filtered);
  };

  const calculateDepreciationPercentage = (asset) => {
    if (!asset.acquisition_value || asset.acquisition_value === 0) return 0;
    
    const depreciationValue = asset.depreciation_value || 0;
    const percentage = (depreciationValue / asset.acquisition_value) * 100;
    
    return Math.min(Math.max(0, percentage), 100); // Ensure it's between 0 and 100
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text, record) => (
        <Link to={`/accounting/assets/${record.id}`}>{text}</Link>
      ),
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category_name',
      key: 'category_name',
      filters: categories.map(category => ({ text: category.name, value: category.name })),
      onFilter: (value, record) => record.category_name === value,
    },
    {
      title: 'Acquisition',
      dataIndex: 'acquisition_date',
      key: 'acquisition_date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.acquisition_date).unix() - moment(b.acquisition_date).unix(),
    },
    {
      title: 'Valeur d\'acquisition',
      dataIndex: 'acquisition_value',
      key: 'acquisition_value',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
      sorter: (a, b) => a.acquisition_value - b.acquisition_value,
    },
    {
      title: 'Amortissement',
      key: 'depreciation',
      render: (_, record) => (
        <Tooltip title={`${parseFloat(record.depreciation_value || 0).toFixed(2)} MAD (${calculateDepreciationPercentage(record).toFixed(1)}%)`}>
          <Progress 
            percent={calculateDepreciationPercentage(record).toFixed(1)} 
            size="small" 
            status={calculateDepreciationPercentage(record) >= 100 ? 'success' : 'active'}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Valeur nette',
      key: 'net_book_value',
      align: 'right',
      render: (_, record) => {
        const netValue = parseFloat(record.acquisition_value) - parseFloat(record.depreciation_value || 0);
        return `${netValue.toFixed(2)} MAD`;
      },
      sorter: (a, b) => {
        const netValueA = parseFloat(a.acquisition_value) - parseFloat(a.depreciation_value || 0);
        const netValueB = parseFloat(b.acquisition_value) - parseFloat(b.depreciation_value || 0);
        return netValueA - netValueB;
      },
    },
    {
      title: 'Méthode',
      dataIndex: 'method',
      key: 'method',
      render: (method) => {
        return method === 'linear' ? 'Linéaire' : 
               method === 'degressive' ? 'Dégressif' : 
               method;
      },
      filters: [
        { text: 'Linéaire', value: 'linear' },
        { text: 'Dégressif', value: 'degressive' }
      ],
      onFilter: (value, record) => record.method === value,
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const stateMap = {
          'draft': { text: 'Brouillon', color: 'orange' },
          'open': { text: 'En cours', color: 'green' },
          'close': { text: 'Clôturé', color: 'blue' },
          'sold': { text: 'Cédé', color: 'red' }
        };
        
        return (
          <Tag color={stateMap[state]?.color}>
            {stateMap[state]?.text || state}
          </Tag>
        );
      },
      filters: [
        { text: 'Brouillon', value: 'draft' },
        { text: 'En cours', value: 'open' },
        { text: 'Clôturé', value: 'close' },
        { text: 'Cédé', value: 'sold' }
      ],
      onFilter: (value, record) => record.state === value,
    },
  ];

  // Demo data
  const demoCategories = [
    {
      id: 1,
      name: 'Matériel informatique',
      account_asset_id: 211,
      account_depreciation_id: 281,
      account_expense_id: 681,
      method: 'linear',
      duration_years: 3
    },
    {
      id: 2,
      name: 'Mobilier de bureau',
      account_asset_id: 212,
      account_depreciation_id: 282,
      account_expense_id: 682,
      method: 'linear',
      duration_years: 10
    },
    {
      id: 3,
      name: 'Véhicules',
      account_asset_id: 213,
      account_depreciation_id: 283,
      account_expense_id: 683,
      method: 'degressive',
      duration_years: 5
    },
    {
      id: 4,
      name: 'Terrains',
      account_asset_id: 214,
      account_depreciation_id: 284,
      account_expense_id: 684,
      method: 'linear',
      duration_years: 0 // Non amortissable
    }
  ];

  const demoAssets = [
    {
      id: 1,
      code: 'A-0001',
      name: 'Serveur Dell PowerEdge',
      category_id: 1,
      category_name: 'Matériel informatique',
      acquisition_date: '2023-01-15',
      acquisition_value: 50000,
      salvage_value: 5000,
      depreciation_value: 30000, // 60% amorti
      method: 'linear',
      duration_years: 3,
      state: 'open',
      first_depreciation_date: '2023-01-31'
    },
    {
      id: 2,
      code: 'A-0002',
      name: 'Bureaux open space',
      category_id: 2,
      category_name: 'Mobilier de bureau',
      acquisition_date: '2022-06-10',
      acquisition_value: 75000,
      salvage_value: 7500,
      depreciation_value: 13500, // 18% amorti
      method: 'linear',
      duration_years: 10,
      state: 'open',
      first_depreciation_date: '2022-06-30'
    },
    {
      id: 3,
      code: 'A-0003',
      name: 'Renault Kangoo',
      category_id: 3,
      category_name: 'Véhicules',
      acquisition_date: '2021-10-05',
      acquisition_value: 120000,
      salvage_value: 20000,
      depreciation_value: 80000, // 67% amorti
      method: 'degressive',
      duration_years: 5,
      state: 'open',
      first_depreciation_date: '2021-10-31'
    },
    {
      id: 4,
      code: 'A-0004',
      name: 'Ordinateurs portables (10)',
      category_id: 1,
      category_name: 'Matériel informatique',
      acquisition_date: '2023-05-20',
      acquisition_value: 80000,
      salvage_value: 8000,
      depreciation_value: 36000, // 45% amorti
      method: 'linear',
      duration_years: 3,
      state: 'open',
      first_depreciation_date: '2023-05-31'
    },
    {
      id: 5,
      code: 'A-0005',
      name: 'Terrain bâtiment principal',
      category_id: 4,
      category_name: 'Terrains',
      acquisition_date: '2020-03-01',
      acquisition_value: 2000000,
      salvage_value: 2000000,
      depreciation_value: 0, // Non amortissable
      method: 'linear',
      duration_years: 0,
      state: 'open',
      first_depreciation_date: null
    }
  ];

  const displayedAssets = filteredAssets.length > 0 ? filteredAssets : demoAssets;
  const displayedCategories = categories.length > 0 ? categories : demoCategories;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="assets-list">
      <Title level={2}>Immobilisations</Title>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <div style={{ display: 'flex', marginBottom: 24 }}>
        <Card style={{ flex: 1, marginRight: 8 }}>
          <Statistic
            title="Immobilisations"
            value={totalStats.total}
            prefix={<BuildOutlined />}
            suffix="actifs"
          />
        </Card>
        <Card style={{ flex: 1, marginRight: 8 }}>
          <Statistic
            title="Valeur d'acquisition"
            value={totalStats.acquisition}
            precision={2}
            prefix={<CreditCardOutlined />}
            suffix="MAD"
          />
        </Card>
        <Card style={{ flex: 1, marginRight: 8 }}>
          <Statistic
            title="Amortissements cumulés"
            value={totalStats.depreciation}
            precision={2}
            prefix={<ClockCircleOutlined />}
            suffix="MAD"
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Statistic
            title="Valeur nette comptable"
            value={totalStats.netBook}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="MAD"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="Rechercher une immobilisation..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select
              style={{ width: 200 }}
              placeholder="Catégorie"
              value={categoryFilter}
              onChange={value => setCategoryFilter(value)}
            >
              <Option value="all">Toutes les catégories</Option>
              {displayedCategories.map(category => (
                <Option key={category.id} value={category.id.toString()}>
                  {category.name}
                </Option>
              ))}
            </Select>
            <Select
              style={{ width: 150 }}
              placeholder="Statut"
              value={stateFilter}
              onChange={value => setStateFilter(value)}
            >
              <Option value="all">Tous les statuts</Option>
              <Option value="draft">Brouillon</Option>
              <Option value="open">En cours</Option>
              <Option value="close">Clôturé</Option>
              <Option value="sold">Cédé</Option>
            </Select>
          </Space>
          <Link to="/accounting/assets/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Nouvelle immobilisation
            </Button>
          </Link>
        </div>

        <Table
          columns={columns}
          dataSource={displayedAssets}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          summary={pageData => {
            let totalAcquisition = 0;
            let totalDepreciation = 0;
            
            pageData.forEach(record => {
              totalAcquisition += parseFloat(record.acquisition_value || 0);
              totalDepreciation += parseFloat(record.depreciation_value || 0);
            });
            
            const totalNetBook = totalAcquisition - totalDepreciation;
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{totalAcquisition.toFixed(2)} MAD</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{totalDepreciation.toFixed(2)} MAD</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <strong>{totalNetBook.toFixed(2)} MAD</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default AssetList;
