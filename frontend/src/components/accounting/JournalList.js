// src/components/accounting/JournalList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Card, Input, Button, Tag, Typography, Space, Switch, Spin, Alert, Tooltip } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  BankOutlined,
  AccountBookOutlined,
  ShoppingOutlined,
  DollarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;

const JournalList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [journals, setJournals] = useState([]);
  const [filteredJournals, setFilteredJournals] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchJournals();
  }, []);

  useEffect(() => {
    filterJournals();
  }, [journals, search, typeFilter, showInactive]);

  const fetchJournals = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/accounting/journals/');
      const journalsData = extractResultsFromResponse(response);
      setJournals(journalsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des journaux:', error);
      setError('Impossible de charger les journaux. Veuillez réessayer plus tard.');
      // Fallback to demo data
      setJournals(demoJournals);
    } finally {
      setLoading(false);
    }
  };

  const filterJournals = () => {
    let filtered = [...journals];

    // Filter by search text
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(journal => 
        journal.code.toLowerCase().includes(searchLower) || 
        journal.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by journal type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(journal => journal.type === typeFilter);
    }

    // Filter inactive journals
    if (!showInactive) {
      filtered = filtered.filter(journal => journal.active);
    }

    // Sort by code
    filtered.sort((a, b) => a.code.localeCompare(b.code));

    setFilteredJournals(filtered);
  };

  // Get icon based on journal type
  const getJournalTypeIcon = (type) => {
    switch (type) {
      case 'sale':
        return <DollarOutlined style={{ color: '#52c41a' }} />;
      case 'purchase':
        return <ShoppingOutlined style={{ color: '#1890ff' }} />;
      case 'cash':
        return <DollarOutlined style={{ color: '#faad14' }} />;
      case 'bank':
        return <BankOutlined style={{ color: '#722ed1' }} />;
      case 'general':
        return <FileTextOutlined style={{ color: '#fa541c' }} />;
      case 'situation':
        return <AccountBookOutlined style={{ color: '#13c2c2' }} />;
      default:
        return <AccountBookOutlined />;
    }
  };

  // Get display name for journal type
  const getJournalTypeDisplay = (type) => {
    const typeMap = {
      'sale': 'Ventes',
      'purchase': 'Achats',
      'cash': 'Caisse',
      'bank': 'Banque',
      'general': 'Opérations diverses',
      'situation': 'Situation'
    };
    return typeMap[type] || type;
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text, record) => (
        <Link to={`/accounting/journals/${record.id}`}>
          <Space>
            {getJournalTypeIcon(record.type)}
            {text}
          </Space>
        </Link>
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={
          type === 'sale' ? 'green' :
          type === 'purchase' ? 'blue' :
          type === 'cash' ? 'gold' :
          type === 'bank' ? 'purple' :
          type === 'general' ? 'orange' :
          type === 'situation' ? 'cyan' :
          'default'
        }>
          {getJournalTypeDisplay(type)}
        </Tag>
      ),
      filters: [
        { text: 'Ventes', value: 'sale' },
        { text: 'Achats', value: 'purchase' },
        { text: 'Caisse', value: 'cash' },
        { text: 'Banque', value: 'bank' },
        { text: 'Opérations diverses', value: 'general' },
        { text: 'Situation', value: 'situation' }
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Compte de débit par défaut',
      dataIndex: 'default_debit_account_code',
      key: 'default_debit_account_code',
      render: (text, record) => {
        if (!text) return '-';
        return (
          <Tooltip title={record.default_debit_account_name}>
            <Link to={`/accounting/accounts/${record.default_debit_account_id}`}>
              {text}
            </Link>
          </Tooltip>
        );
      },
    },
    {
      title: 'Compte de crédit par défaut',
      dataIndex: 'default_credit_account_code',
      key: 'default_credit_account_code',
      render: (text, record) => {
        if (!text) return '-';
        return (
          <Tooltip title={record.default_credit_account_name}>
            <Link to={`/accounting/accounts/${record.default_credit_account_id}`}>
              {text}
            </Link>
          </Tooltip>
        );
      },
    },
    {
      title: 'Séquence',
      dataIndex: 'sequence_id',
      key: 'sequence_id',
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Actif' : 'Inactif'}
        </Tag>
      ),
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false }
      ],
      onFilter: (value, record) => record.active === value,
    },
  ];

  // Demo data
  const demoJournals = [
    {
      id: 1,
      code: 'VEN',
      name: 'Journal des ventes',
      type: 'sale',
      default_debit_account_id: 4,
      default_debit_account_code: '411000',
      default_debit_account_name: 'Clients',
      default_credit_account_id: 9,
      default_credit_account_code: '701000',
      default_credit_account_name: 'Ventes de produits finis',
      sequence_id: 'VEN/YYYY/####',
      active: true
    },
    {
      id: 2,
      code: 'ACH',
      name: 'Journal des achats',
      type: 'purchase',
      default_debit_account_id: 8,
      default_debit_account_code: '601000',
      default_debit_account_name: 'Achats de matières premières',
      default_credit_account_id: 7,
      default_credit_account_code: '401000',
      default_credit_account_name: 'Fournisseurs',
      sequence_id: 'ACH/YYYY/####',
      active: true
    },
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque',
      type: 'bank',
      default_debit_account_id: 6,
      default_debit_account_code: '512000',
      default_debit_account_name: 'Banque',
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'BNK/YYYY/####',
      active: true
    },
    {
      id: 4,
      code: 'CSH',
      name: 'Journal de caisse',
      type: 'cash',
      default_debit_account_id: null,
      default_debit_account_code: null,
      default_debit_account_name: null,
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'CSH/YYYY/####',
      active: true
    },
    {
      id: 5,
      code: 'OD',
      name: 'Opérations diverses',
      type: 'general',
      default_debit_account_id: null,
      default_debit_account_code: null,
      default_debit_account_name: null,
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'OD/YYYY/####',
      active: true
    },
    {
      id: 6,
      code: 'SAL',
      name: 'Journal de paie',
      type: 'general',
      default_debit_account_id: null,
      default_debit_account_code: null,
      default_debit_account_name: null,
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'SAL/YYYY/####',
      active: true
    }
  ];

  const displayedJournals = filteredJournals.length > 0 ? filteredJournals : demoJournals;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="journals-list">
      <Title level={2}>Journaux comptables</Title>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="Rechercher un journal..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Space>
              <Switch
                checked={showInactive}
                onChange={setShowInactive}
              />
              <span>Afficher les journaux inactifs</span>
            </Space>
          </Space>
          <Button type="primary" icon={<PlusOutlined />}>
            Nouveau journal
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={displayedJournals}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default JournalList;
