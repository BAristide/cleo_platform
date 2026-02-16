// src/components/accounting/AccountList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Card, Input, Button, Tag, Typography, Space, Switch, Select, Spin, Alert } from 'antd';
import { SearchOutlined, BookOutlined, PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;

const AccountList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchAccountsAndTypes();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, search, typeFilter, showInactive]);

  const fetchAccountsAndTypes = async () => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer les comptes comptables et les types de comptes
      const [accountsResponse, typesResponse] = await Promise.all([
        axios.get('/api/accounting/accounts/'),
        axios.get('/api/accounting/account-types/')
      ]);

      const accountsData = extractResultsFromResponse(accountsResponse);
      const typesData = extractResultsFromResponse(typesResponse);

      setAccounts(accountsData);
      setAccountTypes(typesData);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes:', error);
      setError('Impossible de charger les comptes. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = [...accounts];

    // Filtrer par texte de recherche
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(account => 
        account.code.toLowerCase().includes(searchLower) || 
        account.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtrer par type de compte
    if (typeFilter !== 'all') {
      filtered = filtered.filter(account => account.type_id === parseInt(typeFilter));
    }

    // Filtrer les comptes inactifs
    if (!showInactive) {
      filtered = filtered.filter(account => account.is_active);
    }

    // Trier par code
    filtered.sort((a, b) => a.code.localeCompare(b.code));

    setFilteredAccounts(filtered);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text, record) => (
        <Link to={`/accounting/accounts/${record.id}`}>{text}</Link>
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
      dataIndex: 'type_name',
      key: 'type_name',
      filters: accountTypes.map(type => ({ text: type.name, value: type.id })),
      onFilter: (value, record) => record.type_id === value,
    },
    {
      title: 'Solde',
      dataIndex: 'balance',
      key: 'balance',
      render: (text, record) => {
        const value = parseFloat(text);
        return (
          <span style={{ color: value < 0 ? '#cf1322' : value > 0 ? '#3f8600' : 'inherit' }}>
            {value.toFixed(2)} MAD
          </span>
        );
      },
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: 'Attributs',
      key: 'attributes',
      render: (_, record) => (
        <Space size="small">
          {record.is_reconcilable && <Tag color="blue">Lettrable</Tag>}
          {record.is_tax_account && <Tag color="green">Taxe</Tag>}
          {!record.is_active && <Tag color="red">Inactif</Tag>}
        </Space>
      ),
    },
  ];

  // Utiliser des données de démonstration si les données réelles ne sont pas disponibles
  const demoAccounts = [
    {
      id: 1,
      code: '101000',
      name: 'Capital',
      type_id: 1,
      type_name: 'Capitaux',
      balance: 0,
      is_reconcilable: false,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 2,
      code: '211000',
      name: 'Terrains',
      type_id: 2,
      type_name: 'Actifs immobilisés',
      balance: 1500000,
      is_reconcilable: false,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 3,
      code: '311000',
      name: 'Matières premières',
      type_id: 3,
      type_name: 'Stocks',
      balance: 75000,
      is_reconcilable: false,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 4,
      code: '411000',
      name: 'Clients',
      type_id: 4,
      type_name: 'Créances',
      balance: 250000,
      is_reconcilable: true,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 5,
      code: '445650',
      name: 'TVA facturée',
      type_id: 4,
      type_name: 'Créances',
      balance: 35000,
      is_reconcilable: false,
      is_tax_account: true,
      is_active: true
    },
    {
      id: 6,
      code: '512000',
      name: 'Banque',
      type_id: 5,
      type_name: 'Trésorerie',
      balance: 350000,
      is_reconcilable: true,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 7,
      code: '401000',
      name: 'Fournisseurs',
      type_id: 6,
      type_name: 'Dettes',
      balance: -125000,
      is_reconcilable: true,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 8,
      code: '601000',
      name: 'Achats de matières premières',
      type_id: 7,
      type_name: 'Charges',
      balance: 300000,
      is_reconcilable: false,
      is_tax_account: false,
      is_active: true
    },
    {
      id: 9,
      code: '701000',
      name: 'Ventes de produits finis',
      type_id: 8,
      type_name: 'Produits',
      balance: -750000,
      is_reconcilable: false,
      is_tax_account: false,
      is_active: true
    }
  ];

  // Types de comptes de démonstration
  const demoAccountTypes = [
    { id: 1, name: 'Capitaux', code: '1', is_debit: false },
    { id: 2, name: 'Actifs immobilisés', code: '2', is_debit: true },
    { id: 3, name: 'Stocks', code: '3', is_debit: true },
    { id: 4, name: 'Créances', code: '4', is_debit: true },
    { id: 5, name: 'Trésorerie', code: '5', is_debit: true },
    { id: 6, name: 'Dettes', code: '6', is_debit: false },
    { id: 7, name: 'Charges', code: '7', is_debit: true },
    { id: 8, name: 'Produits', code: '8', is_debit: false }
  ];

  const displayedAccounts = filteredAccounts.length > 0 ? filteredAccounts : demoAccounts;
  const displayedAccountTypes = accountTypes.length > 0 ? accountTypes : demoAccountTypes;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="accounts-list">
      <Title level={2}>Plan comptable</Title>

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
              placeholder="Rechercher un compte..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select
              style={{ width: 200 }}
              placeholder="Filtrer par type"
              value={typeFilter}
              onChange={value => setTypeFilter(value)}
            >
              <Option value="all">Tous les types</Option>
              {displayedAccountTypes.map(type => (
                <Option key={type.id} value={type.id.toString()}>
                  {type.code} - {type.name}
                </Option>
              ))}
            </Select>
            <Space>
              <Switch
                checked={showInactive}
                onChange={setShowInactive}
              />
              <span>Afficher les comptes inactifs</span>
            </Space>
          </Space>
          <Button type="primary" icon={<PlusOutlined />}>
            Nouveau compte
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={displayedAccounts}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default AccountList;
